import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import * as adminController from '../controllers/admin.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(auth, requireRole('admin'));

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Statistics
router.get('/stats/content', adminController.getContentStats);
router.get('/stats/dashboard', adminController.getDashboardStats);

// Content management
router.get('/content/pending', adminController.getPendingContent);
router.put('/content/:type/:id/approve', adminController.approveContent);
router.put('/content/:type/:id/reject', adminController.rejectContent);

// System settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

export default router;
