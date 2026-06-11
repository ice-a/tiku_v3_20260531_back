import * as adminService from '../services/admin.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getUsers(req.query);
  res.json({ success: true, data: result });
});

export const getUserById = asyncHandler(async (req, res) => {
  const result = await adminService.getUserById(req.params.id);
  res.json({ success: true, data: result });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await adminService.updateUser(req.params.id, req.body);
  res.json({ success: true, data: { user } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await adminService.deleteUser(req.params.id);
  res.json({ success: true, message: 'User deleted' });
});

export const getContentStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getContentStats();
  res.json({ success: true, data: stats });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.json({ success: true, data: stats });
});

export const getPendingContent = asyncHandler(async (req, res) => {
  const pending = await adminService.getPendingContent(req.query.type);
  res.json({ success: true, data: { pending } });
});

export const approveContent = asyncHandler(async (req, res) => {
  const result = await adminService.approveContent(req.params.type, req.params.id);
  res.json({ success: true, data: result });
});

export const rejectContent = asyncHandler(async (req, res) => {
  const result = await adminService.rejectContent(req.params.type, req.params.id);
  res.json({ success: true, data: result });
});

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await adminService.getSystemSettings();
  res.json({ success: true, data: { settings } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await adminService.updateSystemSettings(req.body);
  res.json({ success: true, data: { settings } });
});
