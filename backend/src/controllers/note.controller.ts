import { Response } from 'express';
import prisma from '../prisma';

const parseTags = (raw: string): string[] => {
  try { return JSON.parse(raw); } catch { return []; }
};

export const createNote = async (req: any, res: Response) => {
  try {
    const { title, content, tags, isPinned } = req.body;
    const userId = req.user.userId;

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    const note = await prisma.note.create({
      data: {
        userId,
        title,
        content,
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        isPinned: isPinned ?? false,
      }
    });

    res.status(201).json({ ...note, tags: parseTags(note.tags) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create note: ' + error.message });
  }
};

export const getAllNotes = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { search, tag } = req.query as { search?: string; tag?: string };

    const notes = await prisma.note.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(search && {
          OR: [
            { title: { contains: search } },
            { content: { contains: search } },
          ]
        }),
        ...(tag && { tags: { contains: tag } }),
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    res.json(notes.map(n => ({ ...n, tags: parseTags(n.tags) })));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch notes: ' + error.message });
  }
};

export const getNoteById = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const note = await prisma.note.findFirst({ where: { id, userId, deletedAt: null } });
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json({ ...note, tags: parseTags(note.tags) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch note: ' + error.message });
  }
};

export const updateNote = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, content, tags, isPinned } = req.body;

    const existing = await prisma.note.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags: JSON.stringify(Array.isArray(tags) ? tags : []) }),
        ...(isPinned !== undefined && { isPinned }),
      }
    });

    res.json({ ...note, tags: parseTags(note.tags) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update note: ' + error.message });
  }
};

export const deleteNote = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const existing = await prisma.note.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    await prisma.note.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Note deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete note: ' + error.message });
  }
};
