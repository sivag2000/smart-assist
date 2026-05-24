import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createReminder, getAllReminders, updateReminder, deleteReminder } from '../controllers/reminder.controller';

const router = Router();

router.post('/', authenticate, createReminder);
router.get('/', authenticate, getAllReminders);
router.put('/:id', authenticate, updateReminder);
router.delete('/:id', authenticate, deleteReminder);

export default router;
