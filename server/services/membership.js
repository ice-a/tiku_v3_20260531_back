import Order from '../models/Order.js';
import User from '../models/User.js';
import { badRequest, notFound } from '../utils/HttpError.js';

const PLANS = {
  pro: { name: 'Pro 会员', price: 29, yearlyPrice: 199, durationDays: 30, yearlyDays: 365 },
  enterprise: { name: '企业版', price: 999, yearlyPrice: null, durationDays: 30, yearlyDays: null },
};

export function getPlanInfo() {
  return PLANS;
}

export async function getCurrentMembership(userId) {
  const user = await User.findById(userId).select('membership quota');
  if (!user) throw notFound('User not found');
  return {
    plan: user.getEffectivePlan(),
    expiresAt: user.membership.expiresAt,
    quota: user.quota,
  };
}

export async function createOrder(userId, plan, channel, yearly = false) {
  if (!PLANS[plan]) throw badRequest('Invalid plan');

  const planInfo = PLANS[plan];
  const amount = yearly && planInfo.yearlyPrice ? planInfo.yearlyPrice : planInfo.price;
  const duration = yearly && planInfo.yearlyDays ? planInfo.yearlyDays : planInfo.durationDays;

  const order = await Order.create({
    userId,
    plan,
    amount,
    channel,
    duration,
    tradeNo: `TK${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  });

  return order;
}

export async function getOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound('Order not found');
  return order;
}

export async function completePayment(orderId, tradeNo) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound('Order not found');
  if (order.status !== 'pending') return order;

  order.status = 'paid';
  order.tradeNo = tradeNo || order.tradeNo;
  order.paidAt = new Date();
  await order.save();

  const user = await User.findById(order.userId);
  if (!user) return order;

  const now = new Date();
  const base = user.membership?.expiresAt && user.membership.expiresAt > now
    ? user.membership.expiresAt
    : now;

  user.membership.plan = order.plan;
  user.membership.expiresAt = new Date(base.getTime() + order.duration * 24 * 60 * 60 * 1000);
  await user.save();

  return order;
}

export async function adminGrantMembership(userId, plan, days) {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found');

  if (!PLANS[plan]) throw badRequest('Invalid plan');

  const now = new Date();
  const base = user.membership?.expiresAt && user.membership.expiresAt > now
    ? user.membership.expiresAt
    : now;

  user.membership.plan = plan;
  user.membership.expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  await user.save();

  return user;
}

export async function getOrderList(query = {}) {
  const { page = 1, limit = 20, userId, status } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (userId) filter.userId = userId;
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('userId', 'username email'),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page: pageNum, limit: limitNum };
}
