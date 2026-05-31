import Affiliate from '../models/Affiliate.js';
import { readSpreadsheetRows } from '../utils/spreadsheet.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 获取 AFF 列表（分页、搜索、筛选）
 */
export async function getList(query = {}) {
  const {
    page = 1,
    limit = 20,
    keyword = '',
    category = '',
    tags = ''
  } = query;

  const filter = {};

  if (keyword) {
    filter.$or = [
      { name: { $regex: escapeRegex(keyword), $options: 'i' } },
      { url: { $regex: escapeRegex(keyword), $options: 'i' } }
    ];
  }

  if (category) {
    filter.category = category;
  }

  if (tags) {
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      filter.tags = { $in: tagList };
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [affiliates, total] = await Promise.all([
    Affiliate.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Affiliate.countDocuments(filter)
  ]);

  return {
    affiliates,
    total,
    page: pageNum,
    limit: limitNum
  };
}

/**
 * 获取 AFF 详情
 */
export async function getById(id) {
  const affiliate = await Affiliate.findById(id).lean();
  if (!affiliate) {
    const err = new Error('Affiliate not found');
    err.status = 404;
    throw err;
  }
  return affiliate;
}

/**
 * 创建 AFF
 */
export async function create(data) {
  const { name, url, icon, category, tags } = data;

  if (!name || !url || !category) {
    const err = new Error('name, url and category are required');
    err.status = 400;
    throw err;
  }

  const affiliate = await Affiliate.create({
    name,
    url,
    icon: icon || '',
    category,
    tags: tags || []
  });

  return affiliate.toObject();
}

/**
 * 更新 AFF
 */
export async function update(id, data) {
  const { name, url, icon, category, tags } = data;

  const affiliate = await Affiliate.findById(id);
  if (!affiliate) {
    const err = new Error('Affiliate not found');
    err.status = 404;
    throw err;
  }

  if (name !== undefined) affiliate.name = name;
  if (url !== undefined) affiliate.url = url;
  if (icon !== undefined) affiliate.icon = icon;
  if (category !== undefined) affiliate.category = category;
  if (tags !== undefined) affiliate.tags = tags;

  await affiliate.save();
  return affiliate.toObject();
}

/**
 * 删除 AFF
 */
export async function remove(id) {
  const affiliate = await Affiliate.findByIdAndDelete(id);
  if (!affiliate) {
    const err = new Error('Affiliate not found');
    err.status = 404;
    throw err;
  }
  return { message: 'Affiliate deleted' };
}

/**
 * 批量导入（CSV/Excel）
 */
export async function bulkImport(file) {
  let imported = 0;
  let failed = 0;
  const errors = [];

  const rows = await readSpreadsheetRows(file);

  for (const row of rows) {
    try {
      const name = row.name || row.Name || row.名称 || '';
      const url = row.url || row.URL || row.链接 || '';
      const icon = row.icon || row.Icon || row.图标 || '';
      const category = row.category || row.Category || row.分类 || '';
      let tags = row.tags || row.Tags || row.标签 || [];

      if (typeof tags === 'string') {
        tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }

      if (!name || !url || !category) {
        failed++;
        errors.push(`Row skipped: missing required fields (name=${name}, url=${url}, category=${category})`);
        continue;
      }

      await Affiliate.create({ name, url, icon, category, tags });
      imported++;
    } catch {
      failed++;
    }
  }

  return { imported, failed, errors };
}
