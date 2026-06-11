import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  getAffiliates,
  getAffiliateById,
  createAffiliate,
  updateAffiliate,
  deleteAffiliate,
  importAffiliates,
  likeAffiliate,
  incrementAffiliateViews,
  getAffiliateCategories,
  reorderAffiliates,
} from '../controllers/affiliates.js';

const router = Router();

// Public
router.get('/', getAffiliates);
router.get('/categories', getAffiliateCategories);
router.get('/:id', getAffiliateById);

// Authenticated
router.post('/:id/like', auth, likeAffiliate);
router.post('/:id/view', auth, incrementAffiliateViews);

// Admin
router.post('/', auth, requireRole('admin'), createAffiliate);
router.post('/import', auth, requireRole('admin'), upload.single('import'), importAffiliates);
router.post('/reorder', auth, requireRole('admin'), reorderAffiliates);
router.put('/:id', auth, requireRole('admin'), updateAffiliate);
router.delete('/:id', auth, requireRole('admin'), deleteAffiliate);

export default router;
