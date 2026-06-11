import Donation from '../models/Donation.js';
import User from '../models/User.js';
import { notFound } from '../utils/HttpError.js';

export async function createDonation(userId, amount, message = '', anonymous = false) {
  return Donation.create({ userId, amount, message, anonymous });
}

export async function getDonationWall(limit = 20) {
  const donations = await Donation.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username nickname avatar');

  return donations.map(d => ({
    _id: d._id,
    amount: d.amount,
    message: d.message,
    anonymous: d.anonymous,
    username: d.anonymous ? '匿名用户' : (d.userId?.nickname || d.userId?.username || '用户'),
    avatar: d.anonymous ? '' : (d.userId?.avatar || ''),
    createdAt: d.createdAt,
  }));
}

export async function getDonationStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalResult, monthResult, countResult] = await Promise.all([
    Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Donation.aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Donation.countDocuments(),
  ]);

  return {
    totalAmount: totalResult[0]?.total || 0,
    monthAmount: monthResult[0]?.total || 0,
    totalCount: countResult,
  };
}

export async function getDonationRanking(monthly = false) {
  const match = {};
  if (monthly) {
    const now = new Date();
    match.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  const ranking = await Donation.aggregate([
    ...(monthly ? [{ $match: match }] : []),
    {
      $group: {
        _id: '$userId',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
    { $limit: 20 },
  ]);

  const userIds = ranking.map(r => r._id);
  const users = await User.find({ _id: { $in: userIds } }).select('username nickname avatar');
  const userMap = new Map(users.map(u => [String(u._id), u]));

  return ranking.map(r => {
    const user = userMap.get(String(r._id));
    return {
      userId: r._id,
      username: user?.nickname || user?.username || '用户',
      avatar: user?.avatar || '',
      totalAmount: r.totalAmount,
      count: r.count,
    };
  });
}
