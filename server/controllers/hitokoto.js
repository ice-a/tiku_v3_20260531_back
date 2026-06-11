import * as hitokotoService from '../services/hitokoto.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getRandomHitokoto = asyncHandler(async (req, res) => {
  const hitokoto = await hitokotoService.getHitokoto();
  res.json({ success: true, data: { hitokoto } });
});

export const addHitokoto = asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented' });
});

export const getAllHitokotos = asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented' });
});

export const deleteHitokoto = asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented' });
});

export const syncHitokotos = asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented' });
});
