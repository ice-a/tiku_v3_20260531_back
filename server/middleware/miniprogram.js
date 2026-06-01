import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { validateToken } from '../services/miniprogramAuth.js';

const REQUEST_WINDOW_MS = 5 * 60 * 1000;
const clientPattern = /^mp_[a-z0-9]+_[a-z0-9]+$/i;

function getClientId(req) {
  return req.get('X-MP-Client') || ipKeyGenerator(req.ip);
}

function miniprogramGuard(req, res, next) {
  const clientId = req.get('X-MP-Client') || '';
  const timestamp = Number(req.get('X-MP-Timestamp'));
  const nonce = req.get('X-MP-Nonce') || '';
  const requestedWith = req.get('X-Requested-With') || '';

  if (requestedWith !== 'MiniProgram') {
    return res.status(403).json({ success: false, error: 'Invalid client' });
  }

  if (!clientPattern.test(clientId)) {
    return res.status(403).json({ success: false, error: 'Invalid client id' });
  }

  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > REQUEST_WINDOW_MS) {
    return res.status(403).json({ success: false, error: 'Invalid request timestamp' });
  }

  if (!/^[a-z0-9]{6,32}$/i.test(nonce)) {
    return res.status(403).json({ success: false, error: 'Invalid request nonce' });
  }

  res.set({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });

  next();
}

const miniprogramLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.MINIPROGRAM_RATE_LIMIT || 90),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  message: { success: false, error: '请求过于频繁，请稍后再试' },
});

async function optionalMiniProgramAuth(req, res, next) {
  const token = req.get('X-MP-Token') || req.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    req.mpUser = null;
    return next();
  }

  try {
    req.mpUser = await validateToken(token);
  } catch {
    return res.status(401).json({ success: false, error: '小程序登录态无效' });
  }

  return next();
}

async function requireMiniProgramAuth(req, res, next) {
  const token = req.get('X-MP-Token') || req.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: '请先登录小程序' });
  }

  try {
    req.mpUser = await validateToken(token);
    return next();
  } catch (err) {
    return res.status(err.status || 401).json({
      success: false,
      error: err.message || '小程序登录态无效',
    });
  }
}

export {
  miniprogramGuard,
  miniprogramLimiter,
  optionalMiniProgramAuth,
  requireMiniProgramAuth,
};
