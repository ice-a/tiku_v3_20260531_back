import Question from '../models/Question.js';
import Navigation from '../models/Navigation.js';
import Affiliate from '../models/Affiliate.js';
import { notFound } from '../utils/HttpError.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function getPageParams(query = {}, fallbackLimit = 12, maxLimit = 24) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(maxLimit, parseInt(query.limit, 10) || fallbackLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function questionListProjection() {
  return 'text category difficulty tags stats createdAt';
}

function normalizeQuestion(question) {
  return {
    _id: question._id,
    text: question.text,
    category: question.category,
    difficulty: question.difficulty,
    tags: question.tags || [],
    stats: {
      views: question.stats?.views || 0,
      attempts: question.stats?.attempts || 0,
    },
    createdAt: question.createdAt,
  };
}

function makeQuestionFilter(query = {}) {
  const filter = { status: 'approved' };

  if (query.keyword) {
    const keyword = escapeRegex(String(query.keyword).trim());
    filter.$or = [
      { text: { $regex: keyword, $options: 'i' } },
      { category: { $regex: keyword, $options: 'i' } },
      { tags: { $regex: keyword, $options: 'i' } },
    ];
  }

  if (query.category) filter.category = query.category;
  if (query.difficulty) filter.difficulty = query.difficulty;

  return filter;
}

function makeNavigationFilter(query = {}) {
  const conditions = [{ $or: [{ status: 'approved' }, { status: { $exists: false } }] }];

  if (query.keyword) {
    const keyword = escapeRegex(String(query.keyword).trim());
    conditions.push({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { category: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } },
      ],
    });
  }

  const filter = { $and: conditions };
  if (query.category) filter.category = query.category;
  return filter;
}

function makeAffiliateFilter(query = {}) {
  const filter = {};
  if (query.keyword) {
    const keyword = escapeRegex(String(query.keyword).trim());
    filter.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { category: { $regex: keyword, $options: 'i' } },
      { tags: { $regex: keyword, $options: 'i' } },
    ];
  }
  if (query.category) filter.category = query.category;
  return filter;
}

function maskAnswer(answer = '') {
  const safeAnswer = String(answer);
  if (safeAnswer.length <= 36) return safeAnswer;
  return `${safeAnswer.slice(0, 36)}...`;
}

export async function getHome() {
  const [
    totalQuestions,
    totalNavigations,
    totalAffiliates,
    latestQuestions,
    navigations,
    affiliates,
  ] = await Promise.all([
    Question.countDocuments({ status: 'approved' }),
    Navigation.countDocuments({ $or: [{ status: 'approved' }, { status: { $exists: false } }] }),
    Affiliate.countDocuments({}),
    Question.find({ status: 'approved' })
      .select(questionListProjection())
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Navigation.find(makeNavigationFilter())
      .select('name url category tags createdAt')
      .sort({ createdAt: -1 })
      .limit(9)
      .lean(),
    Affiliate.find({})
      .select('name url category tags createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return {
    stats: { totalQuestions, totalNavigations, totalAffiliates },
    latestQuestions: latestQuestions.map(normalizeQuestion),
    navigations,
    affiliates,
  };
}

export async function getQuestions(query = {}) {
  const { page, limit, skip } = getPageParams(query, 12, 20);
  const filter = makeQuestionFilter(query);

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .select(questionListProjection())
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return {
    questions: questions.map(normalizeQuestion),
    total,
    page,
    limit,
  };
}

export async function getQuestionById(id, options = {}) {
  const question = await Question.findOne({ _id: id, status: 'approved' })
    .select('text answer category difficulty tags stats createdAt')
    .lean();

  if (!question) {
    throw notFound('题目不存在');
  }

  await Question.updateOne({ _id: id }, { $inc: { 'stats.views': 1 } });

  const canViewSensitive = Boolean(options.mpUser);
  const fullAnswer = String(question.answer || '');

  return {
    question: {
      ...normalizeQuestion(question),
      answerPreview: canViewSensitive ? fullAnswer : maskAnswer(fullAnswer),
      answer: canViewSensitive ? fullAnswer : undefined,
      answerMasked: !canViewSensitive && fullAnswer.length > 36,
      accessLevel: canViewSensitive ? 'authenticated' : 'public',
    },
  };
}

export async function getNavigations(query = {}) {
  const { page, limit, skip } = getPageParams(query, 18, 24);
  const filter = makeNavigationFilter(query);

  const [navigations, total] = await Promise.all([
    Navigation.find(filter)
      .select('name url category tags createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Navigation.countDocuments(filter),
  ]);

  return { navigations, total, page, limit };
}

export async function getAffiliates(query = {}) {
  const { page, limit, skip } = getPageParams(query, 12, 20);
  const filter = makeAffiliateFilter(query);

  const [affiliates, total] = await Promise.all([
    Affiliate.find(filter)
      .select('name url category tags createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Affiliate.countDocuments(filter),
  ]);

  return { affiliates, total, page, limit };
}
