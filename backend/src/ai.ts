import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

router.post('/chat', async (req: any, res: any) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Valid messages array required' });
    }

    // Extract authorization token to find user context
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let calendarContext = '';

    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        // Query events from today onwards (next 7 days) for this user
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfRange = new Date();
        endOfRange.setDate(endOfRange.getDate() + 7);
        endOfRange.setHours(23, 59, 59, 999);

        const events = await prisma.event.findMany({
          where: {
            userId,
            startTime: {
              gte: startOfDay,
              lte: endOfRange
            }
          },
          orderBy: { startTime: 'asc' }
        });

        if (events.length > 0) {
          calendarContext = "\nUser's Synced Schedule/Upcoming Appointments (Next 7 days):\n" + events.map(e => {
            const dateStr = new Date(e.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `- [${dateStr} at ${timeStr}] ${e.title} ${e.location ? `at ${e.location}` : ''} ${e.description ? `(${e.description})` : ''}`;
          }).join('\n');
        } else {
          calendarContext = "\nUser's Synced Schedule/Upcoming Appointments (Next 7 days):\n- No appointments scheduled.";
        }
      } catch (err) {
        console.error('Failed to resolve user context for calendar:', err);
      }
    }

    // Proxy the request directly to the FastAPI service with calendar context
    const response = await axios.post(`${AI_SERVICE_URL}/chat`, { 
      messages,
      context: calendarContext
    });
    res.json(response.data);

  } catch (error: any) {
    console.error('AI Service Error:', error.message);
    res.status(500).json({ error: 'Failed to communicate with AI Service' });
  }
});

export default router;
