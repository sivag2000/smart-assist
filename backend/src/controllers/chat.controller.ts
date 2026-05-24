import { Response } from 'express';
import axios from 'axios';
import prisma from '../prisma';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export const sendMessage = async (req: any, res: Response) => {
  try {
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content?.trim()) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    // Save the user's message
    await prisma.chatMessage.create({ data: { userId, role: 'USER', content } });

    // Load last 10 messages for context (already includes the one just saved)
    const history = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    history.reverse();

    const apiMessages = history.map(m => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Build calendar context for the AI
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfRange = new Date();
    endOfRange.setDate(endOfRange.getDate() + 7);
    endOfRange.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: { userId, startTime: { gte: startOfDay, lte: endOfRange } },
      orderBy: { startTime: 'asc' },
    });

    const calendarContext = events.length > 0
      ? '\nUser\'s Upcoming Schedule (Next 7 days):\n' + events.map(e => {
          const dateStr = new Date(e.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
          const timeStr = new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `- [${dateStr} at ${timeStr}] ${e.title}${e.location ? ` at ${e.location}` : ''}`;
        }).join('\n')
      : '\nUser\'s Upcoming Schedule (Next 7 days):\n- No appointments scheduled.';

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/chat`, {
      messages: apiMessages,
      context: calendarContext,
    });

    const responseText = aiResponse.data.response || 'No response received';

    const assistantMessage = await prisma.chatMessage.create({
      data: { userId, role: 'ASSISTANT', content: responseText },
    });

    res.json({ response: responseText, message: assistantMessage });
  } catch (error: any) {
    console.error('Chat error:', error.message);
    res.status(500).json({ error: 'Failed to process message: ' + error.message });
  }
};

export const getChatHistory = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch chat history: ' + error.message });
  }
};

export const clearHistory = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    await prisma.chatMessage.deleteMany({ where: { userId } });
    res.json({ message: 'Chat history cleared' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to clear history: ' + error.message });
  }
};
