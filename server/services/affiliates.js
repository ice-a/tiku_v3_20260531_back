import Affiliate from '../models/Affiliate.js';
import { readSpreadsheetRows } from '../utils/spreadsheet.js';
import { badRequest, forbidden, notFound } from '../utils/HttpError.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export async function getById(id) {
  const affiliate = await Affiliate.findById(id).lean();
  if (!affiliate) {
    throw notFound('Affiliate not found');
  }
  return affiliate;
}

export async function create(data) {
  const { name, url, icon, category, tags } = data;

  if (!name || !url || !category) {
    throw badRequest('name, url and category are required');
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

export async function update(id, data) {
  const { name, url, icon, category, tags } = data;

  const affiliate = await Affiliate.findById(id);
  if (!affiliate) {
    throw notFound('Affiliate not found');
  }

  if (name !== undefined) affiliate.name = name;
  if (url !== undefined) affiliate.url = url;
  if (icon !== undefined) affiliate.icon = icon;
  if (category !== undefined) affiliate.category = category;
  if (tags !== undefined) affiliate.tags = tags;

  await affiliate.save();
  return affiliate.toObject();
}

export async function remove(id) {
  const affiliate = await Affiliate.findByIdAndDelete(id);
  if (!affiliate) {
    throw notFound('Affiliate not found');
  }
  return { message: 'Affiliate deleted' };
}

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

export async function like(id) {
  const affiliate = await Affiliate.findByIdAndUpdate(
    id,
    { $inc: { 'stats.likes': 1 } },
    { new: true }
  );
  if (!affiliate) {
    throw notFound('Affiliate not found');
  }
  return { likes: affiliate.stats.likes };
}

export async function incrementViews(id) {
  const affiliate = await Affiliate.findByIdAndUpdate(
    id,
    { $inc: { 'stats.views': 1 } },
    { new: true, projection: { 'stats.views': 1 } }
  );
  if (!affiliate) {
    throw notFound('Affiliate not found');
  }
  return { views: affiliate.stats.views };
}

export async function getCategories() {
  const result = await Affiliate.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return result.map((r) => ({ name: r._id, count: r.count }));
}

export async function reorder(orders, user) {
  if (!Array.isArray(orders)) {
    throw badRequest('orders must be an array');
  }
  if (user?.role !== 'admin') {
    throw forbidden('Only admins can reorder');
  }
  const ops = orders
    .filter((o) => o && o.id !== undefined && Number.isFinite(Number(o.order)))
    .map((o) => ({
      updateOne: {
        filter: { _id: o.id },
        update: { $set: { order: Number(o.order) } },
      },
    }));
  if (ops.length === 0) {
    return { modified: 0 };
  }
  const result = await Affiliate.bulkWrite(ops);
  return { modified: result.modifiedCount || 0 };
}
