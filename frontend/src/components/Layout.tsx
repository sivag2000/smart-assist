import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BrainCircuit, MessageSquare, LayoutDashboard, CheckSquare,
  FileText, Bell, User, Calendar, LogOut, Plus, X,
  CheckCircle2, AlertCircle, HardDrive, Mail, Search
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api';
import GooglePermissionsModal from './GooglePermissionsModal';
import GlobalSearch from './GlobalSearch';
import FocusTimer from './FocusTimer';

const GOOGLE_CONFIGURED = !!(
  import.meta.env.VITE_GOOGLE_CLIENT_ID &&
  import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your_google_client_id_here'
);

const navItems = [
  { to: '/chat',      icon: MessageSquare,   label: 'Chat' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks' },
  { to: '/notes',     icon: FileText,        label: 'Notes' },
  { to: '/reminders', icon: Bell,            label: 'Reminders' },
];

interface GoogleServices {
  calendar: boolean;
  drive: boolean;
  gmail: boolean;
}

export default function Layout() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [services, setServices] = useState<GoogleServices>({ calendar: false, drive: false, gmail: false });
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // On mount: check Google status and show onboarding modal for new users
  useEffect(() => {
    api.get('/calendar/status').then(r => {
      const { connected, serverConfigured, services: svc } = r.data;
      setGoogleConnected(connected);
      setServices(svc ?? { calendar: false, drive: false, gmail: false });

      // Show modal only when: Google is configured on server + user hasn't connected yet
      // + they haven't explicitly skipped this session
      const skipped = localStorage.getItem('googleModalSkipped');
      if (serverConfigured && !connected && !skipped) {
        setShowPermissionsModal(true);
      }
    }).catch(() => {});
  }, []);

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLoading, setEventLoading] = useState(false);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Sidebar re-sync button (opens full modal again)
  const sidebarSync = useGoogleLogin({
    flow: 'auth-code',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ].join(' '),
    onSuccess: async (codeResponse) => {
      setSyncing(true);
      try {
        await api.post('/calendar/auth', { code: codeResponse.code });
        const { data } = await api.post('/calendar/sync');
        setGoogleConnected(true);
        setServices(s => ({ ...s, calendar: true }));
        alert(data.message || 'Google Calendar synced!');
      } catch (err: any) {
        alert('Sync failed: ' + (err.response?.data?.error || err.message));
      } finally {
        setSyncing(false);
      }
    },
    onError: (err) => {
      alert('Google sign-in failed: ' + (err.error_description || err.error || 'Popup closed'));
    },
  });

  const handleSyncClick = () => {
    if (!GOOGLE_CONFIGURED) {
      alert('Google is not configured.\n\nAdd VITE_GOOGLE_CLIENT_ID to frontend/.env and GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to backend/.env, then restart both servers.');
      return;
    }
    // Open the full permissions modal for re-connection
    setShowPermissionsModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventLoading(true);
    try {
      await api.post('/calendar/local', {
        title: eventTitle,
        startTime: new Date(`${eventDate}T${eventTime}`),
        location: eventLocation,
        description: eventDescription,
      });
      alert('Appointment added!');
      setShowAddEvent(false);
      setEventTitle(''); setEventDate(''); setEventTime('');
      setEventLocation(''); setEventDescription('');
    } catch (err: any) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setEventLoading(false);
    }
  };

  // Connected service icons for sidebar
  const connectedIcons = [
    { key: 'calendar', Icon: Calendar,  color: 'text-blue-400' },
    { key: 'drive',    Icon: HardDrive, color: 'text-yellow-400' },
    { key: 'gmail',    Icon: Mail,      color: 'text-red-400' },
  ] as const;

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
      {/* ── Global Search ── */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── Google Permissions Modal ── */}
      {showPermissionsModal && (
        <GooglePermissionsModal
          onConnected={(granted) => {
            setGoogleConnected(true);
            setServices({
              calendar: granted.includes('calendar'),
              drive:    granted.includes('drive'),
              gmail:    granted.includes('gmail'),
            });
            setShowPermissionsModal(false);
          }}
          onSkip={() => {
            localStorage.setItem('googleModalSkipped', 'true');
            setShowPermissionsModal(false);
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-border bg-surface/50 backdrop-blur-md flex-col hidden md:flex">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
            SmartAssist
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Global Search button */}
          <button onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-white/5 transition-all group mb-1">
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="hidden lg:flex items-center gap-0.5 text-xs text-text-muted/50 bg-white/5 border border-border/50 rounded px-1.5 py-0.5 group-hover:text-text-muted transition-colors">
              Ctrl K
            </kbd>
          </button>

          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-text-muted hover:text-text hover:bg-white/5'
                }`
              }>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          {/* Connected services strip */}
          {googleConnected && (
            <div className="px-3 py-2 flex items-center gap-1.5">
              <span className="text-xs text-text-muted mr-1">Connected:</span>
              {connectedIcons.map(({ key, Icon, color }) =>
                services[key as keyof GoogleServices] ? (
                  <div key={key} title={key} className="relative">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                ) : null
              )}
            </div>
          )}

          <button onClick={() => setShowAddEvent(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-white/5 transition-all">
            <Plus className="w-4 h-4" /> Add Appointment
          </button>

          <button onClick={handleSyncClick} disabled={syncing}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50">
            <div className="relative shrink-0">
              <Calendar className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {googleConnected && !syncing && (
                <CheckCircle2 className="w-2.5 h-2.5 text-secondary absolute -top-1 -right-1" />
              )}
              {!GOOGLE_CONFIGURED && !syncing && (
                <AlertCircle className="w-2.5 h-2.5 text-yellow-400 absolute -top-1 -right-1" />
              )}
            </div>
            <span>
              {syncing ? 'Syncing...' : googleConnected ? 'Manage Google Access' : 'Connect Google'}
            </span>
          </button>

<NavLink to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-text-muted hover:text-text hover:bg-white/5'
              }`
            }>
            <User className="w-4 h-4" /> Profile
          </NavLink>

          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-red-400 hover:bg-red-500/5 transition-all">
            <LogOut className="w-4 h-4" /> Log out
          </button>

          {/* ── Focus Timer ── */}
          <FocusTimer />
        </div>
      </aside>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* ── Add Appointment Modal ── */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface/95 border border-border p-6 rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> Add Appointment
              </h2>
              <button onClick={() => setShowAddEvent(false)} className="text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <input type="text" required placeholder="Title" value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text placeholder:text-text-muted" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" required value={eventDate} onChange={e => setEventDate(e.target.value)}
                  className="px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text" />
                <input type="time" required value={eventTime} onChange={e => setEventTime(e.target.value)}
                  className="px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text" />
              </div>
              <input type="text" placeholder="Location (optional)" value={eventLocation}
                onChange={e => setEventLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text placeholder:text-text-muted" />
              <textarea placeholder="Description (optional)" value={eventDescription}
                onChange={e => setEventDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text placeholder:text-text-muted resize-none h-20" />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddEvent(false)}
                  className="px-4 py-2 rounded-xl border border-border text-text text-sm hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={eventLoading}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                  {eventLoading ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
