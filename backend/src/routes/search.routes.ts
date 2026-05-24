import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { globalSearch } from '../controllers/search.controller';

const router = Router();

router.get('/', authenticate, globalSearch);

export default router;
