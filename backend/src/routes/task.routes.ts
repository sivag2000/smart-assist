import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createTask, getAllTasks, updateTask, deleteTask } from '../controllers/task.controller';

const router = Router();

router.post('/', authenticate, createTask);
router.get('/', authenticate, getAllTasks);
router.put('/:id', authenticate, updateTask);
router.delete('/:id', authenticate, deleteTask);

export default router;
