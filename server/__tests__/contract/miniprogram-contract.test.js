import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { startTestEnv, stopTestEnv, clearTestData } from './setup.js';

let app;
let Question;
let Navigation;
let Affiliate;
let User;
let seededQuestionId;
let seededUserId;
let seededUserToken;

const clientId = 'mp_l1a2b3c4_abcdef0123';
let timestamp;
let nonce;

function buildMpHeaders(extra = {}) {
  return {
    'X-Requested-With': 'MiniProgram',
    'X-MP-Client': clientId,
    'X-MP-Timestamp': String(timestamp),
    'X-MP-Nonce': nonce,
    ...extra,
  };
}

async function seed() {
  await clearTestData();

  const user = await User.create({
    username: 'mpcontract',
    email: 'mpcontract@example.com',
    password: 'secret123',
    role: 'user',
    emailVerified: true,
  });
  seededUserId = String(user._id);

  const { generateAccessToken } = await import('../../utils/token.js');
  seededUserToken = generateAccessToken({ userId: seededUserId, role: 'user' });

  const nav = await Navigation.create({
    name: 'Sample Nav',
    url: 'https://example.com',
    category: 'Tools',
    status: 'approved',
  });

  await Navigation.create({
    name: 'Hidden Nav',
    url: 'https://hidden.example.com',
    category: 'Hidden',
    status: 'pending',
  });

  await Affiliate.create({
    name: 'Sample Aff',
    url: 'https://aff.example.com',
    category: 'Promo',
  });

  const q = await Question.create({
    text: 'Sample question text for contract test',
    answer: 'This is the full long answer that exceeds thirty six characters indeed',
    category: 'Backend',
    difficulty: 'medium',
    tags: ['node', 'test'],
    status: 'approved',
  });
  seededQuestionId = String(q._id);
}

beforeAll(async () => {
  await startTestEnv();
  const appModule = await import('../../app.js');
  app = appModule.default;
  Question = (await import('../../models/Question.js')).default;
  Navigation = (await import('../../models/Navigation.js')).default;
  Affiliate = (await import('../../models/Affiliate.js')).default;
  User = (await import('../../models/User.js')).default;
});

afterAll(async () => {
  await stopTestEnv();
});

beforeEach(async () => {
  timestamp = Date.now();
  nonce = 'abcdef0123';
  await seed();
});

describe('miniprogram guard', () => {
  it('rejects when X-Requested-With header is missing', async () => {
    const res = await request(app).get('/api/mp/home');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error).toContain('Invalid client');
  });

  it('rejects when X-Requested-With is not MiniProgram', async () => {
    const res = await request(app)
      .get('/api/mp/home')
      .set('X-Requested-With', 'Browser')
      .set('X-MP-Client', clientId)
      .set('X-MP-Timestamp', String(timestamp))
      .set('X-MP-Nonce', nonce);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Invalid client');
  });

  it('rejects when X-MP-Client is malformed', async () => {
    const res = await request(app)
      .get('/api/mp/home')
      .set('X-Requested-With', 'MiniProgram')
      .set('X-MP-Client', 'bad')
      .set('X-MP-Timestamp', String(timestamp))
      .set('X-MP-Nonce', nonce);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Invalid client id');
  });

  it('rejects when timestamp is out of window', async () => {
    const stale = Date.now() - 10 * 60 * 1000;
    const res = await request(app)
      .get('/api/mp/home')
      .set('X-Requested-With', 'MiniProgram')
      .set('X-MP-Client', clientId)
      .set('X-MP-Timestamp', String(stale))
      .set('X-MP-Nonce', nonce);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Invalid request timestamp');
  });

  it('rejects when nonce is too short', async () => {
    const res = await request(app)
      .get('/api/mp/home')
      .set('X-Requested-With', 'MiniProgram')
      .set('X-MP-Client', clientId)
      .set('X-MP-Timestamp', String(timestamp))
      .set('X-MP-Nonce', 'abc');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Invalid request nonce');
  });

  it('sets no-store cache and noindex headers on success', async () => {
    const res = await request(app).get('/api/mp/home').set(buildMpHeaders());
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['x-robots-tag']).toContain('noindex');
  });
});

