import * as affiliatesService from '../services/affiliates.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/HttpError.js';

export const getList = asyncHandler(async (req, res) => {
  const result = await affiliatesService.getList(req.query);
  res.json({ success: true, data: result });
});

export const getById = asyncHandler(async (req, res) => {
  const affiliate = await affiliatesService.getById(req.params.id);
  res.json({ success: true, data: { affiliate } });
});

export const create = asyncHandler(async (req, res) => {
  const affiliate = await affiliatesService.create(req.body);
  res.status(201).json({ success: true, data: { affiliate } });
});

export const update = asyncHandler(async (req, res) => {
  const affiliate = await affiliatesService.update(req.params.id, req.body);
  res.json({ success: true, data: { affiliate } });
});

export const deleteAff = asyncHandler(async (req, res) => {
  await affiliatesService.remove(req.params.id);
  res.json({ success: true, message: 'Affiliate deleted' });
});

export const like = asyncHandler(async (req, res) => {
  const result = await affiliatesService.like(req.params.id);
  res.json({ success: true, data: result });
});

export const incrementViews = asyncHandler(async (req, res) => {
  const result = await affiliatesService.incrementViews(req.params.id);
  res.json({ success: true, data: result });
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await affiliatesService.getCategories();
  res.json({ success: true, data: { categories } });
});

export const reorder = asyncHandler(async (req, res) => {
  const result = await affiliatesService.reorder(req.body.orders, req.user);
  res.json({ success: true, data: result });
});

export const getAffiliates = getList;
export const getAffiliateById = getById;
export const createAffiliate = create;
export const updateAffiliate = update;
export const deleteAffiliate = deleteAff;
export const getAffiliateCategories = getCategories;
export const likeAffiliate = like;
export const incrementAffiliateViews = incrementViews;
export const reorderAffiliates = reorder;

export const importAffiliates = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest('请上传文件');
  }
  const result = await affiliatesService.bulkImport(req.file);
  res.json({ success: true, data: result });
});
