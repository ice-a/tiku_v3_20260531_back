import request from 'supertest';
import { startTestEnv, stopTestEnv } from '../contract/setup.js';

let app;
let User;
let Navigation;
let Affiliate;
let CareerPost;
let Comment;

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

async function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await startTestEnv();
  const appModule = await import('../../app.js');
  app = appModule.default;
  User = (await import('../../models/User.js')).default;
  Navigation = (await import('../../models/Navigation.js')).default;
  Affiliate = (await import('../../models/Affiliate.js')).default;
  CareerPost = (await import('../../models/CareerPost.js')).default;
  Comment = (await import('../../models/Comment.js')).default;
});

afterAll(async () => {
  await stopTestEnv();
});

describe('T0.5 navigation: like/views/categories/reorder', () => {
  let nav;
  let user;
  let admin;

  beforeAll(async () => {
    user = await registerAndLogin('user');
    admin = await registerAndLogin('admin');
    const created = await Navigation.create({
      name: 'GitHub',
      url: 'https://github.com',
      category: 'Tech',
      tags: ['code', 'platform'],
      status: 'approved',
    });
    nav = created.toObject();
  });

  it('increments likes on POST /:id/like', async () => {
    const res = await request(app)
      .post(`/api/navigations/${nav._id}/like`)
      .set(await authHeader(user.accessToken))
      .expect(200);
    expect(res.body.data.likes).toBe(1);
    const after = await Navigation.findById(nav._id).lean();
    expect(after.stats.likes).toBe(1);
  });

  it('increments views on POST /:id/view', async () => {
    const res = await request(app)
      .post(`/api/navigations/${nav._id}/view`)
      .set(await authHeader(user.accessToken))
      .expect(200);
    expect(res.body.data.views).toBe(1);
  });

  it('returns category list with counts', async () => {
    await Navigation.create({
      name: 'Stack Overflow',
      url: 'https://stackoverflow.com',
      category: 'Tech',
      status: 'approved',
    });
    await Navigation.create({
      name: 'MDN',
      url: 'https://developer.mozilla.org',
      category: 'Docs',
      status: 'approved',
    });

    const res = await request(app)
      .get('/api/navigations/categories')
      .expect(200);

    expect(res.body.success).toBe(true);
    const cats = res.body.data.categories;
    const tech = cats.find((c) => c.name === 'Tech');
    const docs = cats.find((c) => c.name === 'Docs');
    expect(tech.count).toBeGreaterThanOrEqual(2);
    expect(docs.count).toBe(1);
  });

  it('reorder works for admin and is rejected for non-admin', async () => {
    const nav2 = await Navigation.create({
      name: 'Reddit',
      url: 'https://reddit.com',
      category: 'News',
      status: 'approved',
    });

    const orders = [
      { id: String(nav._id), order: 10 },
      { id: String(nav2._id), order: 5 },
    ];

    await request(app)
      .post('/api/navigations/reorder')
      .set(await authHeader(user.accessToken))
      .send({ orders })
      .expect(403);

    const res = await request(app)
      .post('/api/navigations/reorder')
      .set(await authHeader(admin.accessToken))
      .send({ orders })
      .expect(200);

    expect(res.body.data.modified).toBe(2);

    const a = await Navigation.findById(nav._id).lean();
    const b = await Navigation.findById(nav2._id).lean();
    expect(a.order).toBe(10);
    expect(b.order).toBe(5);
  });
});

describe('T0.5 affiliate: like/views/categories/reorder', () => {
  let aff;
  let user;
  let admin;

  beforeAll(async () => {
    user = await registerAndLogin('user');
    admin = await registerAndLogin('admin');
    const created = await Affiliate.create({
      name: 'Affiliate One',
      url: 'https://aff.example.com',
      category: 'Shopping',
      tags: ['discount'],
    });
    aff = created.toObject();
  });

  it('increments likes and views', async () => {
    await request(app)
      .post(`/api/affiliates/${aff._id}/like`)
      .set(await authHeader(user.accessToken))
      .expect(200);
    await request(app)
      .post(`/api/affiliates/${aff._id}/view`)
      .set(await authHeader(user.accessToken))
      .expect(200);

    const after = await Affiliate.findById(aff._id).lean();
    expect(after.stats.likes).toBe(1);
    expect(after.stats.views).toBe(1);
  });

  it('returns affiliate category list', async () => {
    const res = await request(app)
      .get('/api/affiliates/categories')
      .expect(200);

    expect(res.body.success).toBe(true);
    const cats = res.body.data.categories;
    expect(cats.find((c) => c.name === 'Shopping')).toBeTruthy();
  });

  it('reorder requires admin', async () => {
    const aff2 = await Affiliate.create({
      name: 'Affiliate Two',
      url: 'https://aff2.example.com',
      category: 'Service',
    });
    const orders = [
      { id: String(aff._id), order: 7 },
      { id: String(aff2._id), order: 3 },
    ];

    await request(app)
      .post('/api/affiliates/reorder')
      .set(await authHeader(user.accessToken))
      .send({ orders })
      .expect(403);

    const res = await request(app)
      .post('/api/affiliates/reorder')
      .set(await authHeader(admin.accessToken))
      .send({ orders })
      .expect(200);

    expect(res.body.data.modified).toBe(2);
  });
});

