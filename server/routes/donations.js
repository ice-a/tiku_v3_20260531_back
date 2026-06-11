import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as donationsController from '../controllers/donations.js';

const router = Router();

router.post('/', auth, donationsController.createDonation);
router.get('/wall', donationsController.getWall);
router.get('/stats', donationsController.getStats);
router.get('/ranking', donationsController.getRanking);

export default router;
