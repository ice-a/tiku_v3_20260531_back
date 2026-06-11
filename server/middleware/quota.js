const TODAY = () => new Date().toISOString().slice(0, 10);

const LIMITS = {
  free: { practice: 10, aiScore: 0, aiAnswer: 0, careerChat: 2 },
  pro: { practice: Infinity, aiScore: 20, aiAnswer: 10, careerChat: 50 },
  enterprise: { practice: Infinity, aiScore: Infinity, aiAnswer: Infinity, careerChat: Infinity },
};

function getEffectivePlan(user) {
  if (user.getEffectivePlan) return user.getEffectivePlan();
  if (user.membership?.plan && user.membership.plan !== 'free') {
    if (!user.membership.expiresAt || user.membership.expiresAt > new Date()) {
      return user.membership.plan;
    }
  }
  return 'free';
}

function resetIfNeeded(quota, dateField, usedField) {
  const today = TODAY();
  if (quota[dateField] !== today) {
    quota[dateField] = today;
    quota[usedField] = 0;
  }
}

export function checkQuota(type) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }

    const plan = getEffectivePlan(user);
    const limit = LIMITS[plan]?.[type];

    if (limit === undefined) {
      return res.status(400).json({ success: false, error: '未知的配额类型' });
    }

    if (limit === Infinity) {
      return next();
    }

    if (!user.quota) {
      user.quota = {};
    }

    const dateField = `${type}Date`;
    const usedField = `${type}Used`;

    resetIfNeeded(user.quota, dateField, usedField);

    if (user.quota[usedField] >= limit) {
      const msg = plan === 'free'
        ? `免费用户每日${typeLabel(type)}次数已达上限，升级 Pro 会员解锁更多`
        : `每日${typeLabel(type)}次数已达上限`;
      return res.status(403).json({
        success: false,
        error: msg,
        quota: { used: user.quota[usedField], limit, plan },
      });
    }

    req._quotaKey = { dateField, usedField };
    next();
  };
}

export function consumeQuota(req, user) {
  if (!req._quotaKey || !user?.quota) return;
  const { usedField } = req._quotaKey;
  user.quota[usedField] = (user.quota[usedField] || 0) + 1;
}

export async function saveQuota(user) {
  if (user?.quota?.isModified?.()) {
    await user.save();
  }
}

function typeLabel(type) {
  const map = { practice: '练习', aiScore: 'AI 评分', aiAnswer: 'AI 生成答案', careerChat: 'AI 对话' };
  return map[type] || type;
}

export { getEffectivePlan, LIMITS };
