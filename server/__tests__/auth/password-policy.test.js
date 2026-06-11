import request from 'supertest';
import { startTestEnv, stopTestEnv } from '../contract/setup.js';

let app;
let User;

const mpHeaders = () => ({
  'X-Requested-With': 'MiniProgram',
  'X-MP-Client': 'mp_test_pw_001',
  'X-MP-Timestamp': String(Date.now()),
  'X-MP-Nonce': 'abcdef0123',
});

const unique = (tag) => `${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function registerUser(password = 'Strong1Pass!') {
  const email = `${unique('pw')}@example.com`;
  const username = unique('u');
  const res = await request(app)
    .post('/api/auth/register')
    .set(mpHeaders())
    .send({ username, email, password })
    .expect(201);
  return { email, username, password, userId: res.body.data.user._id };
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

describe('T0.4 password strength: register', () => {
  it('rejects passwords shorter than 10 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(mpHeaders())
      .send({
        username: unique('u'),
        email: `${unique('e')}@example.com`,
        password: 'Ab1!abcde', // 9 chars
      })
      .expect(400);
    expect(res.body.error).toMatch(/at least 10/);
  });

  it('rejects passwords with fewer than 3 character classes', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(mpHeaders())
      .send({
        username: unique('u'),
        email: `${unique('e')}@example.com`,
        password: 'allowercaselong', // 17 chars, only 1 class
      })
      .expect(400);
    expect(res.body.error).toMatch(/3 of/);
  });

  it('accepts a strong password (10+ chars, 3+ classes)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(mpHeaders())
      .send({
        username: unique('u'),
        email: `${unique('e')}@example.com`,
        password: 'Abcdefgh1!', // 11 chars, 4 classes
      })
      .expect(201);
    expect(res.body.success).toBe(true);
  });
});

describe('T0.4 password strength: changePassword', () => {
  it('rejects a weak new password', async () => {
    const account = await registerUser();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(mpHeaders())
      .send({ email: account.email, password: account.password })
      .expect(200);

    const res = await request(app)
      .put('/api/auth/password')
      .set(mpHeaders())
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({ oldPassword: account.password, newPassword: 'weak' })
      .expect(400);
    expect(res.body.error).toMatch(/at least 10/);
  });

  it('accepts a strong new password', async () => {
    const account = await registerUser();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(mpHeaders())
      .send({ email: account.email, password: account.password })
      .expect(200);

    const newPassword = 'NewStrong1Pass!';
    const res = await request(app)
      .put('/api/auth/password')
      .set(mpHeaders())
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({ oldPassword: account.password, newPassword })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

describe('T0.4 login lockout', () => {
  it('locks the account after 5 consecutive failed logins', async () => {
    const account = await registerUser();

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .set(mpHeaders())
        .send({ email: account.email, password: 'WrongPass999' })
        .expect(401);
    }

    const res = await request(app)
      .post('/api/auth/login')
      .set(mpHeaders())
      .send({ email: account.email, password: account.password })
      .expect(401);

    expect(res.body.error).toMatch(/锁定/);

    const dbUser = await User.findById(account.userId).lean();
    expect(dbUser.loginAttempts).toBe(5);
    expect(dbUser.lockUntil).toBeTruthy();
    expect(new Date(dbUser.lockUntil).getTime()).toBeGreaterThan(Date.now());
  });

  it('resets the failed-login counter after a successful login', async () => {
    const account = await registerUser();

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .set(mpHeaders())
        .send({ email: account.email, password: 'WrongPass999' })
        .expect(401);
    }

    await request(app)
      .post('/api/auth/login')
      .set(mpHeaders())
      .send({ email: account.email, password: account.password })
      .expect(200);

    const dbUser = await User.findById(account.userId).lean();
    expect(dbUser.loginAttempts).toBe(0);
    expect(dbUser.lockUntil).toBeUndefined();
  });

  it('increments counter and locks only on the 5th attempt', async () => {
    const account = await registerUser();

    for (let i = 0; i < 4; i++) {
      await request(app)
        .post('/api/auth/login')
        .set(mpHeaders())
        .send({ email: account.email, password: 'WrongPass999' })
        .expect(401);
    }

    const beforeLock = await User.findById(account.userId).lean();
    expect(beforeLock.loginAttempts).toBe(4);
    expect(beforeLock.lockUntil).toBeUndefined();

    await request(app)
      .post('/api/auth/login')
      .set(mpHeaders())
      .send({ email: account.email, password: 'WrongPass999' })
      .expect(401);

    const afterLock = await User.findById(account.userId).lean();
    expect(afterLock.loginAttempts).toBe(5);
    expect(afterLock.lockUntil).toBeTruthy();
  });
});
