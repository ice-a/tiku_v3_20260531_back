import CareerPost from '../models/CareerPost.js';
import Comment from '../models/Comment.js';
import Question from '../models/Question.js';
import Favorite from '../models/Favorite.js';
import { badRequest, forbidden, notFound } from '../utils/HttpError.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function getPosts(query = {}) {
  const {
    page = 1,
    limit = 20,
    keyword = '',
    category = '',
    tags = '',
    status = 'published',
  } = query;

  const filter = { status };

  if (keyword) {
    const safe = escapeRegex(String(keyword).trim());
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { summary: { $regex: safe, $options: 'i' } },
      { tags: { $regex: safe, $options: 'i' } },
    ];
  }

  if (category) filter.category = category;
  if (tags) {
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      filter.tags = { $in: tagList };
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [posts, total] = await Promise.all([
    CareerPost.find(filter)
      .populate('author', 'username avatar')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    CareerPost.countDocuments(filter),
  ]);

  return { posts, total, page: pageNum, limit: limitNum };
}

export async function getPostById(id, options = {}) {
  const { incrementView = false } = options;
  const post = await CareerPost.findById(id)
    .populate('author', 'username avatar')
    .lean();

  if (!post) {
    throw notFound('Career post not found');
  }

  if (incrementView) {
    await CareerPost.updateOne({ _id: id }, { $inc: { 'stats.views': 1 } });
    post.stats = post.stats || {};
    post.stats.views = (post.stats.views || 0) + 1;
  }

  return post;
}

export async function createPost(data, user) {
  const { title, content, category, summary, cover, tags, relatedQuestionId, status } = data;
  if (!title || !content || !category) {
    throw badRequest('title, content and category are required');
  }

  const post = await CareerPost.create({
    title: String(title).trim(),
    content: String(content),
    category: String(category).trim(),
    summary: summary ? String(summary).trim() : '',
    cover: cover || '',
    tags: Array.isArray(tags) ? tags : [],
    relatedQuestionId: relatedQuestionId || undefined,
    status: status || 'published',
    author: user._id,
  });

  return post.toObject();
}

export async function updatePost(id, data, user) {
  const post = await CareerPost.findById(id);
  if (!post) {
    throw notFound('Career post not found');
  }

  const isAuthor = String(post.author) === String(user._id);
  if (user?.role !== 'admin' && !isAuthor) {
    throw forbidden('Forbidden');
  }

  const allowed = ['title', 'content', 'category', 'summary', 'cover', 'tags', 'status'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      post[field] = data[field];
    }
  }
  if (data.relatedQuestionId !== undefined) {
    post.relatedQuestionId = data.relatedQuestionId || undefined;
  }

  await post.save();
  return post.toObject();
}

export async function deletePost(id, user) {
  const post = await CareerPost.findById(id);
  if (!post) {
    throw notFound('Career post not found');
  }
  const isAuthor = String(post.author) === String(user._id);
  if (user?.role !== 'admin' && !isAuthor) {
    throw forbidden('Forbidden');
  }

  await Promise.all([
    CareerPost.findByIdAndDelete(id),
    Comment.deleteMany({ postId: id }),
  ]);

  return { message: 'Career post deleted' };
}

export async function likePost(id) {
  const post = await CareerPost.findByIdAndUpdate(
    id,
    { $inc: { 'stats.likes': 1 } },
    { new: true, projection: { 'stats.likes': 1 } }
  );
  if (!post) {
    throw notFound('Career post not found');
  }
  return { likes: post.stats.likes };
}

export async function unlikePost(id) {
  const post = await CareerPost.findByIdAndUpdate(
    id,
    { $inc: { 'stats.likes': -1 } },
    { new: true, projection: { 'stats.likes': 1 } }
  );
  if (!post) {
    throw notFound('Career post not found');
  }
  if (post.stats.likes < 0) {
    await CareerPost.updateOne({ _id: id }, { $set: { 'stats.likes': 0 } });
    return { likes: 0 };
  }
  return { likes: post.stats.likes };
}

export async function favoritePost(postId, userId) {
  const post = await CareerPost.findById(postId).select('_id').lean();
  if (!post) {
    throw notFound('Career post not found');
  }
  const existing = await Favorite.findOne({ userId, itemType: 'careerPost', itemId: postId });
  if (existing) {
    throw badRequest('Already favorited');
  }
  await Favorite.create({ userId, itemType: 'careerPost', itemId: postId });
  const after = await CareerPost.findByIdAndUpdate(
    postId,
    { $inc: { 'stats.favorites': 1 } },
    { new: true, projection: { 'stats.favorites': 1 } }
  );
  return { favorites: after.stats.favorites };
}

export async function unfavoritePost(postId, userId) {
  const post = await CareerPost.findById(postId).select('_id').lean();
  if (!post) {
    throw notFound('Career post not found');
  }
  const removed = await Favorite.findOneAndDelete({ userId, itemType: 'careerPost', itemId: postId });
  if (!removed) {
    throw notFound('Favorite not found');
  }
  const after = await CareerPost.findByIdAndUpdate(
    postId,
    { $inc: { 'stats.favorites': -1 } },
    { new: true, projection: { 'stats.favorites': 1 } }
  );
  const favorites = after.stats.favorites < 0 ? 0 : after.stats.favorites;
  if (favorites === 0 && after.stats.favorites !== 0) {
    await CareerPost.updateOne({ _id: postId }, { $set: { 'stats.favorites': 0 } });
  }
  return { favorites };
}

export async function addComment(postId, userId, content, parentId = null) {
  if (!content || !String(content).trim()) {
    throw badRequest('Comment content is required');
  }
  const post = await CareerPost.findById(postId).select('_id').lean();
  if (!post) {
    throw notFound('Career post not found');
  }

  if (parentId) {
    const parent = await Comment.findById(parentId).select('_id postId').lean();
    if (!parent || String(parent.postId) !== String(postId)) {
      throw badRequest('Invalid parent comment');
    }
  }

  const comment = await Comment.create({
    postId,
    userId,
    content: String(content).trim(),
    parentId: parentId || null,
  });

  await CareerPost.updateOne({ _id: postId }, { $inc: { 'stats.comments': 1 } });

  return comment.toObject();
}

export async function getComments(postId, query = {}) {
  const post = await CareerPost.findById(postId).select('_id').lean();
  if (!post) {
    throw notFound('Career post not found');
  }

  const { page = 1, limit = 20 } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [comments, total] = await Promise.all([
    Comment.find({ postId, status: 'active' })
      .populate('userId', 'username avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Comment.countDocuments({ postId, status: 'active' }),
  ]);

  return { comments, total, page: pageNum, limit: limitNum };
}

export async function checkAndUpdateQuestionRelation(postId, questionId, data = {}) {
  const post = await CareerPost.findById(postId);
  if (!post) {
    throw notFound('Career post not found');
  }

  if (questionId) {
    const question = await Question.findById(questionId).select('_id').lean();
    if (!question) {
      throw notFound('Related question not found');
    }
    post.relatedQuestionId = questionId;
  }
  if (data.notes !== undefined) {
    post.summary = data.notes;
  }

  await post.save();
  return post.toObject();
}
