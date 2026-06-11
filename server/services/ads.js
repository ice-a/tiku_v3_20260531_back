import Ad from '../models/Ad.js';
import { badRequest, notFound } from '../utils/HttpError.js';

export async function getAdBySlot(slot) {
  const now = new Date();
  const ad = await Ad.findOne({
    slot,
    active: true,
    $or: [
      { startAt: null, endAt: null },
      { startAt: { $lte: now }, endAt: null },
      { startAt: null, endAt: { $gte: now } },
      { startAt: { $lte: now }, endAt: { $gte: now } },
    ],
  }).sort({ priority: -1 });

  return ad || null;
}

export async function incrementClicks(adId) {
  await Ad.findByIdAndUpdate(adId, { $inc: { clicks: 1 } });
}

export async function createAd(data) {
  const existing = await Ad.findOne({ slot: data.slot });
  if (existing) throw badRequest('广告位已存在');
  return Ad.create(data);
}

export async function updateAd(id, data) {
  const ad = await Ad.findByIdAndUpdate(id, data, { new: true });
  if (!ad) throw notFound('广告不存在');
  return ad;
}

export async function deleteAd(id) {
  const ad = await Ad.findByIdAndDelete(id);
  if (!ad) throw notFound('广告不存在');
}

export async function getAdList(query = {}) {
  const { page = 1, limit = 50 } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [ads, total] = await Promise.all([
    Ad.find().sort({ slot: 1 }).skip(skip).limit(limitNum),
    Ad.countDocuments(),
  ]);

  return { ads, total, page: pageNum, limit: limitNum };
}
