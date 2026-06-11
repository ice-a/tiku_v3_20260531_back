import * as navigationsService from '../services/navigations.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getList = asyncHandler(async (req, res) => {
  const result = await navigationsService.getList(req.query);
  res.json({ success: true, data: result });
});

export const getById = asyncHandler(async (req, res) => {
  const navigation = await navigationsService.getById(req.params.id);
  res.json({ success: true, data: { navigation } });
});

export const create = asyncHandler(async (req, res) => {
  const navigation = await navigationsService.create(req.body);
  res.status(201).json({ success: true, data: { navigation } });
});

export const update = asyncHandler(async (req, res) => {
  const navigation = await navigationsService.update(req.params.id, req.body);
  res.json({ success: true, data: { navigation } });
});

export const deleteNav = asyncHandler(async (req, res) => {
  await navigationsService.remove(req.params.id);
  res.json({ success: true, message: 'Navigation deleted' });
});

export const like = asyncHandler(async (req, res) => {
  const result = await navigationsService.like(req.params.id);
  res.json({ success: true, data: result });
});

export const incrementViews = asyncHandler(async (req, res) => {
  const result = await navigationsService.incrementViews(req.params.id);
  res.json({ success: true, data: result });
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await navigationsService.getCategories();
  res.json({ success: true, data: { categories } });
});

export const reorder = asyncHandler(async (req, res) => {
  const result = await navigationsService.reorder(req.body.orders, req.user);
  res.json({ success: true, data: result });
});

export const getNavigations = getList;
export const getNavigationById = getById;
export const createNavigation = create;
export const updateNavigation = update;
export const deleteNavigation = deleteNav;
export const getNavigationCategories = getCategories;
export const likeNavigation = like;
export const incrementNavigationViews = incrementViews;
export const reorderNavigations = reorder;

export const submitNavigation = asyncHandler(async (req, res) => {
  const navigation = await navigationsService.submit(req.body, req.user._id);
  res.status(201).json({ success: true, data: { navigation } });
});

export const approveNavigation = asyncHandler(async (req, res) => {
  const navigation = await navigationsService.approve(req.params.id);
  res.json({ success: true, data: { navigation } });
});

export const rejectNavigation = asyncHandler(async (req, res) => {
  const navigation = await navigationsService.reject(req.params.id);
  res.json({ success: true, data: { navigation } });
});

export const importNavigations = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '请上传文件' });
  }
  const result = await navigationsService.bulkImport(req.file);
  res.json({ success: true, data: result });
});
