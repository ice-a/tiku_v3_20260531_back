import sharp from 'sharp';
import nodemailer from 'nodemailer';
import Question from '../models/Question.js';
import PracticeRecord from '../models/PracticeRecord.js';
import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import config from '../config/index.js';
import { callChatCompletions } from './aiClient.js';
import { readSpreadsheetRows } from '../utils/spreadsheet.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 邮件发送器
const createTransporter = () => {
  if (!config.smtp.host) return null;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });
};

// 发送邮件通知
const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter();
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: config.smtp.user,
      to,
      subject,
      html
    });
  } catch (err) {
    console.error('邮件发送失败:', err.message);
  }
};

// 获取题目列表
export const getList = async (query) => {
  const {
    page = 1,
    limit = 20,
    keyword,
    category,
    difficulty,
    tags,
    status
  } = query;

  const filter = {};

  if (keyword) {
    filter.$or = [
      { text: { $regex: escapeRegex(keyword), $options: 'i' } },
      { answer: { $regex: escapeRegex(keyword), $options: 'i' } }
    ];
  }

  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (status) filter.status = status;

  if (tags) {
    const tagList = Array.isArray(tags) ? tags : tags.split(',');
    filter.tags = { $in: tagList };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [questions, total] = await Promise.all([
    Question.find(filter)
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Question.countDocuments(filter)
  ]);

  return { questions, total, page: Number(page), limit: Number(limit) };
};

// 获取题目详情
export const getById = async (id) => {
  const question = await Question.findById(id)
    .populate('uploadedBy', 'username')
    .populate('approvedBy', 'username');

  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  // 增加浏览次数
  question.stats.views += 1;
  await question.save();

  return question;
};

// 创建题目
export const create = async (data, userId) => {
  const question = new Question({
    ...data,
    uploadedBy: userId,
    status: 'pending'
  });
  await question.save();
  return question;
};

// 更新题目
const canManageQuestion = (question, user) => {
  return user?.role === 'admin' || String(question.uploadedBy) === String(user?._id);
};

const pickQuestionUpdates = (data) => {
  const allowedFields = ['text', 'answer', 'category', 'difficulty', 'tags'];
  const updates = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  return updates;
};

export const update = async (id, data, user) => {
  const question = await Question.findById(id);
  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  if (!canManageQuestion(question, user)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  Object.assign(question, pickQuestionUpdates(data));
  if (user?.role !== 'admin') {
    question.status = 'pending';
    question.approvedBy = undefined;
  }
  await question.save();

  return question;
};

// 删除题目
export const deleteQuestion = async (id, user) => {
  const question = await Question.findById(id);
  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  if (!canManageQuestion(question, user)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  await Question.findByIdAndDelete(id);

  // 删除相关练习记录和反馈
  await Promise.all([
    PracticeRecord.deleteMany({ questionId: id }),
    Feedback.deleteMany({ questionId: id })
  ]);

  return question;
};

// 批量导入
export const bulkImport = async (file, userId) => {
  const rows = await readSpreadsheetRows(file);

  let imported = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const question = new Question({
        text: row.text || row.question || row['题目'],
        answer: row.answer || row['答案'],
        category: row.category || row['分类'] || '未分类',
        difficulty: row.difficulty || row['难度'] || 'medium',
        tags: row.tags ? (Array.isArray(row.tags) ? row.tags : row.tags.split(',').map(t => t.trim())) : [],
        uploadedBy: userId,
        status: 'pending'
      });
      await question.save();
      imported++;
    } catch (err) {
      console.error('导入题目失败:', err.message);
      failed++;
    }
  }

  // 通知管理员
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await sendEmail(
      admin.email,
      '新题目批量导入通知',
      `<p>用户批量导入了 ${imported} 道题目，请前往审核。</p>`
    );
  }

  return { imported, failed };
};

// 审核通过
export const approve = async (id, adminId) => {
  const question = await Question.findByIdAndUpdate(
    id,
    { status: 'approved', approvedBy: adminId },
    { new: true }
  );

  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  // 通知上传者
  if (question.uploadedBy) {
    const uploader = await User.findById(question.uploadedBy);
    if (uploader) {
      await sendEmail(
        uploader.email,
        '题目审核通过',
        `<p>您上传的题目已通过审核。</p><p>题目: ${question.text.substring(0, 50)}...</p>`
      );
    }
  }

  return question;
};

// 审核拒绝
export const reject = async (id, adminId) => {
  const question = await Question.findByIdAndUpdate(
    id,
    { status: 'rejected', approvedBy: adminId },
    { new: true }
  );

  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  // 通知上传者
  if (question.uploadedBy) {
    const uploader = await User.findById(question.uploadedBy);
    if (uploader) {
      await sendEmail(
        uploader.email,
        '题目审核未通过',
        `<p>您上传的题目未通过审核。</p><p>题目: ${question.text.substring(0, 50)}...</p>`
      );
    }
  }

  return question;
};

// 练习答题
export const practice = async (questionId, userId, userAnswer) => {
  const question = await Question.findById(questionId);

  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  // 简单的答案匹配判断
  const normalizedUserAnswer = userAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = question.answer.trim().toLowerCase();
  const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

  // 创建练习记录
  const record = new PracticeRecord({
    userId,
    questionId,
    userAnswer,
    isCorrect
  });
  await record.save();

  // 更新题目统计
  question.stats.attempts += 1;
  if (isCorrect) question.stats.correctAttempts += 1;
  await question.save();

  return { record, isCorrect };
};

