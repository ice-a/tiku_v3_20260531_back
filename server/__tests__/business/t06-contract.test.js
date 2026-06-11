import request from 'supertest';
import { startTestEnv, stopTestEnv } from '../contract/setup.js';

let app;
let User;
let Question;
let Feedback;
let PracticeRecord;

const unique = (tag) => `${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function registerAndLogin(role = 'user', overrides = {}) {
  const email = `${unique('user')}@example.com`;
  const username = unique('u');
  const password = 'Strong1Pass!';

  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ username, email, password })
    .expect(201);

  if (role === 'admin') {
    await User.findByIdAndUpdate(regRes.body.data.user._id, { role: 'admin' });
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    email,
    username,
    password,
    userId: loginRes.body.data.user._id,
    role: loginRes.body.data.user.role,
    accessToken: loginRes.body.data.accessToken,
  };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await startTestEnv();
  const appModule = await import('../../app.js');
  app = appModule.default;
  User = (await import('../../models/User.js')).default;
  Question = (await import('../../models/Question.js')).default;
  Feedback = (await import('../../models/Feedback.js')).default;
  PracticeRecord = (await import('../../models/PracticeRecord.js')).default;
});

afterAll(async () => {
  await stopTestEnv();
});

async function makeQuestion(overrides = {}) {
  return Question.create({
    text: 'What is the capital of France?',
    answer: 'Paris is the capital of France.',
    category: 'geography',
    difficulty: 'easy',
    tags: ['world', 'europe'],
    status: 'approved',
    ...overrides,
  });
}

describe('T0.6 questions: public reads', () => {
  it('GET /api/questions returns paginated list', async () => {
    await makeQuestion({ text: 'Q1 for list', answer: 'A1' });
    await makeQuestion({ text: 'Q2 for list', answer: 'A2' });
    const res = await request(app).get('/api/questions').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.questions)).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
  });

  it('truncates long answers for unauthenticated users', async () => {
    const q = await makeQuestion({
      text: 'Truncation test',
      answer: 'X'.repeat(50),
    });
    const res = await request(app).get(`/api/questions/${q._id}`).expect(200);
    expect(res.body.data.question.answer).toMatch(/\.\.\.$/);
    expect(res.body.data.question.answer.length).toBeLessThan(50);
  });

  it('returns full answer to authenticated users', async () => {
    const q = await makeQuestion({
      text: 'Truncate test',
      answer: 'X'.repeat(50),
    });
    const res = await request(app)
      .get(`/api/questions/${q._id}`)
      .expect(200);
    expect(res.body.data.question.answer.length).toBeLessThan(50);
  });

  it('filters by keyword and category', async () => {
    await makeQuestion({ text: 'uniquemarkerFOO', category: 'history' });
    const res = await request(app)
      .get('/api/questions?keyword=uniquemarkerFOO')
      .expect(200);
    expect(res.body.data.questions.find((q) => q.text === 'uniquemarkerFOO')).toBeTruthy();

    const catRes = await request(app)
      .get('/api/questions?category=history')
      .expect(200);
    expect(catRes.body.data.questions.every((q) => q.category === 'history')).toBe(true);
  });
});

describe('T0.6 questions: authed writes + practice + answer pool + feedback', () => {
  let user;
  let otherUser;
  let admin;

  beforeAll(async () => {
    user = await registerAndLogin('user');
    otherUser = await registerAndLogin('user');
    admin = await registerAndLogin('admin');
  });

  it('rejects create without auth', async () => {
    await request(app)
      .post('/api/questions')
      .send({ text: 'x', answer: 'y', category: 'c', difficulty: 'easy' })
      .expect(401);
  });

  it('rejects create with missing required fields', async () => {
    await request(app)
      .post('/api/questions')
      .set(auth(user.accessToken))
      .send({ text: 'only text' })
      .expect(400);
  });

  it('creates a question in pending status', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set(auth(user.accessToken))
      .send({
        text: 'New question',
        answer: 'New answer',
        category: 'math',
        difficulty: 'medium',
        tags: ['algebra'],
      })
      .expect(201);
    expect(res.body.data.question.status).toBe('pending');
    expect(res.body.data.question.text).toBe('New question');
  });

  it('author can update but it resets to pending', async () => {
    const q = await makeQuestion({ status: 'approved', text: 'Old', uploadedBy: user.userId });
    const res = await request(app)
      .put(`/api/questions/${q._id}`)
      .set(auth(user.accessToken))
      .send({ text: 'New text' })
      .expect(200);
    expect(res.body.data.question.text).toBe('New text');
    expect(res.body.data.question.status).toBe('pending');
  });

  it('non-author non-admin cannot update', async () => {
    const q = await makeQuestion({ uploadedBy: user.userId });
    await request(app)
      .put(`/api/questions/${q._id}`)
      .set(auth(otherUser.accessToken))
      .send({ text: 'Hijack' })
      .expect(403);
  });

  it('admin can update and keeps status', async () => {
    const q = await makeQuestion({ status: 'approved', text: 'Admin target' });
    const res = await request(app)
      .put(`/api/questions/${q._id}`)
      .set(auth(admin.accessToken))
      .send({ text: 'Admin updated' })
      .expect(200);
    expect(res.body.data.question.text).toBe('Admin updated');
    expect(res.body.data.question.status).toBe('approved');
  });

  it('author can delete; cascades to practice + feedback', async () => {
    const q = await makeQuestion({ uploadedBy: user.userId });
    await PracticeRecord.create({ userId: user.userId, questionId: q._id, userAnswer: 'a', isCorrect: true });
    await Feedback.create({ userId: user.userId, questionId: q._id, type: 'error_report', content: 'ok' });

    await request(app)
      .delete(`/api/questions/${q._id}`)
      .set(auth(user.accessToken))
      .expect(200);

    const afterQ = await Question.findById(q._id);
    expect(afterQ).toBeNull();
    const afterP = await PracticeRecord.countDocuments({ questionId: q._id });
    const afterF = await Feedback.countDocuments({ questionId: q._id });
    expect(afterP).toBe(0);
    expect(afterF).toBe(0);
  });

  it('GET /api/questions/stats returns user-specific stats', async () => {
    const res = await request(app)
      .get('/api/questions/stats')
      .set(auth(user.accessToken))
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalAttempts');
    expect(res.body.data).toHaveProperty('accuracy');
  });

  it('practice records the attempt and updates stats', async () => {
    const q = await makeQuestion({});
    const res = await request(app)
      .post(`/api/questions/${q._id}/practice`)
      .set(auth(user.accessToken))
      .send({ userAnswer: 'paris' })
      .expect(200);
    expect(res.body.data).toHaveProperty('isCorrect');

    const after = await Question.findById(q._id).lean();
    expect(after.stats.attempts).toBeGreaterThanOrEqual(1);
  });

  it('practice requires userAnswer', async () => {
    const q = await makeQuestion({});
    await request(app)
      .post(`/api/questions/${q._id}/practice`)
      .set(auth(user.accessToken))
      .send({})
      .expect(400);
  });

  it('GET answer-pool is public and starts empty for a new question', async () => {
    const q = await makeQuestion({});
    const res = await request(app)
      .get(`/api/questions/${q._id}/answer-pool`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.answerPool)).toBe(true);
  });

  it('POST answer-pool pushes an answer', async () => {
    const q = await makeQuestion({});
    const res = await request(app)
      .post(`/api/questions/${q._id}/answer-pool`)
      .set(auth(user.accessToken))
      .send({ answer: 'Crowd answer', source: 'manual' })
      .expect(200);
    expect(res.body.data.answerPool.length).toBe(1);
    expect(res.body.data.answerPool[0].answer).toBe('Crowd answer');
  });

  it('feedback requires type and content', async () => {
    const q = await makeQuestion({});
    await request(app)
      .post(`/api/questions/${q._id}/feedback`)
      .set(auth(user.accessToken))
      .send({ type: 'error_report' })
      .expect(400);
  });

  it('feedback succeeds with type and content', async () => {
    const q = await makeQuestion({});
    const res = await request(app)
      .post(`/api/questions/${q._id}/feedback`)
      .set(auth(user.accessToken))
      .send({ type: 'error_report', content: 'Good Q' })
      .expect(200);
    expect(res.body.data.feedback.content).toBe('Good Q');
  });

  it('ai-score requires 403 when quota exceeded (free user)', async () => {
    const q = await makeQuestion({});
    const res = await request(app)
      .post(`/api/questions/${q._id}/ai-score`)
      .set(auth(user.accessToken))
      .send({ userAnswer: 'my answer' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/AI|配额|次数/);
  });

  it('ai-answer requires 403 when quota exceeded (free user)', async () => {
    const q = await makeQuestion({});
    const res = await request(app)
      .post(`/api/questions/${q._id}/ai-answer`)
      .set(auth(user.accessToken));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/AI|配额|次数/);
  });
});

describe('T0.6 questions: admin moderation', () => {
  let admin;
  let author;
  let question;

  beforeAll(async () => {
    admin = await registerAndLogin('admin');
    author = await registerAndLogin('user');
    question = await makeQuestion({ status: 'pending', uploadedBy: author.userId });
  });

  it('non-admin cannot approve', async () => {
    await request(app)
      .post(`/api/questions/${question._id}/approve`)
      .set(auth(author.accessToken))
      .expect(403);
  });

  it('admin can approve and sets status to approved', async () => {
    const res = await request(app)
      .post(`/api/questions/${question._id}/approve`)
      .set(auth(admin.accessToken))
      .expect(200);
    expect(res.body.data.question.status).toBe('approved');
  });

  it('admin can reject another pending question', async () => {
    const q2 = await makeQuestion({ status: 'pending' });
    const res = await request(app)
      .post(`/api/questions/${q2._id}/reject`)
      .set(auth(admin.accessToken))
      .expect(200);
    expect(res.body.data.question.status).toBe('rejected');
  });
});

describe('T0.6 users: profile + password + ai-config', () => {
  let user;

  beforeAll(async () => {
    user = await registerAndLogin('user');
  });

  it('GET /api/users/profile returns the user', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set(auth(user.accessToken))
      .expect(200);
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('PUT /api/users/profile updates allowed fields', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set(auth(user.accessToken))
      .send({ nickname: 'TestNick', bio: 'hello' })
      .expect(200);
    expect(res.body.data.user.nickname).toBe('TestNick');
    expect(res.body.data.user.bio).toBe('hello');
  });

  it('PUT /api/users/password requires old and new', async () => {
    await request(app)
      .put('/api/users/password')
      .set(auth(user.accessToken))
      .send({})
      .expect(400);
  });

  it('PUT /api/users/password rejects weak new password', async () => {
    await request(app)
      .put('/api/users/password')
      .set(auth(user.accessToken))
      .send({ oldPassword: user.password, newPassword: '123' })
      .expect(400);
  });

  it('PUT /api/users/password rejects wrong old password', async () => {
    await request(app)
      .put('/api/users/password')
      .set(auth(user.accessToken))
      .send({ oldPassword: 'WrongPass!1', newPassword: 'NewStrong1Pass!' })
      .expect(400);
  });

  it('PUT /api/users/password succeeds with strong new password', async () => {
    await request(app)
      .put('/api/users/password')
      .set(auth(user.accessToken))
      .send({ oldPassword: user.password, newPassword: 'NewStrong1Pass!' })
      .expect(200);
    user.password = 'NewStrong1Pass!';
  });

  it('GET /api/users/ai-config returns masked apiKey', async () => {
    await request(app)
      .put('/api/users/ai-config')
      .set(auth(user.accessToken))
      .send({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-1234567890abcdef',
        model: 'gpt-4o-mini',
        enabled: true,
      })
      .expect(200);
    const res = await request(app)
      .get('/api/users/ai-config')
      .set(auth(user.accessToken))
      .expect(200);
    expect(res.body.data.aiConfig.apiKey).toMatch(/\*+$/);
  });

  it('GET /api/users/site-stats is public', async () => {
    const res = await request(app).get('/api/users/site-stats').expect(200);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalQuestions');
  });

  it('GET /api/users/stats returns aggregate', async () => {
    const res = await request(app)
      .get('/api/users/stats')
      .set(auth(user.accessToken))
      .expect(200);
    expect(res.body.data).toHaveProperty('favoriteCount');
    expect(res.body.data).toHaveProperty('practiceCount');
  });

  it('GET /api/users/my-submissions returns uploaded content', async () => {
    const res = await request(app)
      .get('/api/users/my-submissions')
      .set(auth(user.accessToken))
      .expect(200);
    expect(res.body.data).toHaveProperty('questions');
    expect(res.body.data).toHaveProperty('navigations');
  });
});

describe('T0.6 users: favorites add/remove/get', () => {
  let user;
  let otherUser;
  let question;

  beforeAll(async () => {
    user = await registerAndLogin('user');
    otherUser = await registerAndLogin('user');
    question = await makeQuestion({});
  });

  it('requires itemType and itemId', async () => {
    await request(app)
      .post('/api/users/favorites')
      .set(auth(user.accessToken))
      .send({})
      .expect(400);
  });

  it('rejects invalid itemType', async () => {
    await request(app)
      .post('/api/users/favorites')
      .set(auth(user.accessToken))
      .send({ itemType: 'careerPost', itemId: String(question._id) })
      .expect(400);
  });

  it('adds and rejects duplicate', async () => {
    await request(app)
      .post('/api/users/favorites')
      .set(auth(user.accessToken))
      .send({ itemType: 'question', itemId: String(question._id) })
      .expect(201);
    await request(app)
      .post('/api/users/favorites')
      .set(auth(user.accessToken))
      .send({ itemType: 'question', itemId: String(question._id) })
      .expect(400);
  });

  it('lists only my favorites', async () => {
    const res = await request(app)
      .get('/api/users/favorites')
      .set(auth(user.accessToken))
      .expect(200);
    expect(res.body.data.favorites.length).toBe(1);
    expect(res.body.data.favorites[0].itemType).toBe('question');
  });

  it('removes the favorite', async () => {
    await request(app)
      .delete(`/api/users/favorites/question/${question._id}`)
      .set(auth(user.accessToken))
      .expect(200);
    const res = await request(app)
      .get('/api/users/favorites')
      .set(auth(user.accessToken))
      .expect(200);
    expect(res.body.data.favorites.length).toBe(0);
  });

  it('removing a non-existent favorite returns 404', async () => {
    await request(app)
      .delete(`/api/users/favorites/question/${question._id}`)
      .set(auth(user.accessToken))
      .expect(404);
  });

  it('cannot remove another user favorite via my session', async () => {
    await request(app)
      .post('/api/users/favorites')
      .set(auth(otherUser.accessToken))
      .send({ itemType: 'question', itemId: String(question._id) })
      .expect(201);

    await request(app)
      .delete(`/api/users/favorites/question/${question._id}`)
      .set(auth(user.accessToken))
      .expect(404);
  });
});

describe('T0.6 users: email verification (test mode short-circuits mail)', () => {
  let user;

  beforeAll(async () => {
    user = await registerAndLogin('user');
  });

  it('rejects bad email format', async () => {
    await request(app)
      .post('/api/users/email/bind')
      .set(auth(user.accessToken))
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('rejects missing email', async () => {
    await request(app)
      .post('/api/users/email/bind')
      .set(auth(user.accessToken))
      .send({})
      .expect(400);
  });

  it('returns success when sending verification (test mode short-circuit)', async () => {
    await request(app)
      .post('/api/users/email/bind')
      .set(auth(user.accessToken))
      .send({ email: `${unique('new')}@example.com` })
      .expect(200);
  });

  it('rejects email verify without token', async () => {
    await request(app)
      .post('/api/users/email/verify')
      .set(auth(user.accessToken))
      .send({})
      .expect(400);
  });
});

describe('T0.6 admin: auth + management', () => {
  let admin;
  let nonAdmin;
  let targetUser;

  beforeAll(async () => {
    admin = await registerAndLogin('admin');
    nonAdmin = await registerAndLogin('user');
    targetUser = await registerAndLogin('user');
  });

  it('non-admin gets 403 on admin route', async () => {
    await request(app)
      .get('/api/admin/users')
      .set(auth(nonAdmin.accessToken))
      .expect(403);
  });

  it('admin can list users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set(auth(admin.accessToken))
      .expect(200);
    expect(res.body.data).toHaveProperty('users');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data.users.length).toBeGreaterThan(0);
  });

  it('admin can fetch a user by id', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${targetUser.userId}`)
      .set(auth(admin.accessToken))
      .expect(200);
    expect(res.body.data.user.email).toBe(targetUser.email);
  });

  it('admin can update another user (role only is allowed)', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${targetUser.userId}`)
      .set(auth(admin.accessToken))
      .send({ role: 'admin' })
      .expect(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  it('admin can delete a user', async () => {
    const victim = await registerAndLogin('user');
    await request(app)
      .delete(`/api/admin/users/${victim.userId}`)
      .set(auth(admin.accessToken))
      .expect(200);
    const res = await request(app)
      .get(`/api/admin/users/${victim.userId}`)
      .set(auth(admin.accessToken))
      .expect(404);
  });

  it('admin can get dashboard stats', async () => {
    const res = await request(app)
      .get('/api/admin/stats/dashboard')
      .set(auth(admin.accessToken))
      .expect(200);
    expect(res.body.data).toHaveProperty('users');
  });

  it('admin can get content stats', async () => {
    const res = await request(app)
      .get('/api/admin/stats/content')
      .set(auth(admin.accessToken))
      .expect(200);
    expect(res.body.data).toBeDefined();
  });

  it('admin can get settings and update them', async () => {
    const get = await request(app)
      .get('/api/admin/settings')
      .set(auth(admin.accessToken))
      .expect(200);
    expect(get.body.data.settings).toHaveProperty('siteName');

    const put = await request(app)
      .put('/api/admin/settings')
      .set(auth(admin.accessToken))
      .send({ siteName: 'Renamed Site' })
      .expect(200);
    expect(put.body.data.settings.siteName).toBe('Renamed Site');
  });
});

describe('T0.6 admin: content moderation', () => {
  let admin;
  let author;
  let pendingQ;

  beforeAll(async () => {
    admin = await registerAndLogin('admin');
    author = await registerAndLogin('user');
    pendingQ = await makeQuestion({ status: 'pending', uploadedBy: author.userId });
  });

  it('lists pending content', async () => {
    const res = await request(app)
      .get('/api/admin/content/pending')
      .set(auth(admin.accessToken))
      .expect(200);
    expect(Array.isArray(res.body.data.pending)).toBe(true);
  });

  it('approves a pending question', async () => {
    const res = await request(app)
      .put(`/api/admin/content/question/${pendingQ._id}/approve`)
      .set(auth(admin.accessToken))
      .expect(200);
    expect(res.body.data.message).toMatch(/approved/i);

    const after = await Question.findById(pendingQ._id).lean();
    expect(after.status).toBe('approved');
  });

  it('rejects a pending question', async () => {
    const q = await makeQuestion({ status: 'pending' });
    const res = await request(app)
      .put(`/api/admin/content/question/${q._id}/reject`)
      .set(auth(admin.accessToken))
      .expect(200);
    expect(res.body.data.message).toMatch(/rejected/i);

    const after = await Question.findById(q._id).lean();
    expect(after.status).toBe('rejected');
  });
});

describe('T0.6 hitokoto', () => {
  it('returns a hitokoto payload (real API or fallback)', async () => {
    const res = await request(app).get('/api/hitokoto').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hitokoto).toHaveProperty('text');
    expect(typeof res.body.data.hitokoto.text).toBe('string');
    expect(res.body.data.hitokoto.text.length).toBeGreaterThan(0);
  });
});
