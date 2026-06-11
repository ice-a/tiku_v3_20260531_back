import * as miniprogramService from '../services/miniprogram.js';
import { getHitokoto as getHitokotoService } from '../services/hitokoto.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getHome = asyncHandler(async (req, res) => {
  const data = await miniprogramService.getHome();
  res.json({ success: true, data });
});

export const getQuestions = asyncHandler(async (req, res) => {
  const data = await miniprogramService.getQuestions(req.query);
  res.json({ success: true, data });
});

export const getQuestionById = asyncHandler(async (req, res) => {
  const data = await miniprogramService.getQuestionById(req.params.id, {
    mpUser: req.mpUser,
  });
  res.json({ success: true, data });
});

export const getSession = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.mpUser,
    },
  });
});

export const getNavigations = asyncHandler(async (req, res) => {
  const data = await miniprogramService.getNavigations(req.query);
  res.json({ success: true, data });
});

export const getAffiliates = asyncHandler(async (req, res) => {
  const data = await miniprogramService.getAffiliates(req.query);
  res.json({ success: true, data });
});

export const getHitokoto = asyncHandler(async (req, res) => {
  const data = await getHitokotoService({ refresh: req.query.refresh === '1' });
  res.json({ success: true, data });
});