// AI 评分
export const aiScore = async (questionId, userId, userAnswer, aiConfig) => {
  const question = await Question.findById(questionId);

  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  if (!aiConfig || !aiConfig.enabled) {
    throw Object.assign(new Error('请先配置 AI 评分功能'), { status: 400 });
  }

  // 调用 AI API 进行评分
  const prompt = `请对以下答案进行评分（0-100分）并给出分析。

题目：${question.text}
标准答案：${question.answer}
用户答案：${userAnswer}

请以 JSON 格式返回：{"score": 分数, "analysis": "分析内容"}`;

  try {
    const data = await callChatCompletions(aiConfig, [{ role: 'user', content: prompt }], {
      temperature: 0.3,
      max_tokens: 1000
    });
    const content = data.choices?.[0]?.message?.content || '{}';

    // 解析 JSON，处理可能的解析失败
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseErr) {
      // 如果 JSON 解析失败，尝试提取分数和分析
      const scoreMatch = content.match(/"score"\s*:\s*(\d+)/);
      const analysisMatch = content.match(/"analysis"\s*:\s*"([^"]+)"/);
      result = {
        score: scoreMatch ? parseInt(scoreMatch[1], 10) : 0,
        analysis: analysisMatch ? analysisMatch[1] : 'AI 返回格式异常，无法解析'
      };
    }

    // 保存练习记录
    const record = new PracticeRecord({
      userId,
      questionId,
      userAnswer,
      aiScore: result.score,
      aiAnalysis: result.analysis
    });
    await record.save();

    return { score: result.score, analysis: result.analysis };
  } catch (err) {
    throw Object.assign(new Error('AI 评分失败: ' + err.message), { status: 500 });
  }
};

// AI 生成答案
export const aiGenerateAnswer = async (questionId, aiConfig) => {
  const question = await Question.findById(questionId);

  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  if (!aiConfig || !aiConfig.enabled) {
    throw Object.assign(new Error('请先配置 AI 功能'), { status: 400 });
  }

  const prompt = `请根据以下题目生成参考答案。

题目：${question.text}
分类：${question.category || '未分类'}
难度：${question.difficulty || '中等'}

请直接给出准确、简洁的答案，不要包含题目信息或额外解释。`;

  try {
    const data = await callChatCompletions(aiConfig, [{ role: 'user', content: prompt }], {
      temperature: 0.5,
      max_tokens: 2000
    });
    const answer = data.choices?.[0]?.message?.content || '';
    return { answer };
  } catch (err) {
    throw Object.assign(new Error('AI 生成答案失败: ' + err.message), { status: 500 });
  }
};

// 获取用户统计
export const getStats = async (userId) => {
  const records = await PracticeRecord.find({ userId }).populate('questionId', 'category');

  const totalAttempts = records.length;
  const correctAttempts = records.filter(r => r.isCorrect).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // 分类统计
  const categoryMap = {};
  for (const record of records) {
    if (!record.questionId) continue;
    const category = record.questionId.category;
    if (!categoryMap[category]) {
      categoryMap[category] = { total: 0, correct: 0 };
    }
    categoryMap[category].total += 1;
    if (record.isCorrect) categoryMap[category].correct += 1;
  }

  const categoryStats = Object.entries(categoryMap).map(([category, stats]) => ({
    category,
    total: stats.total,
    correct: stats.correct,
    accuracy: Math.round((stats.correct / stats.total) * 100)
  }));

  return { totalAttempts, correctAttempts, accuracy, categoryStats };
};

// 生成分享图片
export const share = async (questionId) => {
  const question = await Question.findById(questionId);

  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  const escapeSvg = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const width = 800;
  const height = 400;
  const questionText = question.text.length > 80
    ? question.text.substring(0, 80) + '...'
    : question.text;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#f5f5f5"/>
    <rect width="${width}" height="60" fill="#1890ff"/>
    <text x="20" y="40" fill="#ffffff" font-size="24" font-weight="bold" font-family="sans-serif">题目分享</text>
    <text x="20" y="100" fill="#333333" font-size="18" font-family="sans-serif">${escapeSvg(questionText)}</text>
    <text x="20" y="140" fill="#666666" font-size="14" font-family="sans-serif">分类: ${escapeSvg(question.category)}  |  难度: ${escapeSvg(question.difficulty)}</text>
    <text x="20" y="180" fill="#666666" font-size="14" font-family="sans-serif">浏览: ${question.stats.views}  |  答题: ${question.stats.attempts}</text>
    <text x="${width - 80}" y="${height - 20}" fill="#999999" font-size="12" font-family="sans-serif">题库系统</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
};

// 提交反馈
export const feedback = async (questionId, userId, type, content) => {
  const question = await Question.findById(questionId);

  if (!question) {
    throw Object.assign(new Error('题目不存在'), { status: 404 });
  }

  const feedbackRecord = new Feedback({
    userId,
    questionId,
    type,
    content
  });
  await feedbackRecord.save();

  return feedbackRecord;
};
