import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pin, Pencil, Trash2, X, Search, FileText, Tag, Mic, MicOff } from 'lucide-react';
import api from '../api';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  updatedAt: string;
}

const emptyForm = { title: '', content: '', tags: '', isPinned: false };

// ── Voice recognition setup ───────────────────────────────────────────────────
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const voiceSupported = !!SpeechRecognitionAPI;

export default function NotesPage() {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<Note | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  // Voice states
  const [listening, setListening]       = useState(false);
  const [interimText, setInterimText]   = useState('');
  const recognitionRef                  = useRef<any>(null);

  // ── Load notes ──────────────────────────────────────────────────────────────
  const load = (q?: string) => {
    const params = q ? { search: q } : {};
    api.get('/notes', { params })
      .then(r => setNotes(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []);
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Stop recognition when modal closes ─────────────────────────────────────
  useEffect(() => {
    if (!showModal) stopVoice();
  }, [showModal]);

  // ── Voice helpers ───────────────────────────────────────────────────────────
  const startVoice = () => {
    if (!voiceSupported) {
      alert('Your browser does not support voice input. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      // Append confirmed words to the note content
      if (final) {
        setForm(f => ({ ...f, content: f.content + final }));
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Voice error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone permissions in your browser and try again.');
      }
      stopVoice();
    };

    recognition.onend = () => {
      // Auto-restart if still in listening mode (handles Chrome's 60s limit)
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setInterimText('');
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText('');
  };

  const toggleVoice = () => (listening ? stopVoice() : startVoice());

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (n: Note) => {
    setEditing(n);
    setForm({ title: n.title, content: n.content, tags: n.tags.join(', '), isPinned: n.isPinned });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    stopVoice();
    setSaving(true);
    try {
      const tags    = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = { title: form.title, content: form.content, tags, isPinned: form.isPinned };
      if (editing) {
        await api.put(`/notes/${editing.id}`, payload);
      } else {
        await api.post('/notes', payload);
      }
      setShowModal(false);
      load(search || undefined);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await api.delete(`/notes/${id}`);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const togglePin = async (n: Note) => {
    await api.put(`/notes/${n.id}`, { isPinned: !n.isPinned });
    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, isPinned: !n.isPinned } : x));
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Notes</h1>
            <p className="text-text-muted text-sm mt-1">{notes.length} notes</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4" /> New Note
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        {/* Notes grid */}
        {loading ? (
          <p className="text-text-muted text-sm">Loading...</p>
        ) : notes.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{search ? 'No notes match your search.' : 'No notes yet. Create one!'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {notes.map(n => (
                <motion.div key={n.id}
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-surface/50 border border-border rounded-2xl p-4 flex flex-col gap-2 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white truncate flex-1">{n.title}</h3>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => togglePin(n)}
                        className={`p-1 rounded transition-colors ${n.isPinned ? 'text-primary' : 'text-text-muted hover:text-primary'}`}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(n)} className="p-1 text-text-muted hover:text-primary transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(n.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-3">{n.content}</p>
                  {n.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {n.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Tag className="w-3 h-3" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-text-muted mt-auto pt-1">{new Date(n.updatedAt).toLocaleDateString()}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-surface/95 border border-border p-6 rounded-3xl shadow-2xl">

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editing ? 'Edit Note' : 'New Note'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <input required placeholder="Title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-text placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />

              {/* Content + Voice Button */}
              <div className="relative">
                <textarea required placeholder="Write your note here, or click the mic to speak…"
                  value={form.content + (interimText ? interimText : '')}
                  onChange={e => {
                    // Allow manual edits while not listening; strip interim when typing
                    if (!listening) setForm(f => ({ ...f, content: e.target.value }));
                  }}
                  className={`w-full px-4 py-2.5 pr-12 bg-background/50 border rounded-xl text-text placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 resize-none h-36 transition-colors ${
                    listening
                      ? 'border-red-400/60 focus:ring-red-400/40 ring-2 ring-red-400/20'
                      : 'border-border focus:ring-primary/50'
                  }`} />

                {/* Mic button — top-right corner of textarea */}
                {voiceSupported && (
                  <button type="button" onClick={toggleVoice}
                    title={listening ? 'Stop recording' : 'Start voice input'}
                    className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      listening
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse'
                        : 'bg-white/5 text-text-muted hover:bg-primary/10 hover:text-primary border border-border'
                    }`}>
                    {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Live recording indicator */}
              {listening && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                  <span className="text-xs text-red-400 font-medium">
                    {interimText ? `Hearing: "${interimText}"` : 'Listening… speak now'}
                  </span>
                </motion.div>
              )}

              <input placeholder="Tags (comma separated, e.g. work, ideas)" value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-text placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPinned}
                  onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                  className="accent-primary w-4 h-4" />
                <span className="text-sm text-text-muted">Pin this note</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-text text-sm hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>

          </motion.div>
        </div>
      )}
    </div>
  );
}
