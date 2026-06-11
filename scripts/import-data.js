import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import User from '../server/models/User.js';
import Question from '../server/models/Question.js';
import Navigation from '../server/models/Navigation.js';
import Affiliate from '../server/models/Affiliate.js';

const MONGODB_URI = process.env.MONGODB_URI;

function convertExtJSON(obj) {
  if (obj === null || obj === undefined) return obj;
  if (obj.$oid) return new mongoose.Types.ObjectId(obj.$oid);
  if (obj.$date) return new Date(obj.$date);
  if (Array.isArray(obj)) return obj.map(convertExtJSON);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '_id') continue;
      out[k] = convertExtJSON(v);
    }
    return out;
  }
  return obj;
}

function loadJSON(filename) {
  const raw = readFileSync(join(__dirname, filename), 'utf-8');
  return JSON.parse(raw).map(convertExtJSON);
}

async function seed() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功\n');

    await Promise.all([
      User.deleteMany({}),
      Question.deleteMany({}),
      Navigation.deleteMany({}),
      Affiliate.deleteMany({}),
    ]);
    console.log('已清空所有集合');

    // 1. 创建管理员
    const admin = await User.create({
      username: 'leemuzi',
      email: 'TiKuService@104303.xyz',
      password: 'lideshanhl0225',
      role: 'admin',
      nickname: '超级管理员',
      bio: '系统管理员，负责平台运营与内容审核。',
      emailVerified: true,
    });
    console.log(`创建管理员: ${admin.username}`);

    // 2. 导入题目
    console.log('\n导入题目...');
    const questionsRaw = loadJSON('questions.json');
    let imported = 0;
    const BATCH = 500;
    for (let i = 0; i < questionsRaw.length; i += BATCH) {
      const batch = questionsRaw.slice(i, i + BATCH).map(q => ({
        ...q,
        uploadedBy: admin._id,
        approvedBy: admin._id,
        status: q.status || 'approved',
        tags: q.tags || [],
        stats: q.stats || { views: 0, attempts: 0, correctAttempts: 0 },
      }));
      const r = await Question.insertMany(batch, { ordered: false }).catch(() => []);
      imported += r.length;
    }
    console.log(`导入 ${imported} 道题目`);

    // 3. 导入导航
    console.log('导入导航...');
    const navsRaw = loadJSON('nav_check.json');
    let navImported = 0;
    for (let i = 0; i < navsRaw.length; i += BATCH) {
      const batch = navsRaw.slice(i, i + BATCH).map(n => ({
        ...n,
        uploadedBy: admin._id,
        status: n.status || 'approved',
        tags: n.tags || [],
      }));
      const r = await Navigation.insertMany(batch, { ordered: false }).catch(() => []);
      navImported += r.length;
    }
    console.log(`导入 ${navImported} 个导航`);

    // 4. 导入联盟链接
    console.log('导入联盟链接...');
    const affsRaw = loadJSON('aff.json');
    let affImported = 0;
    for (let i = 0; i < affsRaw.length; i += BATCH) {
      const batch = affsRaw.slice(i, i + BATCH).map(a => ({
        ...a,
        tags: a.tags || [],
      }));
      const r = await Affiliate.insertMany(batch, { ordered: false }).catch(() => []);
      affImported += r.length;
    }
    console.log(`导入 ${affImported} 个联盟链接`);

    console.log('\n✅ 数据导入完成！');
    console.log(`  管理员: ${admin.username} / lideshanhl0225`);
    console.log(`  题目: ${imported} | 导航: ${navImported} | 联盟: ${affImported}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('导入失败:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
