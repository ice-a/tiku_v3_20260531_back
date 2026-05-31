import * as adminService from '../services/admin.js';

/**
 * GET /api/admin/users - User list
 */
export async function getUsers(req, res) {
  try {
    const result = await adminService.getUsers(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/users/:id - User detail
 */
export async function getUserById(req, res) {
  try {
    const result = await adminService.getUserById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/admin/users/:id - Update user
 */
export async function updateUser(req, res) {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: { user } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/admin/users/:id - Delete user
 */
export async function deleteUser(req, res) {
  try {
    await adminService.deleteUser(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/stats/content - Content statistics
 */
export async function getContentStats(req, res) {
  try {
    const stats = await adminService.getContentStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/stats/dashboard - Dashboard statistics
 */
export async function getDashboardStats(req, res) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/content/pending - Pending content
 */
export async function getPendingContent(req, res) {
  try {
    const pending = await adminService.getPendingContent(req.query.type);
    res.json({ success: true, data: { pending } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/admin/content/:type/:id/approve
 */
export async function approveContent(req, res) {
  try {
    const result = await adminService.approveContent(req.params.type, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/admin/content/:type/:id/reject
 */
export async function rejectContent(req, res) {
  try {
    const result = await adminService.rejectContent(req.params.type, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/settings - System settings
 */
export async function getSettings(req, res) {
  try {
    const settings = await adminService.getSystemSettings();
    res.json({ success: true, data: { settings } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/admin/settings - Update system settings
 */
export async function updateSettings(req, res) {
  try {
    const settings = await adminService.updateSystemSettings(req.body);
    res.json({ success: true, data: { settings } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}
