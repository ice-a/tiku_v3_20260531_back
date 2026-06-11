import * as donationsService from '../services/donations.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/HttpError.js';

export const createDonation = asyncHandler(async (req, res) => {
  const { amount, message, anonymous } = req.body;
  if (!amount || amount < 1) {
    throw badRequest('打赏金额至少 1 元');
  }
  const donation = await donationsService.createDonation(req.user._id, amount, message, anonymous);
  res.status(201).json({ success: true, data: { donation } });
});

export const getWall = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  const wall = await donationsService.getDonationWall(limit);
  res.json({ success: true, data: { wall } });
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await donationsService.getDonationStats();
  res.json({ success: true, data: stats });
});

export const getRanking = asyncHandler(async (req, res) => {
  const monthly = req.query.monthly === '1';
  const ranking = await donationsService.getDonationRanking(monthly);
  res.json({ success: true, data: { ranking } });
});
