const PASSWORD_MIN_LENGTH = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  }
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^\w\s]/.test(password),
  ].filter(Boolean).length;
  if (classes < 3) {
    return {
      ok: false,
      reason: 'Password must contain at least 3 of: lowercase, uppercase, digit, special character',
    };
  }
  return { ok: true };
}

export const passwordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,
  requiredClasses: 3,
  maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
  lockDurationMs: LOCK_DURATION_MS,
};

export function isAccountLocked(user) {
  return Boolean(user.lockUntil && user.lockUntil > new Date());
}

export async function recordFailedLogin(user) {
  user.loginAttempts = (user.loginAttempts || 0) + 1;
  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
  }
  await user.save();
}

export async function clearLoginState(user) {
  if (user.loginAttempts || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }
}
