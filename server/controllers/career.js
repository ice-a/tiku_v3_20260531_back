import * as careerPostsService from '../services/careerPosts.js';
import * as careerService from '../services/career.js';
import ChatHistory from '../models/ChatHistory.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/HttpError.js';
import { consumeQuota } from '../middleware/quota.js';

export const chat = asyncHandler(async (req, res) => {
  const { message, type = 'career', history = [] } = req.body;
  if (!message) {
    throw badRequest('请提供消息内容');
  }

  const user = await User.findById(req.user._id);
  if (!user || !user.aiConfig || !user.aiConfig.enabled) {
    throw badRequest('请先配置 AI 功能');
  }

  const result = await careerService.callAI(user.aiConfig, message, history, type);

  await ChatHistory.create({
    userId: req.user._id,
    type,
    userMessage: result.userMessage,
    assistantMessage: result.assistantMessage,
  });

  consumeQuota(req, user);
  await user.save();

  res.json({ success: true, data: { response: result.response } });
});

export const getHistoryList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    ChatHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('type createdAt')
      .lean(),
    ChatHistory.countDocuments({ userId: req.user._id }),
  ]);

  res.json({ success: true, data: { items, total, page: pageNum, limit: limitNum } });
});

export const getHistoryById = asyncHandler(async (req, res) => {
  const history = await ChatHistory.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).lean();

  if (!history) {
    throw notFound('对话记录不存在');
  }

  res.json({ success: true, data: { history } });
});

export const deleteHistory = asyncHandler(async (req, res) => {
  const result = await ChatHistory.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!result) {
    throw notFound('对话记录不存在');
  }

  res.json({ success: true, message: '对话已删除' });
});

export const getResources = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const resources = careerService.getResources(type);
  res.json({ success: true, data: { resources } });
});

export const getPosts = asyncHandler(async (req, res) => {
  const result = await careerPostsService.getPosts(req.query);
  res.json({ success: true, data: result });
});

export const getPostById = asyncHandler(async (req, res) => {
  const post = await careerPostsService.getPostById(req.params.id, { incrementView: true });
  res.json({ success: true, data: { post } });
});

export const createPost = asyncHandler(async (req, res) => {
  const post = await careerPostsService.createPost(req.body, req.user);
  res.status(201).json({ success: true, data: { post } });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await careerPostsService.updatePost(req.params.id, req.body, req.user);
  res.json({ success: true, data: { post } });
});

export const deletePost = asyncHandler(async (req, res) => {
  const result = await careerPostsService.deletePost(req.params.id, req.user);
  res.json({ success: true, ...result });
});

export const likePost = asyncHandler(async (req, res) => {
  const result = await careerPostsService.likePost(req.params.id);
  res.json({ success: true, data: result });
});

export const unlikePost = asyncHandler(async (req, res) => {
  const result = await careerPostsService.unlikePost(req.params.id);
  res.json({ success: true, data: result });
});

export const favoritePost = asyncHandler(async (req, res) => {
  const result = await careerPostsService.favoritePost(req.params.id, req.user._id);
  res.status(201).json({ success: true, data: result });
});

export const unfavoritePost = asyncHandler(async (req, res) => {
  const result = await careerPostsService.unfavoritePost(req.params.id, req.user._id);
  res.json({ success: true, data: result });
});

export const addComment = asyncHandler(async (req, res) => {
  const { content, parentId } = req.body;
  const comment = await careerPostsService.addComment(req.params.id, req.user._id, content, parentId);
  res.status(201).json({ success: true, data: { comment } });
});

export const getComments = asyncHandler(async (req, res) => {
  const result = await careerPostsService.getComments(req.params.id, req.query);
  res.json({ success: true, data: result });
});

export const checkAndUpdateQuestionRelation = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const post = await careerPostsService.checkAndUpdateQuestionRelation(
    req.params.id,
    questionId,
    req.body
  );
  res.json({ success: true, data: { post } });
});
