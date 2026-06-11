import * as adsService from '../services/ads.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAd = asyncHandler(async (req, res) => {
  const ad = await adsService.getAdBySlot(req.query.slot);
  if (!ad) return res.json({ success: true, data: { ad: null } });
  res.json({ success: true, data: { ad } });
});

export const trackClick = asyncHandler(async (req, res) => {
  await adsService.incrementClicks(req.params.id);
  res.json({ success: true });
});

export const createAd = asyncHandler(async (req, res) => {
  const ad = await adsService.createAd(req.body);
  res.status(201).json({ success: true, data: { ad } });
});

export const updateAd = asyncHandler(async (req, res) => {
  const ad = await adsService.updateAd(req.params.id, req.body);
  res.json({ success: true, data: { ad } });
});

export const deleteAd = asyncHandler(async (req, res) => {
  await adsService.deleteAd(req.params.id);
  res.json({ success: true, message: '广告已删除' });
});

export const getAdList = asyncHandler(async (req, res) => {
  const result = await adsService.getAdList(req.query);
  res.json({ success: true, data: result });
});
