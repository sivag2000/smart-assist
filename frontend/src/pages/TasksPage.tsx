import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, CheckSquare } from 'lucide-react';
import api from '../api';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
}

const STATUSES = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE'];
const STATUS_LABEL: Record<string, string> = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
const priorityColor = (p: string) => ({ HIGH: 'text-red-400 bg-red-400/10 border-red-400/20', MEDIUM: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', LOW: 'text-green-400 bg-green-400/10 border-green-400/20' }[p] ?? '');
const statusColor = (s: string) => ({ TODO: 'text-text-muted bg-white/5', IN_PROGRESS: 'text-blue-400 bg-blue-400/10', DONE: 'text-secondary bg-secondary/10' }[s] ?? '');

const emptyForm = { title: '', description: '', priority: 'LOW', status: 'TODO', dueDate: '' };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/tasks').then(r => setTasks(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description ?? '', priority: t.priority, status: t.status, dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, dueDate: form.dueDate || undefined };
      if (editing) {
        await api.put(`/tasks/${editing.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleDone = async (t: Task) => {
    const newStatus = t.status === 'DONE' ? 'TODO' : 'DONE';
    await api.put(`/tasks/${t.id}`, { status: newStatus });
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
  };

  const filtered = filter === 'ALL' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tasks</h1>
            <p className="text-text-muted text-sm mt-1">{tasks.length} total · {tasks.filter(t => t.status === 'DONE').length} done</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
              {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {loading ? <p className="text-text-muted text-sm">Loading...</p> : filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No tasks here. Create one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map(t => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`bg-surface/50 border border-border rounded-xl p-4 flex items-start gap-3 ${t.status === 'DONE' ? 'opacity-60' : ''}`}>
                  <button onClick={() => toggleDone(t)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.status === 'DONE' ? 'bg-secondary border-secondary' : 'border-border hover:border-primary'}`}>
                    {t.status === 'DONE' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t.status === 'DONE' ? 'line-through text-text-muted' : 'text-text'}`}>{t.title}</p>
                    {t.description && <p className="text-xs text-text-muted mt-0.5 truncate">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColor(t.priority)}`}>{t.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
                      {t.dueDate && <span className="text-xs text-text-muted">Due {new Date(t.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(t)} className="p-1.5 text-text-muted hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface/95 border border-border p-6 rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editing ? 'Edit Task' : 'New Task'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <input required placeholder="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text placeholder:text-text-muted text-sm" />
              <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text placeholder:text-text-muted text-sm resize-none h-20" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider block mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {['LOW', 'MEDIUM', 'HIGH'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider block mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background/50 border border-border rounded-xl text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {['TODO', 'IN_PROGRESS', 'DONE'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider block mb-1">Due Date (optional)</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-border text-text text-sm hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
