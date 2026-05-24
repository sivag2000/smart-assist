import cron from 'node-cron';
import prisma from '../prisma';

export const startReminderJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const due = await prisma.reminder.findMany({
        where: { remindAt: { lte: now }, isSent: false },
      });

      for (const reminder of due) {
        console.log(`[Reminder] "${reminder.title}" for user ${reminder.userId}`);

        if (reminder.isRepeat && reminder.repeatInterval) {
          const next = new Date(reminder.remindAt);
          if (reminder.repeatInterval === 'DAILY') next.setDate(next.getDate() + 1);
          else if (reminder.repeatInterval === 'WEEKLY') next.setDate(next.getDate() + 7);
          else if (reminder.repeatInterval === 'MONTHLY') next.setMonth(next.getMonth() + 1);

          await prisma.reminder.update({ where: { id: reminder.id }, data: { remindAt: next } });
        } else {
          await prisma.reminder.update({ where: { id: reminder.id }, data: { isSent: true } });
        }
      }
    } catch (err) {
      console.error('[Reminder job error]', err);
    }
  });

  console.log('Reminder cron job started (runs every minute).');
};
