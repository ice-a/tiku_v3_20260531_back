import * as miniprogramService from '../services/miniprogram.js';
import { getHitokoto as getHitokotoService } from '../services/hitokoto.js';

function sendError(res, err) {
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    error: err.message || '请求失败',
  });
}

export async function getHome(req, res) {
  try {
    const data = await miniprogramService.getHome();
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

export async function getQuestions(req, res) {
  try {
    const data = await miniprogramService.getQuestions(req.query);
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

export async function getQuestionById(req, res) {
  try {
    const data = await miniprogramService.getQuestionById(req.params.id, {
      mpUser: req.mpUser,
    });
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

export async function getSession(req, res) {
  res.json({
    success: true,
    data: {
      user: req.mpUser,
    },
  });
}

export async function getNavigations(req, res) {
  try {
    const data = await miniprogramService.getNavigations(req.query);
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

export async function getAffiliates(req, res) {
  try {
    const data = await miniprogramService.getAffiliates(req.query);
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

export async function getHitokoto(req, res) {
  try {
    const data = await getHitokotoService({ refresh: req.query.refresh === '1' });
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}
