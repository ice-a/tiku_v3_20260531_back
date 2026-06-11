import User from '../models/User.js';
import Question from '../models/Question.js';
import Navigation from '../models/Navigation.js';
import Affiliate from '../models/Affiliate.js';
import PracticeRecord from '../models/PracticeRecord.js';
import Feedback from '../models/Feedback.js';
import { badRequest, notFound } from '../utils/HttpError.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function getUsers(query) {
  const { page = 1, limit = 20, keyword, role } = query;

  const filter = {};

  if (keyword) {
    filter.$or = [
      { username: { $regex: escapeRegex(keyword), $options: 'i' } },
      { email: { $regex: escapeRegex(keyword), $options: 'i' } }
    ];
  }

  if (role) {
    filter.role = role;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter)
  ]);

  return { users, total, page: Number(page), limit: Number(limit) };
}

export async function getUserById(id) {
  const user = await User.findById(id);
  if (!user) {
    throw notFound('User not found');
  }

  const [practiceCount, correctCount, favoriteCount] = await Promise.all([
    PracticeRecord.countDocuments({ userId: id }),
    PracticeRecord.countDocuments({ userId: id, isCorrect: true }),
    Feedback.countDocuments({ userId: id })
  ]);

  const accuracy = practiceCount > 0
    ? Math.round((correctCount / practiceCount) * 100)
    : 0;

  return {
    user,
    stats: {
      practiceCount,
      correctCount,
      accuracy,
      feedbackCount: favoriteCount
    }
  };
}

export async function updateUser(id, data) {
  const allowedFields = ['role'];
  const updates = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  const user = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true
  });

  if (!user) {
    throw notFound('User not found');
  }

  return user;
}

export async function deleteUser(id) {
  const user = await User.findById(id);
  if (!user) {
    throw notFound('User not found');
  }

  await Promise.all([
    User.findByIdAndDelete(id),
    PracticeRecord.deleteMany({ userId: id }),
    Feedback.deleteMany({ userId: id })
  ]);
}

export async function getContentStats() {
  const [questionStats, navigationCount, affiliateCount, feedbackStats] = await Promise.all([
    Question.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    Navigation.countDocuments(),
    Affiliate.countDocuments(),
    Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const questionMap = {};
  for (const stat of questionStats) {
    questionMap[stat._id] = stat.count;
  }
  const totalQuestions = Object.values(questionMap).reduce((a, b) => a + b, 0);

  const feedbackMap = {};
  for (const stat of feedbackStats) {
    feedbackMap[stat._id] = stat.count;
  }
  const totalFeedbacks = Object.values(feedbackMap).reduce((a, b) => a + b, 0);

  return {
    questions: {
      total: totalQuestions,
      pending: questionMap.pending || 0,
      approved: questionMap.approved || 0,
      rejected: questionMap.rejected || 0
    },
    navigations: {
      total: navigationCount
    },
    affiliates: {
      total: affiliateCount
    },
    feedbacks: {
      total: totalFeedbacks,
      pending: feedbackMap.pending || 0,
      resolved: feedbackMap.resolved || 0
    }
  };
}

export async function getPendingContent(type) {
  let pending = [];

  if (!type || type === 'question') {
    const questions = await Question.find({ status: 'pending' })
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 });
    pending = pending.concat(questions.map(q => ({ ...q.toObject(), _type: 'question' })));
  }

  if (!type || type === 'navigation') {
    const navigations = await Navigation.find({ status: 'pending' })
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 });
    pending = pending.concat(navigations.map(n => ({ ...n.toObject(), _type: 'navigation' })));
  }

  if (!type || type === 'feedback') {
    const feedbacks = await Feedback.find({ status: 'pending' })
      .populate('userId', 'username')
      .populate('questionId', 'text')
      .sort({ createdAt: -1 });
    pending = pending.concat(feedbacks.map(f => ({ ...f.toObject(), _type: 'feedback' })));
  }

  return pending;
}

export async function approveContent(type, id) {
  if (type === 'question') {
    const question = await Question.findById(id);
    if (!question) {
      throw notFound('Question not found');
    }
    question.status = 'approved';
    await question.save();
    return { message: 'Question approved' };
  }

  if (type === 'navigation') {
    const navigation = await Navigation.findById(id);
    if (!navigation) {
      throw notFound('Navigation not found');
    }
    navigation.status = 'approved';
    await navigation.save();
    return { message: 'Navigation approved' };
  }

  if (type === 'feedback') {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw notFound('Feedback not found');
    }
    feedback.status = 'resolved';
    feedback.resolvedAt = new Date();
    await feedback.save();
    return { message: 'Feedback resolved' };
  }

  throw badRequest('Unsupported content type');
}

export async function rejectContent(type, id) {
  if (type === 'question') {
    const question = await Question.findById(id);
    if (!question) {
      throw notFound('Question not found');
    }
    question.status = 'rejected';
    await question.save();
    return { message: 'Question rejected' };
  }

  if (type === 'navigation') {
    const navigation = await Navigation.findById(id);
    if (!navigation) {
      throw notFound('Navigation not found');
    }
    navigation.status = 'rejected';
    await navigation.save();
    return { message: 'Navigation rejected' };
  }

  if (type === 'feedback') {
    const feedback = await Feedback.findByIdAndDelete(id);
    if (!feedback) {
      throw notFound('Feedback not found');
    }
    return { message: 'Feedback deleted' };
  }

  throw badRequest('Unsupported content type');
}

export async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    newToday,
    totalQuestions,
    totalNavigations,
    totalAffiliates,
    totalPractices,
    totalFeedbacks
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: today } }),
    Question.countDocuments(),
    Navigation.countDocuments(),
    Affiliate.countDocuments(),
    PracticeRecord.countDocuments(),
    Feedback.countDocuments()
  ]);

  const activeTodayPractices = await PracticeRecord.distinct('userId', {
    createdAt: { $gte: today }
  });

  return {
    users: {
      total: totalUsers,
      newToday,
      activeToday: activeTodayPractices.length
    },
    content: {
      totalQuestions,
      totalNavigations,
      totalAffiliates
    },
    activity: {
      totalPractices,
      totalFeedbacks
    }
  };
}

export async function getSystemSettings() {
  return {
    siteName: process.env.SITE_NAME || '题库系统',
    siteDescription: process.env.SITE_DESCRIPTION || '',
    registrationEnabled: process.env.REGISTRATION_ENABLED !== 'false',
    emailVerificationEnabled: process.env.EMAIL_VERIFICATION === 'true',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '465',
    smtpUser: process.env.SMTP_USER || '',
    smtpFrom: process.env.SMTP_FROM || '',
  };
}

export async function updateSystemSettings(settings) {
  const allowedFields = ['siteName', 'siteDescription', 'registrationEnabled', 'emailVerificationEnabled', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpFrom'];
  const updates = {};

  for (const field of allowedFields) {
    if (settings[field] !== undefined) {
      updates[field] = settings[field];
    }
  }

  const current = await getSystemSettings();
  return { ...current, ...updates };
}
