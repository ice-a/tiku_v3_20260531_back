import Navigation from '../models/Navigation.js';
import { readSpreadsheetRows } from '../utils/spreadsheet.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 获取导航列表（分页、搜索、筛选）
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

  const [navigations, total] = await Promise.all([
    Navigation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Navigation.countDocuments(filter)
  ]);

  return {
    navigations,
    total,
    page: pageNum,
    limit: limitNum
  };
}

/**
 * 获取导航详情
 */
export async function getById(id) {
  const navigation = await Navigation.findById(id).lean();
  if (!navigation) {
    const err = new Error('Navigation not found');
    err.statusCode = 404;
    throw err;
  }
  return navigation;
}

/**
 * 创建导航
 */
export async function create(data) {
  const { name, url, icon, category, tags } = data;

  if (!name || !url || !category) {
    const err = new Error('name, url and category are required');
    err.statusCode = 400;
    throw err;
  }

  const navigation = await Navigation.create({
    name,
    url,
    icon: icon || '',
    category,
    tags: tags || []
  });

  return navigation.toObject();
}

/**
 * 更新导航
 */
export async function update(id, data) {
  const { name, url, icon, category, tags } = data;

  const navigation = await Navigation.findById(id);
  if (!navigation) {
    const err = new Error('Navigation not found');
    err.statusCode = 404;
    throw err;
  }

  if (name !== undefined) navigation.name = name;
  if (url !== undefined) navigation.url = url;
  if (icon !== undefined) navigation.icon = icon;
  if (category !== undefined) navigation.category = category;
  if (tags !== undefined) navigation.tags = tags;

  await navigation.save();
  return navigation.toObject();
}

/**
 * 删除导航
 */
export async function remove(id) {
  const navigation = await Navigation.findByIdAndDelete(id);
  if (!navigation) {
    const err = new Error('Navigation not found');
    err.statusCode = 404;
    throw err;
  }
  return { message: 'Navigation deleted' };
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

      await Navigation.create({ name, url, icon, category, tags });
      imported++;
    } catch {
      failed++;
    }
  }

  return { imported, failed, errors };
}