describe('GET /api/mp/home', () => {
  it('returns stats, latest questions, navigations, affiliates with expected shape', async () => {
    const res = await request(app).get('/api/mp/home').set(buildMpHeaders());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { data } = res.body;
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.totalQuestions).toBe('number');
    expect(typeof data.stats.totalNavigations).toBe('number');
    expect(typeof data.stats.totalAffiliates).toBe('number');

    expect(Array.isArray(data.latestQuestions)).toBe(true);
    expect(data.latestQuestions.length).toBeGreaterThan(0);
    const q = data.latestQuestions[0];
    expect(q).toHaveProperty('_id');
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('category');
    expect(q).toHaveProperty('difficulty');

    expect(Array.isArray(data.navigations)).toBe(true);
    expect(data.navigations.length).toBeGreaterThan(0);
    const nav = data.navigations[0];
    expect(nav).toHaveProperty('name');
    expect(nav).toHaveProperty('url');
    expect(nav).toHaveProperty('category');

    expect(Array.isArray(data.affiliates)).toBe(true);
    expect(data.affiliates.length).toBeGreaterThan(0);
    const aff = data.affiliates[0];
    expect(aff).toHaveProperty('name');
    expect(aff).toHaveProperty('url');
    expect(aff).toHaveProperty('category');
  });
});

describe('GET /api/mp/questions', () => {
  it('returns paginated list of approved questions', async () => {
    const res = await request(app)
      .get('/api/mp/questions?page=1&limit=10')
      .set(buildMpHeaders());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;
    expect(Array.isArray(data.questions)).toBe(true);
    expect(data.questions.length).toBeGreaterThan(0);
    expect(typeof data.total).toBe('number');
    expect(typeof data.page).toBe('number');
    expect(typeof data.limit).toBe('number');
  });

  it('caps limit at 20', async () => {
    for (let i = 0; i < 30; i += 1) {
      await Question.create({
        text: `extra question ${i}`,
        answer: `extra answer ${i}`,
        category: 'Filler',
        difficulty: 'easy',
        status: 'approved',
      });
    }
    const res = await request(app)
      .get('/api/mp/questions?page=1&limit=50')
      .set(buildMpHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(20);
    expect(res.body.data.questions.length).toBeLessThanOrEqual(20);
  });
});

describe('GET /api/mp/questions/:id', () => {
  it('returns question with answerPreview and accessLevel=public when unauthenticated', async () => {
    const res = await request(app)
      .get(`/api/mp/questions/${seededQuestionId}`)
      .set(buildMpHeaders());
    expect(res.status).toBe(200);
    const q = res.body.data.question;
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('category');
    expect(q).toHaveProperty('difficulty');
    expect(q).toHaveProperty('answerPreview');
    expect(typeof q.answerPreview).toBe('string');
    expect(q.accessLevel).toBe('public');
    expect(q.answer).toBeUndefined();
    expect(q.answerMasked).toBe(true);
  });

  it('returns full answer when authenticated', async () => {
    const res = await request(app)
      .get(`/api/mp/questions/${seededQuestionId}`)
      .set(buildMpHeaders({ Authorization: `Bearer ${seededUserToken}` }));
    expect(res.status).toBe(200);
    const q = res.body.data.question;
    expect(q.accessLevel).toBe('authenticated');
    expect(q.answerMasked).toBe(false);
    expect(typeof q.answer).toBe('string');
    expect(q.answer.length).toBeGreaterThan(36);
  });

  it('returns 404 error envelope for missing id', async () => {
    const res = await request(app)
      .get('/api/mp/questions/507f1f77bcf86cd799439011')
      .set(buildMpHeaders());
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('GET /api/mp/navigations', () => {
  it('returns navigations with name, url, category', async () => {
    const res = await request(app).get('/api/mp/navigations').set(buildMpHeaders());
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(Array.isArray(data.navigations)).toBe(true);
    expect(data.navigations.length).toBeGreaterThan(0);
    const n = data.navigations[0];
    expect(n).toHaveProperty('name');
    expect(n).toHaveProperty('url');
    expect(n).toHaveProperty('category');
  });
});

describe('GET /api/mp/affiliates', () => {
  it('returns affiliates with name, url, category', async () => {
    const res = await request(app).get('/api/mp/affiliates').set(buildMpHeaders());
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(Array.isArray(data.affiliates)).toBe(true);
    expect(data.affiliates.length).toBeGreaterThan(0);
    const a = data.affiliates[0];
    expect(a).toHaveProperty('name');
    expect(a).toHaveProperty('url');
    expect(a).toHaveProperty('category');
  });
});

describe('GET /api/mp/hitokoto', () => {
  it('returns object with at least text field', async () => {
    const res = await request(app).get('/api/mp/hitokoto').set(buildMpHeaders());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('text');
    expect(typeof res.body.data.text).toBe('string');
  });
});

describe('error envelope contract', () => {
  it('errors are returned as { success:false, error:String }', async () => {
    const res = await request(app)
      .get('/api/mp/questions/507f1f77bcf86cd799439011')
      .set(buildMpHeaders());
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false });
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });
});