describe('T0.5 career posts: CRUD', () => {
  let author;
  let admin;
  let otherUser;
  let post;

  beforeAll(async () => {
    author = await registerAndLogin('user');
    admin = await registerAndLogin('admin');
    otherUser = await registerAndLogin('user');
  });

  it('rejects post creation without required fields', async () => {
    await request(app)
      .post('/api/career/posts')
      .set(await authHeader(author.accessToken))
      .send({ title: 'No content' })
      .expect(400);
  });

  it('creates a post as a regular user', async () => {
    const res = await request(app)
      .post('/api/career/posts')
      .set(await authHeader(author.accessToken))
      .send({
        title: 'How to ace system design',
        content: 'Long body...',
        category: 'interview',
        tags: ['system-design', 'interview'],
        summary: 'Tips for system design rounds',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.post.title).toBe('How to ace system design');
    post = res.body.data.post;
  });

  it('lists only published posts by default', async () => {
    const res = await request(app)
      .get('/api/career/posts')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.posts)).toBe(true);
    expect(res.body.data.posts.find((p) => p._id === post._id)).toBeTruthy();
  });

  it('filters by keyword (case-insensitive)', async () => {
    const res = await request(app)
      .get(`/api/career/posts?keyword=ACE`)
      .expect(200);

    expect(res.body.data.posts.find((p) => p._id === post._id)).toBeTruthy();
  });

  it('returns 404 for unknown post id', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await request(app)
      .get(`/api/career/posts/${fakeId}`)
      .expect(404);
  });

  it('gets a post by id and increments view counter', async () => {
    const res = await request(app)
      .get(`/api/career/posts/${post._id}`)
      .expect(200);

    expect(res.body.data.post._id).toBe(post._id);
    expect(res.body.data.post.stats.views).toBe(1);

    const after = await CareerPost.findById(post._id).lean();
    expect(after.stats.views).toBe(1);
  });

  it('author can update their own post', async () => {
    const res = await request(app)
      .put(`/api/career/posts/${post._id}`)
      .set(await authHeader(author.accessToken))
      .send({ title: 'Updated title' })
      .expect(200);

    expect(res.body.data.post.title).toBe('Updated title');
  });

  it('non-author non-admin cannot update', async () => {
    await request(app)
      .put(`/api/career/posts/${post._id}`)
      .set(await authHeader(otherUser.accessToken))
      .send({ title: 'Hijack' })
      .expect(403);
  });

  it('admin can update any post', async () => {
    const res = await request(app)
      .put(`/api/career/posts/${post._id}`)
      .set(await authHeader(admin.accessToken))
      .send({ summary: 'Admin override' })
      .expect(200);

    expect(res.body.data.post.summary).toBe('Admin override');
  });
});

