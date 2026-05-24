import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getDashboard } from '../controllers/dashboard.controller';

const router = Router();

router.get('/', authenticate, getDashboard);

export default router;
