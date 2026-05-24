import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';

export const getProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch profile: ' + error.message });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { ...(name !== undefined && { name }) },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update profile: ' + error.message });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'currentPassword and newPassword are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to change password: ' + error.message });
  }
};

export const getSettings = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch settings: ' + error.message });
  }
};

export const updateSettings = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { theme, language, notificationsEnabled, timezone } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(theme !== undefined && { theme }),
        ...(language !== undefined && { language }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
        ...(timezone !== undefined && { timezone }),
      },
      create: {
        userId,
        ...(theme !== undefined && { theme }),
        ...(language !== undefined && { language }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
        ...(timezone !== undefined && { timezone }),
      },
    });

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update settings: ' + error.message });
  }
};
