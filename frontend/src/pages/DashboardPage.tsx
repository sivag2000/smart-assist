import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertTriangle, Bell, FileText, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';

interface DashboardData {
  tasks: { total: number; TODO: number; IN_PROGRESS: number; DONE: number };
  overdueTasks: any[];
  recentNotes: { id: string; title: string; updatedAt: string }[];
  upcomingReminders: any[];
}

const priorityColor = (p: string) => ({ HIGH: 'text-red-400 bg-red-400/10', MEDIUM: 'text-yellow-400 bg-yellow-400/10', LOW: 'text-green-400 bg-green-400/10' }[p] ?? 'text-text-muted bg-white/5');

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center text-text-muted">Loading...</div>;
  if (!data) return <div className="flex h-full items-center justify-center text-red-400">Failed to load dashboard.</div>;

  const statsCards = [
    { label: 'Total Tasks', value: data.tasks.total, icon: CheckSquare, color: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
    { label: 'To Do', value: data.tasks.TODO, icon: Clock, color: 'from-yellow-500/20 to-yellow-500/5', iconColor: 'text-yellow-400' },
    { label: 'In Progress', value: data.tasks.IN_PROGRESS, icon: TrendingUp, color: 'from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-400' },
    { label: 'Done', value: data.tasks.DONE, icon: CheckSquare, color: 'from-secondary/20 to-secondary/5', iconColor: 'text-secondary' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">Your personal overview</p>
        </div>

        {/* Task stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map(({ label, value, icon: Icon, color, iconColor }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`bg-gradient-to-br ${color} border border-border rounded-2xl p-4`}>
              <Icon className={`w-5 h-5 ${iconColor} mb-3`} />
              <div className="text-3xl font-bold text-white">{value}</div>
              <div className="text-xs text-text-muted mt-1">{label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Overdue tasks */}
          <div className="lg:col-span-2 bg-surface/50 border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Overdue Tasks
              </h2>
              <Link to="/tasks" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {data.overdueTasks.length === 0 ? (
              <p className="text-text-muted text-sm">No overdue tasks. Great job!</p>
            ) : (
              <div className="space-y-2">
                {data.overdueTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm text-text font-medium">{t.title}</p>
                      <p className="text-xs text-text-muted">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(t.priority)}`}>{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Upcoming reminders */}
            <div className="bg-surface/50 border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Next 24h
                </h2>
                <Link to="/reminders" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              {data.upcomingReminders.length === 0 ? (
                <p className="text-text-muted text-sm">No reminders soon.</p>
              ) : (
                <div className="space-y-2">
                  {data.upcomingReminders.slice(0, 3).map(r => (
                    <div key={r.id} className="py-1.5 border-b border-border last:border-0">
                      <p className="text-sm text-text font-medium">{r.title}</p>
                      <p className="text-xs text-text-muted">{new Date(r.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent notes */}
            <div className="bg-surface/50 border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-secondary" /> Recent Notes
                </h2>
                <Link to="/notes" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              {data.recentNotes.length === 0 ? (
                <p className="text-text-muted text-sm">No notes yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentNotes.map(n => (
                    <div key={n.id} className="py-1.5 border-b border-border last:border-0">
                      <p className="text-sm text-text font-medium">{n.title}</p>
                      <p className="text-xs text-text-muted">{new Date(n.updatedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