describe('T0.5 career posts: like/unlike/comments', () => {
  let user;
  let otherUser;
  let post;

  beforeAll(async () => {
    user = await registerAndLogin('user');
    otherUser = await registerAndLogin('user');
    const created = await CareerPost.create({
      title: 'Likeable post',
      content: 'body',
      category: 'resume',
      author: user.userId,
    });
    post = created.toObject();
  });

  it('increments likes on POST /:id/like', async () => {
    const res = await request(app)
      .post(`/api/career/posts/${post._id}/like`)
      .set(await authHeader(user.accessToken))
      .expect(200);
    expect(res.body.data.likes).toBe(1);
  });

  it('decrements likes on POST /:id/unlike (floor at 0)', async () => {
    const res = await request(app)
      .post(`/api/career/posts/${post._id}/unlike`)
      .set(await authHeader(user.accessToken))
      .expect(200);
    expect(res.body.data.likes).toBe(0);

    const zero = await request(app)
      .post(`/api/career/posts/${post._id}/unlike`)
      .set(await authHeader(user.accessToken))
      .expect(200);
    expect(zero.body.data.likes).toBe(0);
  });

  it('requires content for comments', async () => {
    await request(app)
      .post(`/api/career/posts/${post._id}/comments`)
      .set(await authHeader(otherUser.accessToken))
      .send({})
      .expect(400);
  });

  it('adds a comment and updates the comments counter', async () => {
    const res = await request(app)
      .post(`/api/career/posts/${post._id}/comments`)
      .set(await authHeader(otherUser.accessToken))
      .send({ content: 'Great post!' })
      .expect(201);

    expect(res.body.data.comment.content).toBe('Great post!');

    const after = await CareerPost.findById(post._id).lean();
    expect(after.stats.comments).toBe(1);
  });

  it('lists comments for a post', async () => {
    await request(app)
      .post(`/api/career/posts/${post._id}/comments`)
      .set(await authHeader(user.accessToken))
      .send({ content: 'Another comment' })
      .expect(201);

    const res = await request(app)
      .get(`/api/career/posts/${post._id}/comments`)
      .expect(200);

    expect(res.body.data.comments.length).toBe(2);
    expect(res.body.data.total).toBe(2);
  });

  it('supports reply via parentId and rejects cross-post parent', async () => {
    const otherPost = await CareerPost.create({
      title: 'Other post',
      content: 'body',
      category: 'career',
      author: user.userId,
    });

    const parent = await Comment.create({
      postId: post._id,
      userId: user.userId,
      content: 'Parent comment',
    });

    const res = await request(app)
      .post(`/api/career/posts/${post._id}/comments`)
      .set(await authHeader(otherUser.accessToken))
      .send({ content: 'Reply!', parentId: String(parent._id) })
      .expect(201);

    expect(res.body.data.comment.parentId).toBe(String(parent._id));

    await request(app)
      .post(`/api/career/posts/${otherPost._id}/comments`)
      .set(await authHeader(otherUser.accessToken))
      .send({ content: 'Cross-post', parentId: String(parent._id) })
      .expect(400);
  });
});

describe('T0.5.3 career posts: favorite/unfavorite + getFavorites', () => {
  let user;
  let post;

  beforeAll(async () => {
    user = await registerAndLogin('user');
    const created = await CareerPost.create({
      title: 'Favorite me',
      content: 'body',
      category: 'interview',
      author: user.userId,
    });
    post = created.toObject();
  });

  it('rejects favorite without auth', async () => {
    await request(app)
      .post(`/api/career/posts/${post._id}/favorite`)
      .expect(401);
  });

  it('rejects favorite for unknown post', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await request(app)
      .post(`/api/career/posts/${fakeId}/favorite`)
      .set(await authHeader(user.accessToken))
      .expect(404);
  });

  it('favorites a post and increments stats.favorites', async () => {
    const res = await request(app)
      .post(`/api/career/posts/${post._id}/favorite`)
      .set(await authHeader(user.accessToken))
      .expect(201);
    expect(res.body.data.favorites).toBe(1);

    const after = await CareerPost.findById(post._id).lean();
    expect(after.stats.favorites).toBe(1);
  });

  it('rejects duplicate favorite', async () => {
    await request(app)
      .post(`/api/career/posts/${post._id}/favorite`)
      .set(await authHeader(user.accessToken))
      .expect(400);
  });

  it('unfavorites and floors at 0', async () => {
    const res = await request(app)
      .post(`/api/career/posts/${post._id}/unfavorite`)
      .set(await authHeader(user.accessToken))
      .expect(200);
    expect(res.body.data.favorites).toBe(0);

    await request(app)
      .post(`/api/career/posts/${post._id}/unfavorite`)
      .set(await authHeader(user.accessToken))
      .expect(404);
  });

  it('favorites flow: 2 users, mixed like + favorite', async () => {
    const other = await registerAndLogin('user');

    await request(app)
      .post(`/api/career/posts/${post._id}/favorite`)
      .set(await authHeader(user.accessToken))
      .expect(201);
    await request(app)
      .post(`/api/career/posts/${post._id}/favorite`)
      .set(await authHeader(other.accessToken))
      .expect(201);

    const after = await CareerPost.findById(post._id).lean();
    expect(after.stats.favorites).toBe(2);

    await request(app)
      .post(`/api/career/posts/${post._id}/like`)
      .set(await authHeader(other.accessToken))
      .expect(200);

    const mixed = await CareerPost.findById(post._id).lean();
    expect(mixed.stats.likes).toBe(1);
    expect(mixed.stats.favorites).toBe(2);
  });

  it('GET /api/users/favorites?itemType=careerPost returns the post', async () => {
    const res = await request(app)
      .get('/api/users/favorites?itemType=careerPost')
      .set(await authHeader(user.accessToken))
      .expect(200);

    expect(res.body.success).toBe(true);
    const favs = res.body.data.favorites;
    expect(favs.length).toBe(1);
    expect(favs[0].itemType).toBe('careerPost');
    expect(favs[0].title).toBe('Favorite me');
  });
});
