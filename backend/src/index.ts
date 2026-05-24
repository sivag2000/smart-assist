import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './auth';
import aiRoutes from './ai';
import calendarRoutes from './calendar';
import taskRoutes from './routes/task.routes';
import noteRoutes from './routes/note.routes';
import reminderRoutes from './routes/reminder.routes';
import chatRoutes from './routes/chat.routes';
import profileRoutes from './routes/profile.routes';
import dashboardRoutes from './routes/dashboard.routes';
import searchRoutes from './routes/search.routes';
import { startReminderJob } from './jobs/reminder.job';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/ai', aiRoutes);
app.use('/calendar', calendarRoutes);
app.use('/tasks', taskRoutes);
app.use('/notes', noteRoutes);
app.use('/reminders', reminderRoutes);
app.use('/chat', chatRoutes);
app.use('/profile', profileRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/search', searchRoutes);

app.get('/', (req, res) => {
  res.send('SmartAssist Backend Running');
});

startReminderJob();

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
