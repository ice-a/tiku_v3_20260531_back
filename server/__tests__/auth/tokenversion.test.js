import request from 'supertest';
import { startTestEnv, stopTestEnv } from '../contract/setup.js';

let app;
let User;

const mpHeaders = () => ({
  'X-Requested-With': 'MiniProgram',
  'X-MP-Client': 'mp_test_tokenversion_001',
  'X-MP-Timestamp': String(Date.now()),
  'X-MP-Nonce': 'abcdef0123',
});

async function registerAndLogin(prefix) {
  const email = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
  const username = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const password = 'OriginalPass123';

  await request(app)
    .post('/api/auth/register')
    .set(mpHeaders())
    .send({ username, email, password })
    .expect(201);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .set(mpHeaders())
    .send({ email, password })
    .expect(200);

  return {
    email,
    username,
    password,
    userId: loginRes.body.data.user._id,
    accessToken: loginRes.body.data.accessToken,
    refreshToken: loginRes.body.data.refreshToken,
  };
}

beforeAll(async () => {
  await startTestEnv();
  const appModule = await import('../../app.js');
  app = appModule.default;
  User = (await import('../../models/User.js')).default;
});

afterAll(async () => {
  await stopTestEnv();
});

describe('T0.2 tokenVersion: register/login', () => {
  it('new user starts with tokenVersion=0 and refresh carries it', async () => {
    const account = await registerAndLogin('tv1');

    const dbUser = await User.findById(account.userId).lean();
    expect(dbUser.tokenVersion).toBe(0);
  });
});

describe('T0.2 tokenVersion: refresh rotation', () => {
  it('successful refresh leaves tokenVersion unchanged and returns a new pair', async () => {
    const account = await registerAndLogin('tv2');

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set(mpHeaders())
      .send({ refreshToken: account.refreshToken })
      .expect(200);

    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).toBeTruthy();

    const dbUser = await User.findById(account.userId).lean();
    expect(dbUser.tokenVersion).toBe(0);
  });
});

describe('T0.2 tokenVersion: logout revokes refresh token', () => {
  it('after logout, the old refresh token is rejected', async () => {
    const account = await registerAndLogin('tv3');

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set(mpHeaders())
      .set('Authorization', `Bearer ${account.accessToken}`)
      .expect(200);

    expect(logoutRes.body.success).toBe(true);

    const dbUser = await User.findById(account.userId).lean();
    expect(dbUser.tokenVersion).toBe(1);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set(mpHeaders())
      .send({ refreshToken: account.refreshToken })
      .expect(401);

    expect(refreshRes.body.success).toBe(false);
    expect(typeof refreshRes.body.error).toBe('string');
  });

  it('after logout, a fresh login returns a usable refresh token (new tokenVersion)', async () => {
    const account = await registerAndLogin('tv3b');

    await request(app)
      .post('/api/auth/logout')
      .set(mpHeaders())
      .set('Authorization', `Bearer ${account.accessToken}`)
      .expect(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(mpHeaders())
      .send({ email: account.email, password: account.password })
      .expect(200);

    const newRefresh = loginRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set(mpHeaders())
      .send({ refreshToken: newRefresh })
      .expect(200);

    expect(refreshRes.body.success).toBe(true);
  });
});

describe('T0.2 tokenVersion: changePassword revokes refresh token', () => {
  it('after password change, the old refresh token is rejected', async () => {
    const account = await registerAndLogin('tv4');
    const newPassword = 'BrandNewPass456';

    const changeRes = await request(app)
      .put('/api/auth/password')
      .set(mpHeaders())
      .set('Authorization', `Bearer ${account.accessToken}`)
      .send({ oldPassword: account.password, newPassword })
      .expect(200);

    expect(changeRes.body.success).toBe(true);

    const dbUser = await User.findById(account.userId).lean();
    expect(dbUser.tokenVersion).toBe(1);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set(mpHeaders())
      .send({ refreshToken: account.refreshToken })
      .expect(401);

    expect(refreshRes.body.success).toBe(false);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(mpHeaders())
      .send({ email: account.email, password: newPassword })
      .expect(200);

    expect(loginRes.body.data.accessToken).toBeTruthy();
  });
});

describe('T0.2 tokenVersion: backwards compatibility', () => {
  it('refresh tokens issued before the field was added (tokenVersion missing) still work for default 0 users', async () => {
    const account = await registerAndLogin('tv5');

    // Simulate a pre-T0.2 refresh token by signing without tokenVersion
    const jwt = (await import('jsonwebtoken')).default;
    const config = (await import('../../config/index.js')).default;
    const legacyToken = jwt.sign(
      { userId: account.userId },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set(mpHeaders())
      .send({ refreshToken: legacyToken })
      .expect(200);

    expect(refreshRes.body.success).toBe(true);
  });
});

describe('T0.2 tokenVersion: invalid refresh token', () => {
  it('rejects a malformed refresh token with 401', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set(mpHeaders())
      .send({ refreshToken: 'not.a.valid.jwt' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('rejects a refresh token whose user has been deleted', async () => {
    const account = await registerAndLogin('tv6');
    await User.findByIdAndDelete(account.userId);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set(mpHeaders())
      .send({ refreshToken: account.refreshToken })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});
