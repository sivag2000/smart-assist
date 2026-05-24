import { Router, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import prisma from './prisma';
import { authenticate as authenticateToken } from './middleware/authenticate';

const router = Router();

// Initiate Google OAuth client
const getOAuth2Client = () => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID || 'fake_client_id_for_dev',
    process.env.GOOGLE_CLIENT_SECRET || 'fake_client_secret_for_dev',
    'postmessage' // Matches frontend Google OAuth code redirect URI
  );
};

// 0. Check which Google services are connected for this user
router.get('/status', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const cred = await prisma.googleCredential.findUnique({ where: { userId } });
    const serverConfigured = !!(process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here');

    const scopes = cred?.grantedScopes ? cred.grantedScopes.split(' ') : [];
    res.json({
      connected: !!cred,
      serverConfigured,
      services: {
        calendar: scopes.some(s => s.includes('calendar')),
        drive:    scopes.some(s => s.includes('drive')),
        gmail:    scopes.some(s => s.includes('gmail')),
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 1. Exchange Auth Code for Google Tokens
router.post('/auth', authenticateToken, async (req: any, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;

    if (!code) {
      res.status(400).json({ error: 'Authorization code required' });
      return;
    }

    // Guard: make sure real credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
      res.status(500).json({ error: 'Google OAuth credentials are not configured on the server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env' });
      return;
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Accept granted scopes from request body (sent by frontend)
    const grantedScopes: string = req.body.scopes || tokens.scope || '';

    // Save or update credential in DB
    const expiryDate = tokens.expiry_date ? BigInt(tokens.expiry_date) : null;
    await prisma.googleCredential.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || undefined,
        expiryDate,
        grantedScopes,
      },
      create: {
        userId,
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || '',
        expiryDate,
        grantedScopes,
      }
    });

    // Auto-sync calendar if that scope was granted
    const syncedMessage = grantedScopes.includes('calendar') ? ' Calendar synced.' : '';
    res.json({ message: 'Google services authorized!' + syncedMessage });
  } catch (error: any) {
    console.error('Google OAuth Exchange Error:', error);
    res.status(500).json({ error: 'Failed to exchange Google authorization code: ' + error.message });
  }
});

// 2. Sync Google Calendar Events to local DB
router.post('/sync', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    // Retrieve credentials
    const credentials = await prisma.googleCredential.findUnique({
      where: { userId }
    });

    if (!credentials) {
      res.status(400).json({ error: 'Google Calendar not authorized. Please sync your account first.' });
      return;
    }

    // Initialize OAuth client
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken || undefined,
      expiry_date: credentials.expiryDate ? Number(credentials.expiryDate) : undefined,
    });

    // Check if access token is expired, if so refresh it
    let accessToken = credentials.accessToken;
    const now = Date.now();
    if (credentials.expiryDate && Number(credentials.expiryDate) <= now && credentials.refreshToken) {
      const refreshed = await oauth2Client.refreshAccessToken();
      accessToken = refreshed.credentials.access_token || accessToken;
      
      // Update DB with refreshed token
      await prisma.googleCredential.update({
        where: { userId },
        data: {
          accessToken,
          expiryDate: refreshed.credentials.expiry_date ? BigInt(refreshed.credentials.expiry_date) : credentials.expiryDate,
        }
      });
    }

    // Fetch upcoming events from Google Calendar (Next 30 days)
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await axios.get(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        }
      }
    );

    const googleEvents = response.data.items || [];

    // Sync to local DB
    for (const gEvent of googleEvents) {
      if (!gEvent.start?.dateTime && !gEvent.start?.date) continue;

      const startTime = new Date(gEvent.start.dateTime || gEvent.start.date);
      const endTime = gEvent.end?.dateTime || gEvent.end?.date ? new Date(gEvent.end.dateTime || gEvent.end.date) : null;

      await prisma.event.upsert({
        where: { googleEventId: gEvent.id },
        update: {
          title: gEvent.summary || 'No Title',
          startTime,
          endTime,
          location: gEvent.location || null,
          description: gEvent.description || null,
          isSynced: true,
        },
        create: {
          userId,
          googleEventId: gEvent.id,
          title: gEvent.summary || 'No Title',
          startTime,
          endTime,
          location: gEvent.location || null,
          description: gEvent.description || null,
          isSynced: true,
        }
      });
    }

    res.json({ message: `Successfully synced ${googleEvents.length} events!` });
  } catch (error: any) {
    console.error('Google Calendar Sync Error:', error.message);
    res.status(500).json({ error: 'Failed to sync Google Calendar: ' + error.message });
  }
});

// 3. Get User Events (Both local and Google-synced)
router.get('/events', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const events = await prisma.event.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' }
    });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch events: ' + error.message });
  }
});

// 4. Create Local Event (Local planner fallback)
router.post('/local', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { title, startTime, endTime, location, description } = req.body;

    if (!title || !startTime) {
      res.status(400).json({ error: 'Title and startTime are required' });
      return;
    }

    const event = await prisma.event.create({
      data: {
        userId,
        title,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location: location || null,
        description: description || null,
        isSynced: false
      }
    });

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create event: ' + error.message });
  }
});

// 5. Get Today's Events (Utility endpoint for AI Service integration)
router.get('/today', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: {
        userId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch today\'s events: ' + error.message });
  }
});

export default router;
