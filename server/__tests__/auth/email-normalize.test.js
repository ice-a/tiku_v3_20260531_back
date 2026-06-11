import request from 'supertest';
import { startTestEnv, stopTestEnv } from '../contract/setup.js';

let app;
let User;

const mpHeaders = () => ({
  'X-Requested-With': 'MiniProgram',
  'X-MP-Client': 'mp_test_email_001',
  'X-MP-Timestamp': String(Date.now()),
  'X-MP-Nonce': 'abcdef0123',
});

const uniqueEmail = (tag) => `${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@Example.com`;

beforeAll(async () => {
  await startTestEnv();
  const appModule = await import('../../app.js');
  app = appModule.default;
  User = (await import('../../models/User.js')).default;
});

afterAll(async () => {
  await stopTestEnv();
});

describe('T0.3 email normalization: register', () => {
  it('stores email lowercased and trimmed in DB', async () => {
    const raw = uniqueEmail('reg');
    const res = await request(app)
      .post('/api/auth/register')
      .set(mpHeaders())
      .send({
        username: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: `  ${raw.toUpperCase()}  `,
        password: 'Strong1Pass!',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    const stored = res.body.data.user.email;
    expect(stored).toBe(raw.toLowerCase());
    const dbUser = await User.findById(res.body.data.user._id).lean();
    expect(dbUser.email).toBe(raw.toLowerCase());
  });

  it('rejects registering two accounts whose email differs only in case', async () => {
    const base = uniqueEmail('dup');
    const upper = base.toUpperCase();

    await request(app)
      .post('/api/auth/register')
      .set(mpHeaders())
      .send({
        username: `u1_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: base,
        password: 'Strong1Pass!',
      })
      .expect(201);

    const dup = await request(app)
      .post('/api/auth/register')
      .set(mpHeaders())
      .send({
        username: `u2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: upper,
        password: 'Strong1Pass!',
      })
      .expect(400);

    expect(dup.body.success).toBe(false);
    expect(dup.body.error).toMatch(/email/i);
  });
});

describe('T0.3 email normalization: login', () => {
  it('login succeeds regardless of email case and surrounding whitespace', async () => {
    const email = uniqueEmail('login');
    const username = `ulogin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const password = 'Strong1Pass!';

    await request(app)
      .post('/api/auth/register')
      .set(mpHeaders())
      .send({ username, email, password })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .set(mpHeaders())
      .send({ email: `  ${email.toUpperCase()}  `, password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email.toLowerCase());
  });
});

describe('T0.3 email normalization: forgot password', () => {
  it('forgot-password finds the user by case-insensitive email', async () => {
    const email = uniqueEmail('forgot');
    const username = `uforgot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const password = 'Strong1Pass!';

    await request(app)
      .post('/api/auth/register')
      .set(mpHeaders())
      .send({ username, email, password })
      .expect(201);

    // In test env the email service short-circuits when SMTP is not configured,
    // so we should get a 200 success envelope.
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set(mpHeaders())
      .send({ email: `  ${email.toUpperCase()}  ` })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('forgot-password returns 404 for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set(mpHeaders())
      .send({ email: `  ${uniqueEmail('unknown').toUpperCase()}  ` })
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});
