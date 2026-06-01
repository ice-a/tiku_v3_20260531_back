import { Router } from 'express';
import {
  miniprogramGuard,
  miniprogramLimiter,
  optionalMiniProgramAuth,
  requireMiniProgramAuth,
} from '../middleware/miniprogram.js';
import * as miniprogramController from '../controllers/miniprogram.js';

const router = Router();

router.use(miniprogramGuard, miniprogramLimiter);

router.get('/auth/session', requireMiniProgramAuth, miniprogramController.getSession);
router.get('/home', miniprogramController.getHome);
router.get('/questions', miniprogramController.getQuestions);
router.get('/questions/:id', optionalMiniProgramAuth, miniprogramController.getQuestionById);
router.get('/navigations', miniprogramController.getNavigations);
router.get('/affiliates', miniprogramController.getAffiliates);
router.get('/hitokoto', miniprogramController.getHitokoto);

export default router;
