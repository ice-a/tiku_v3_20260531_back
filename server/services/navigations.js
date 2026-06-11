import Navigation from '../models/Navigation.js';
import { readSpreadsheetRows } from '../utils/spreadsheet.js';
import { badRequest, forbidden, notFound } from '../utils/HttpError.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function getList(query = {}) {
  const {
    page = 1,
    limit = 20,
    keyword = '',
    category = '',
    tags = '',
    status = ''
  } = query;

  const filter = {};

  const conditions = [];
  if (status) {
    filter.status = status;
  } else {
    conditions.push({ $or: [{ status: 'approved' }, { status: { $exists: false } }] });
  }

  if (keyword) {
    conditions.push({
      $or: [
        { name: { $regex: escapeRegex(keyword), $options: 'i' } },
        { url: { $regex: escapeRegex(keyword), $options: 'i' } }
      ]
    });
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
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
      .populate('uploadedBy', 'username')
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

export async function getByUser(userId, query = {}) {
  const { page = 1, limit = 20 } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = { uploadedBy: userId };

  const [navigations, total] = await Promise.all([
    Navigation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Navigation.countDocuments(filter)
  ]);

  return { navigations, total, page: pageNum, limit: limitNum };
}

export async function getById(id) {
  const navigation = await Navigation.findById(id).lean();
  if (!navigation) {
    throw notFound('Navigation not found');
  }
  return navigation;
}

export async function create(data) {
  const { name, url, icon, category, tags } = data;

  if (!name || !url || !category) {
    throw badRequest('name, url and category are required');
  }

  const navigation = await Navigation.create({
    name,
    url,
    icon: icon || '',
    category,
    tags: tags || [],
    status: 'approved'
  });

  return navigation.toObject();
}

export async function submit(data, userId) {
  const { name, url, icon, category, tags } = data;

  if (!name || !url || !category) {
    throw badRequest('名称、链接和分类为必填项');
  }

  const navigation = await Navigation.create({
    name,
    url,
    icon: icon || '',
    category,
    tags: tags || [],
    status: 'pending',
    uploadedBy: userId
  });

  return navigation.toObject();
}

export async function approve(id) {
  const navigation = await Navigation.findById(id);
  if (!navigation) {
    throw notFound('Navigation not found');
  }
  navigation.status = 'approved';
  await navigation.save();
  return navigation.toObject();
}

export async function reject(id) {
  const navigation = await Navigation.findById(id);
  if (!navigation) {
    throw notFound('Navigation not found');
  }
  navigation.status = 'rejected';
  await navigation.save();
  return navigation.toObject();
}

export async function update(id, data) {
  const { name, url, icon, category, tags } = data;

  const navigation = await Navigation.findById(id);
  if (!navigation) {
    throw notFound('Navigation not found');
  }

  if (name !== undefined) navigation.name = name;
  if (url !== undefined) navigation.url = url;
  if (icon !== undefined) navigation.icon = icon;
  if (category !== undefined) navigation.category = category;
  if (tags !== undefined) navigation.tags = tags;

  await navigation.save();
  return navigation.toObject();
}

export async function remove(id) {
  const navigation = await Navigation.findByIdAndDelete(id);
  if (!navigation) {
    throw notFound('Navigation not found');
  }
  return { message: 'Navigation deleted' };
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

      await Navigation.create({ name, url, icon, category, tags, status: 'approved' });
      imported++;
    } catch {
      failed++;
    }
  }

  return { imported, failed, errors };
}

export async function like(id) {
  const navigation = await Navigation.findByIdAndUpdate(
    id,
    { $inc: { 'stats.likes': 1 } },
    { new: true }
  );
  if (!navigation) {
    throw notFound('Navigation not found');
  }
  return { likes: navigation.stats.likes };
}

export async function incrementViews(id) {
  const navigation = await Navigation.findByIdAndUpdate(
    id,
    { $inc: { 'stats.views': 1 } },
    { new: true, projection: { 'stats.views': 1 } }
  );
  if (!navigation) {
    throw notFound('Navigation not found');
  }
  return { views: navigation.stats.views };
}

export async function getCategories() {
  const result = await Navigation.aggregate([
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
  const result = await Navigation.bulkWrite(ops);
  return { modified: result.modifiedCount || 0 };
}
