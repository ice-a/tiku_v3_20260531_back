import { Router } from 'express';
import * as hitokotoController from '../controllers/hitokoto.js';

const router = Router();

router.get('/', hitokotoController.getRandomHitokoto);

export default router;
