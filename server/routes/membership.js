import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import * as membershipController from '../controllers/membership.js';

const router = Router();

router.get('/plans', membershipController.getPlanInfo);
router.get('/current', auth, membershipController.getMembership);
router.post('/order', auth, membershipController.createOrder);
router.get('/order/:id', auth, membershipController.getOrder);
router.post('/callback', membershipController.paymentCallback);

router.post('/admin/grant', auth, requireRole('admin'), membershipController.adminGrant);
router.get('/admin/orders', auth, requireRole('admin'), membershipController.adminOrders);

export default router;
