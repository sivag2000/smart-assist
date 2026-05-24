import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createNote, getAllNotes, getNoteById, updateNote, deleteNote } from '../controllers/note.controller';

const router = Router();

router.post('/', authenticate, createNote);
router.get('/', authenticate, getAllNotes);
router.get('/:id', authenticate, getNoteById);
router.put('/:id', authenticate, updateNote);
router.delete('/:id', authenticate, deleteNote);

export default router;
