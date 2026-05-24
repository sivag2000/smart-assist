import { Response } from 'express';
import prisma from '../prisma';

export const globalSearch = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const q = (req.query.q as string || '').trim();

    if (!q || q.length < 2) {
      res.json({ notes: [], tasks: [], reminders: [] });
      return;
    }

    const search = { contains: q };

    const [notes, tasks, reminders] = await Promise.all([
      // Search notes (exclude soft-deleted)
      prisma.note.findMany({
        where: {
          userId,
          deletedAt: null,
          OR: [
            { title:   { contains: q } },
            { content: { contains: q } },
            { tags:    { contains: q } },
          ],
        },
        select: { id: true, title: true, content: true, tags: true, isPinned: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Search tasks
      prisma.task.findMany({
        where: {
          userId,
          OR: [
            { title:       { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: { id: true, title: true, description: true, status: true, priority: true, dueDate: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Search reminders
      prisma.reminder.findMany({
        where: {
          userId,
          OR: [
            { title:   { contains: q } },
            { message: { contains: q } },
          ],
        },
        select: { id: true, title: true, message: true, remindAt: true, isSent: true },
        orderBy: { remindAt: 'asc' },
        take: 5,
      }),
    ]);

    res.json({ notes, tasks, reminders });
  } catch (error: any) {
    res.status(500).json({ error: 'Search failed: ' + error.message });
  }
};
