import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import MiniProgramSession from '../models/MiniProgramSession.js';

const CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';
const TOKEN_EXPIRES_IN = process.env.MINIPROGRAM_TOKEN_EXPIRES_IN || '7d';

function getWechatConfig() {
  const appId = process.env.WECHAT_MINIPROGRAM_APPID;
  const appSecret = process.env.WECHAT_MINIPROGRAM_SECRET;

  if (!appId || !appSecret) {
    const error = new Error('微信小程序 AppID 或 AppSecret 未配置');
    error.status = 500;
    throw error;
  }

  return { appId, appSecret };
}

async function callCode2Session(code) {
  const { appId, appSecret } = getWechatConfig();
  const params = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: 'authorization_code',
  });

  const response = await fetch(`${CODE2SESSION_URL}?${params.toString()}`);
  const data = await response.json();

  if (!response.ok || data.errcode) {
    const error = new Error(data.errmsg || '微信登录失败');
    error.status = 401;
    throw error;
  }

  if (!data.openid || !data.session_key) {
    const error = new Error('微信登录返回缺少 openid 或 session_key');
    error.status = 401;
    throw error;
  }

  return data;
}

function generateMiniProgramToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: TOKEN_EXPIRES_IN,
  });
}

export function verifyMiniProgramToken(token) {
  const decoded = jwt.verify(token, config.jwt.secret);
  if (decoded.type !== 'miniprogram' || !decoded.openid) {
    const error = new Error('Invalid miniprogram token');
    error.status = 401;
    throw error;
  }
  return decoded;
}

export async function login({ code, clientId }) {
  if (!code) {
    const error = new Error('code 不能为空');
    error.status = 400;
    throw error;
  }

  const wxSession = await callCode2Session(code);
  const sessionKeyHash = MiniProgramSession.hashSessionKey(wxSession.session_key);

  const session = await MiniProgramSession.findOneAndUpdate(
    { openid: wxSession.openid },
    {
      openid: wxSession.openid,
      unionid: wxSession.unionid || '',
      sessionKeyHash,
      clientId: clientId || '',
      lastLoginAt: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const token = generateMiniProgramToken({
    type: 'miniprogram',
    openid: session.openid,
    sessionId: session._id,
    sessionKeyHash: session.sessionKeyHash,
  });

  return {
    token,
    openid: session.openid,
    expiresIn: TOKEN_EXPIRES_IN,
  };
}

export async function validateToken(token) {
  const decoded = verifyMiniProgramToken(token);
  const session = await MiniProgramSession.findOne({
    _id: decoded.sessionId,
    openid: decoded.openid,
  }).lean();

  if (!session || session.sessionKeyHash !== decoded.sessionKeyHash) {
    const error = new Error('小程序登录态已失效');
    error.status = 401;
    throw error;
  }

  return {
    openid: session.openid,
    sessionId: session._id,
  };
}
