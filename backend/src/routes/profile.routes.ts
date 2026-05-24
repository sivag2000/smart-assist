import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getProfile, updateProfile, changePassword, getSettings, updateSettings } from '../controllers/profile.controller';

const router = Router();

router.get('/', authenticate, getProfile);
router.put('/', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

export default router;
