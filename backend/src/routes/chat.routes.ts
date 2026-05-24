import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { sendMessage, getChatHistory, clearHistory } from '../controllers/chat.controller';

const router = Router();

router.post('/message', authenticate, sendMessage);
router.get('/history', authenticate, getChatHistory);
router.delete('/history', authenticate, clearHistory);

export default router;
