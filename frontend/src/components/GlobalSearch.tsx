import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, CheckSquare, Bell, X, Pin, Clock, AlertCircle } from 'lucide-react';
import api from '../api';

interface SearchResults {
  notes:     any[];
  tasks:     any[];
  reminders: any[];
}

const EMPTY: SearchResults = { notes: [], tasks: [], reminders: [] };

const priorityColor: Record<string, string> = {
  HIGH:   'text-red-400',
  MEDIUM: 'text-yellow-400',
  LOW:    'text-green-400',
};

const statusColor: Record<string, string> = {
  DONE:        'text-secondary',
  IN_PROGRESS: 'text-primary',
  TODO:        'text-text-muted',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: Props) {
  const navigate                      = useNavigate();
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState<SearchResults>(EMPTY);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState(0);
  const inputRef                      = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(EMPTY);
      setSelected(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.length < 2) { setResults(EMPTY); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/search', { params: { q: query } });
        setResults(data);
        setSelected(0);
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, open]);

  // Flatten results into a navigable list
  const allItems = [
    ...results.notes.map((n: any)     => ({ type: 'note',     data: n })),
    ...results.tasks.map((t: any)     => ({ type: 'task',     data: t })),
    ...results.reminders.map((r: any) => ({ type: 'reminder', data: r })),
  ];

  const totalCount = allItems.length;
  const hasResults = totalCount > 0;

  const goTo = useCallback((item: typeof allItems[0]) => {
    onClose();
    navigate(`/${item.type}s`);
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, totalCount - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && allItems[selected]) goTo(allItems[selected]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selected, totalCount, allItems, goTo, onClose]);

  const totalResults = results.notes.length + results.tasks.length + results.reminders.length;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] p-4"
          onClick={onClose}>

          {/* Backdrop */}
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">

            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Search className={`w-5 h-5 shrink-0 ${loading ? 'text-primary animate-pulse' : 'text-text-muted'}`} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search notes, tasks, reminders…"
                className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-sm"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults(EMPTY); }}
                  className="text-text-muted hover:text-text transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:flex items-center px-1.5 py-0.5 text-xs text-text-muted bg-white/5 border border-border rounded">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">

              {/* Empty state */}
              {!query && (
                <div className="py-12 text-center text-text-muted">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Start typing to search everything…</p>
                  <p className="text-xs mt-1 opacity-60">Notes · Tasks · Reminders</p>
                </div>
              )}

              {query.length >= 2 && !loading && !hasResults && (
                <div className="py-12 text-center text-text-muted">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No results for <span className="text-text">"{query}"</span></p>
                </div>
              )}

              {/* Notes section */}
              {results.notes.length > 0 && (
                <Section label="Notes" icon={<FileText className="w-3.5 h-3.5" />}>
                  {results.notes.map((note, i) => {
                    const idx = i;
                    return (
                      <ResultRow key={note.id} isSelected={selected === idx}
                        onClick={() => goTo({ type: 'note', data: note })}
                        onMouseEnter={() => setSelected(idx)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-white font-medium truncate">{note.title}</span>
                              {note.isPinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                            </div>
                            {note.content && (
                              <p className="text-xs text-text-muted truncate">{note.content}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-text-muted shrink-0">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {/* Tasks section */}
              {results.tasks.length > 0 && (
                <Section label="Tasks" icon={<CheckSquare className="w-3.5 h-3.5" />}>
                  {results.tasks.map((task, i) => {
                    const idx = results.notes.length + i;
                    return (
                      <ResultRow key={task.id} isSelected={selected === idx}
                        onClick={() => goTo({ type: 'task', data: task })}
                        onMouseEnter={() => setSelected(idx)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckSquare className="w-4 h-4 text-secondary shrink-0" />
                          <div className="min-w-0">
                            <span className={`text-sm font-medium truncate block ${
                              task.status === 'DONE' ? 'line-through text-text-muted' : 'text-white'
                            }`}>{task.title}</span>
                            {task.description && (
                              <p className="text-xs text-text-muted truncate">{task.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-medium ${priorityColor[task.priority] || 'text-text-muted'}`}>
                            {task.priority}
                          </span>
                          <span className={`text-xs ${statusColor[task.status] || 'text-text-muted'}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {/* Reminders section */}
              {results.reminders.length > 0 && (
                <Section label="Reminders" icon={<Bell className="w-3.5 h-3.5" />}>
                  {results.reminders.map((reminder, i) => {
                    const idx = results.notes.length + results.tasks.length + i;
                    return (
                      <ResultRow key={reminder.id} isSelected={selected === idx}
                        onClick={() => goTo({ type: 'reminder', data: reminder })}
                        onMouseEnter={() => setSelected(idx)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Bell className="w-4 h-4 text-yellow-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm text-white font-medium truncate block">{reminder.title}</span>
                            {reminder.message && (
                              <p className="text-xs text-text-muted truncate">{reminder.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-text-muted shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(reminder.remindAt).toLocaleDateString()}
                        </div>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {/* Footer hint */}
              {hasResults && (
                <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted">
                  <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-2">
                    <kbd className="px-1 py-0.5 bg-white/5 border border-border rounded">↑↓</kbd> navigate
                    <kbd className="px-1 py-0.5 bg-white/5 border border-border rounded">Enter</kbd> open
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider bg-white/2">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({ children, isSelected, onClick, onMouseEnter }:
  { children: React.ReactNode; isSelected: boolean; onClick: () => void; onMouseEnter: () => void }) {
  return (
    <button onClick={onClick} onMouseEnter={onMouseEnter}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
        isSelected ? 'bg-primary/10' : 'hover:bg-white/3'
      }`}>
      {children}
    </button>
  );
}
