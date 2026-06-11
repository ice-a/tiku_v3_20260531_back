import * as membershipService from '../services/membership.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPlanInfo = asyncHandler(async (req, res) => {
  const plans = membershipService.getPlanInfo();
  res.json({ success: true, data: { plans } });
});

export const getMembership = asyncHandler(async (req, res) => {
  const membership = await membershipService.getCurrentMembership(req.user._id);
  res.json({ success: true, data: membership });
});

export const createOrder = asyncHandler(async (req, res) => {
  const { plan, channel, yearly } = req.body;
  const order = await membershipService.createOrder(req.user._id, plan, channel || 'alipay', yearly);
  res.json({ success: true, data: { order } });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await membershipService.getOrder(req.params.id);
  res.json({ success: true, data: { order } });
});

export const paymentCallback = asyncHandler(async (req, res) => {
  const { orderId, tradeNo } = req.body;
  const order = await membershipService.completePayment(orderId, tradeNo);
  res.json({ success: true, data: { order } });
});

export const adminGrant = asyncHandler(async (req, res) => {
  const { userId, plan, days } = req.body;
  await membershipService.adminGrantMembership(userId, plan, days || 30);
  res.json({ success: true, message: '会员已开通' });
});

export const adminOrders = asyncHandler(async (req, res) => {
  const result = await membershipService.getOrderList(req.query);
  res.json({ success: true, data: result });
});
