import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import * as adsController from '../controllers/ads.js';

const router = Router();

router.get('/slot', adsController.getAd);
router.post('/:id/click', adsController.trackClick);

router.get('/admin/list', auth, requireRole('admin'), adsController.getAdList);
router.post('/admin', auth, requireRole('admin'), adsController.createAd);
router.put('/admin/:id', auth, requireRole('admin'), adsController.updateAd);
router.delete('/admin/:id', auth, requireRole('admin'), adsController.deleteAd);

export default router;
