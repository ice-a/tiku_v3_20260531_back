import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  getNavigations,
  getNavigationById,
  createNavigation,
  submitNavigation,
  approveNavigation,
  rejectNavigation,
  updateNavigation,
  deleteNavigation,
  importNavigations,
  likeNavigation,
  incrementNavigationViews,
  getNavigationCategories,
  reorderNavigations,
} from '../controllers/navigations.js';

const router = Router();

// Public
router.get('/', getNavigations);
router.get('/categories', getNavigationCategories);
router.get('/:id', getNavigationById);

// User submission
router.post('/submit', auth, submitNavigation);

// Authenticated
router.post('/:id/like', auth, likeNavigation);
router.post('/:id/view', auth, incrementNavigationViews);

// Admin
router.post('/', auth, requireRole('admin'), createNavigation);
router.post('/import', auth, requireRole('admin'), upload.single('import'), importNavigations);
router.post('/reorder', auth, requireRole('admin'), reorderNavigations);
router.put('/:id/approve', auth, requireRole('admin'), approveNavigation);
router.put('/:id/reject', auth, requireRole('admin'), rejectNavigation);
router.put('/:id', auth, requireRole('admin'), updateNavigation);
router.delete('/:id', auth, requireRole('admin'), deleteNavigation);

export default router;
