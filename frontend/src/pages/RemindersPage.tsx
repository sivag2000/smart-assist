import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Bell, Trash2, Pencil, X, RefreshCw } from 'lucide-react';
import api from '../api';

interface Reminder {
  id: string;
  title: string;
  message?: string;
  remindAt: string;
  isRepeat: boolean;
  repeatInterval?: string;
  isSent: boolean;
}

const emptyForm = { title: '', message: '', remindAt: '', isRepeat: false, repeatInterval: '' };

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/reminders').then(r => setReminders(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (r: Reminder) => {
    setEditing(r);
    const local = new Date(r.remindAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    setForm({ title: r.title, message: r.message ?? '', remindAt: dateStr, isRepeat: r.isRepeat, repeatInterval: r.repeatInterval ?? '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        message: form.message || undefined,
        remindAt: new Date(form.remindAt).toISOString(),
        isRepeat: form.isRepeat,
        repeatInterval: form.isRepeat ? form.repeatInterval || undefined : undefined,
      };
      if (editing) {
        await api.put(`/reminders/${editing.id}`, payload);
      } else {
        await api.post('/reminders', payload);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reminder?')) return;
    await api.delete(`/reminders/${id}`);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Reminders</h1>
            <p className="text-text-muted text-sm mt-1">{reminders.length} upcoming</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4" /> New Reminder
          </button>
        </div>

        {loading ? <p className="text-text-muted text-sm">Loading...</p> : reminders.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No upcoming reminders. Create one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {reminders.map(r => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-surface/50 border border-border rounded-xl p-4 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{r.title}</p>
                    {r.message && <p className="text-xs text-text-muted mt-0.5">{r.message}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-text-muted">{formatDate(r.remindAt)}</span>
                      {r.isRepeat && (
                        <span className="flex items-center gap-1 text-xs text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                          <RefreshCw className="w-3 h-3" />{r.repeatInterval}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-text-muted hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface/95 border border-border p-6 rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editing ? 'Edit Reminder' : 'New Reminder'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <input required placeholder="Reminder title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-text placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <textarea placeholder="Message (optional)" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-text placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20" />
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider block mb-1">Date & Time</label>
                <input required type="datetime-local" value={form.remindAt} onChange={e => setForm(f => ({ ...f, remindAt: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isRepeat} onChange={e => setForm(f => ({ ...f, isRepeat: e.target.checked }))} className="accent-primary w-4 h-4" />
                <span className="text-sm text-text-muted">Repeat this reminder</span>
              </label>
              {form.isRepeat && (
                <select value={form.repeatInterval} onChange={e => setForm(f => ({ ...f, repeatInterval: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Select interval</option>
                  {['DAILY', 'WEEKLY', 'MONTHLY'].map(i => <option key={i}>{i}</option>)}
                </select>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-border text-text text-sm hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
