import * as questionsService from '../services/questions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/HttpError.js';
import { consumeQuota } from '../middleware/quota.js';

export const getList = asyncHandler(async (req, res) => {
  const result = await questionsService.getList(req.query);

  if (!req.user) {
    result.questions = result.questions.map((q) => {
      const question = q.toObject();
      if (question.answer && question.answer.length > 20) {
        question.answer = `${question.answer.substring(0, 20)}...`;
      }
      return question;
    });
  }

  res.json({ success: true, data: result });
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await questionsService.getStats(req.user._id);
  res.json({ success: true, data: stats });
});

export const getById = asyncHandler(async (req, res) => {
  const question = await questionsService.getById(req.params.id);

  if (!req.user) {
    const q = question.toObject ? question.toObject() : { ...question };
    if (q.answer && q.answer.length > 20) {
      q.answer = `${q.answer.substring(0, 20)}...`;
    }
    return res.json({ success: true, data: { question: q } });
  }

  res.json({ success: true, data: { question } });
});

export const create = asyncHandler(async (req, res) => {
  const question = await questionsService.create(req.body, req.user._id);
  res.status(201).json({ success: true, data: { question } });
});

export const update = asyncHandler(async (req, res) => {
  const question = await questionsService.update(req.params.id, req.body, req.user);
  res.json({ success: true, data: { question } });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  await questionsService.deleteQuestion(req.params.id, req.user);
  res.json({ success: true, message: 'Question deleted' });
});

export const importQuestions = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest('请上传文件');
  }
  const result = await questionsService.bulkImport(req.file, req.user._id);
  res.json({ success: true, data: result });
});

export const approve = asyncHandler(async (req, res) => {
  const question = await questionsService.approve(req.params.id, req.user._id);
  res.json({ success: true, data: { question } });
});

export const reject = asyncHandler(async (req, res) => {
  const question = await questionsService.reject(req.params.id, req.user._id);
  res.json({ success: true, data: { question } });
});

export const practice = asyncHandler(async (req, res) => {
  const { userAnswer } = req.body;
  if (!userAnswer) {
    throw badRequest('请提供答案');
  }
  const result = await questionsService.practice(req.params.id, req.user._id, userAnswer);
  consumeQuota(req, req.user);
  await req.user.save();
  res.json({ success: true, data: result });
});

export const aiScore = asyncHandler(async (req, res) => {
  const { userAnswer } = req.body;
  if (!userAnswer) {
    throw badRequest('请提供答案');
  }

  const user = req.user;
  if (!user.aiConfig || !user.aiConfig.enabled) {
    throw badRequest('请先配置 AI 评分功能');
  }

  const result = await questionsService.aiScore(
    req.params.id,
    user._id,
    userAnswer,
    user.aiConfig
  );
  consumeQuota(req, user);
  await user.save();
  res.json({ success: true, data: result });
});

export const aiAnswer = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user.aiConfig || !user.aiConfig.enabled) {
    throw badRequest('请先配置 AI 功能');
  }

  const result = await questionsService.aiGenerateAnswer(req.params.id, user.aiConfig);
  consumeQuota(req, user);
  await user.save();
  res.json({ success: true, data: result });
});

export const submitToAnswerPool = asyncHandler(async (req, res) => {
  const { answer, source } = req.body;
  if (!answer) {
    throw badRequest('请提供答案');
  }
  const answerPool = await questionsService.submitToAnswerPool(
    req.params.id,
    req.user._id,
    answer,
    source || 'manual'
  );
  res.json({ success: true, data: { answerPool } });
});

export const getAnswerPool = asyncHandler(async (req, res) => {
  const answerPool = await questionsService.getAnswerPool(req.params.id);
  res.json({ success: true, data: { answerPool } });
});

export const share = asyncHandler(async (req, res) => {
  const imageBuffer = await questionsService.share(req.params.id);
  res.set('Content-Type', 'image/png');
  res.send(imageBuffer);
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const { type, content } = req.body;
  if (!type || !content) {
    throw badRequest('请提供反馈类型和内容');
  }
  const feedbackRecord = await questionsService.feedback(
    req.params.id,
    req.user._id,
    type,
    content
  );
  res.json({ success: true, data: { feedback: feedbackRecord } });
});
