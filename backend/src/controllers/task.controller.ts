import { Response } from 'express';
import prisma from '../prisma';

export const createTask = async (req: any, res: Response) => {
  try {
    const { title, description, priority, status, dueDate } = req.body;
    const userId = req.user.userId;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title,
        description: description || null,
        priority: priority || 'LOW',
        status: status || 'TODO',
        dueDate: dueDate ? new Date(dueDate) : null,
      }
    });

    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create task: ' + error.message });
  }
};

export const getAllTasks = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { status, priority } = req.query as { status?: string; priority?: string };

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tasks: ' + error.message });
  }
};

export const updateTask = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, description, priority, status, dueDate } = req.body;

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      }
    });

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update task: ' + error.message });
  }
};

export const deleteTask = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete task: ' + error.message });
  }
};
