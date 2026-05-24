import { Response } from 'express';
import prisma from '../prisma';

export const getDashboard = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [allTasks, recentNotes, upcomingReminders] = await Promise.all([
      prisma.task.findMany({ where: { userId } }),
      prisma.note.findMany({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.reminder.findMany({
        where: { userId, isSent: false, remindAt: { gte: now, lte: next24h } },
        orderBy: { remindAt: 'asc' },
      }),
    ]);

    const taskCounts = {
      total: allTasks.length,
      TODO: allTasks.filter(t => t.status === 'TODO').length,
      IN_PROGRESS: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      DONE: allTasks.filter(t => t.status === 'DONE').length,
    };

    const overdueTasks = allTasks.filter(
      t => t.dueDate && t.dueDate < now && t.status !== 'DONE'
    );

    res.json({ tasks: taskCounts, overdueTasks, recentNotes, upcomingReminders });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard: ' + error.message });
  }
};
