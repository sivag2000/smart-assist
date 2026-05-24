import { Response } from 'express';
import prisma from '../prisma';

export const createReminder = async (req: any, res: Response) => {
  try {
    const { title, message, remindAt, isRepeat, repeatInterval } = req.body;
    const userId = req.user.userId;

    if (!title || !remindAt) {
      res.status(400).json({ error: 'Title and remindAt are required' });
      return;
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId,
        title,
        message: message || null,
        remindAt: new Date(remindAt),
        isRepeat: isRepeat ?? false,
        repeatInterval: repeatInterval || null,
      }
    });

    res.status(201).json(reminder);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create reminder: ' + error.message });
  }
};

export const getAllReminders = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    const reminders = await prisma.reminder.findMany({
      where: { userId, isSent: false, remindAt: { gte: new Date() } },
      orderBy: { remindAt: 'asc' },
    });

    res.json(reminders);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch reminders: ' + error.message });
  }
};

export const updateReminder = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, message, remindAt, isRepeat, repeatInterval } = req.body;

    const existing = await prisma.reminder.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(remindAt !== undefined && { remindAt: new Date(remindAt), isSent: false }),
        ...(isRepeat !== undefined && { isRepeat }),
        ...(repeatInterval !== undefined && { repeatInterval }),
      }
    });

    res.json(reminder);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update reminder: ' + error.message });
  }
};

export const deleteReminder = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const existing = await prisma.reminder.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    await prisma.reminder.delete({ where: { id } });
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete reminder: ' + error.message });
  }
};
