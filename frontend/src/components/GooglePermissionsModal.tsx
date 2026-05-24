import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { BrainCircuit, Calendar, HardDrive, Mail, Shield, X, ChevronRight, Check } from 'lucide-react';
import api from '../api';

// ─── Service definitions ──────────────────────────────────────────────────────
const SERVICES = [
  {
    key: 'calendar',
    icon: Calendar,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    activeBg: 'bg-blue-400/20 border-blue-400/40',
    name: 'Google Calendar',
    description: 'Sync your events and schedule so SmartAssist can help you plan your day.',
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
    recommended: true,
  },
  {
    key: 'drive',
    icon: HardDrive,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    activeBg: 'bg-yellow-400/20 border-yellow-400/40',
    name: 'Google Drive',
    description: 'Access your files and documents so SmartAssist can reference them in chat.',
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    recommended: false,
  },
  {
    key: 'gmail',
    icon: Mail,
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    activeBg: 'bg-red-400/20 border-red-400/40',
    name: 'Gmail',
    description: 'Read your emails so SmartAssist can summarise threads and draft replies.',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    recommended: false,
  },
] as const;

type ServiceKey = (typeof SERVICES)[number]['key'];

interface Props {
  onConnected: (services: ServiceKey[]) => void;
  onSkip: () => void;
}

export default function GooglePermissionsModal({ onConnected, onSkip }: Props) {
  const [selected, setSelected] = useState<Record<ServiceKey, boolean>>({
    calendar: true,
    drive: false,
    gmail: false,
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'success'>('select');
  const [connectedServices, setConnectedServices] = useState<ServiceKey[]>([]);

  // Build the combined scope string from selected services
  const activeScopes = SERVICES
    .filter(s => selected[s.key])
    .map(s => s.scope)
    .join(' ');

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const connectGoogle = useGoogleLogin({
    flow: 'auth-code',
    scope: activeScopes || SERVICES[0].scope, // fallback to calendar if none selected
    onSuccess: async (codeResponse) => {
      setLoading(true);
      try {
        await api.post('/calendar/auth', {
          code: codeResponse.code,
          scopes: activeScopes,
        });

        // Auto-sync calendar if it was selected
        if (selected.calendar) {
          await api.post('/calendar/sync').catch(() => {}); // non-fatal
        }

        const granted = SERVICES.filter(s => selected[s.key]).map(s => s.key);
        setConnectedServices(granted);
        setStep('success');
      } catch (err: any) {
        alert('Connection failed: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err);
      alert('Google sign-in failed: ' + (err.error_description || err.error || 'Popup was closed'));
    },
  });

  const toggle = (key: ServiceKey) =>
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <AnimatePresence mode="wait">
        {/* ── SELECT STEP ────────────────────────────────────────────────── */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/10 via-surface to-surface border-b border-border">
              <button
                onClick={onSkip}
                className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-text-muted">SmartAssist</span>
              </div>

              <h2 className="text-xl font-bold text-white">Connect Google Services</h2>
              <p className="text-sm text-text-muted mt-1">
                Choose what SmartAssist can access to give you a smarter experience.
              </p>
            </div>

            {/* Service toggles */}
            <div className="p-4 space-y-3">
              {SERVICES.map((service) => {
                const Icon = service.icon;
                const isOn = selected[service.key];

                return (
                  <button
                    key={service.key}
                    onClick={() => toggle(service.key)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${
                      isOn ? service.activeBg : 'border-border hover:border-border/80 hover:bg-white/5'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isOn ? service.bg : 'bg-white/5 border border-border'
                    }`}>
                      <Icon className={`w-5 h-5 ${isOn ? service.color : 'text-text-muted'}`} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isOn ? 'text-white' : 'text-text-muted'}`}>
                          {service.name}
                        </span>
                        {service.recommended && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Toggle */}
                    <div className={`w-11 h-6 rounded-full flex items-center shrink-0 mt-2 transition-colors px-0.5 ${
                      isOn ? 'bg-primary' : 'bg-white/10'
                    }`}>
                      <motion.div
                        animate={{ x: isOn ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-5 h-5 rounded-full bg-white shadow"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Security note */}
            <div className="mx-4 mb-4 p-3 rounded-xl bg-white/3 border border-border flex items-start gap-2">
              <Shield className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted leading-relaxed">
                SmartAssist only <strong className="text-text">reads</strong> your data — it never modifies or deletes anything. Google controls all permissions and you can revoke access at any time.
              </p>
            </div>

            {/* Actions */}
            <div className="px-4 pb-5 space-y-2">
              <button
                onClick={() => connectGoogle()}
                disabled={selectedCount === 0 || loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-medium text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="animate-pulse">Connecting...</span>
                ) : (
                  <>
                    Connect {selectedCount > 0 ? `${selectedCount} Service${selectedCount > 1 ? 's' : ''}` : 'Services'} to Google
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={onSkip}
                className="w-full py-2 text-xs text-text-muted hover:text-text transition-colors"
              >
                Skip for now — I'll connect later from the sidebar
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS STEP ───────────────────────────────────────────────── */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className="w-16 h-16 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center mx-auto mb-5"
            >
              <Check className="w-8 h-8 text-secondary" />
            </motion.div>

            <h2 className="text-xl font-bold text-white mb-2">All Connected!</h2>
            <p className="text-sm text-text-muted mb-6">
              SmartAssist now has access to your selected Google services.
            </p>

            <div className="space-y-2 mb-6 text-left">
              {SERVICES.filter(s => connectedServices.includes(s.key)).map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.key} className={`flex items-center gap-3 p-3 rounded-xl border ${s.bg}`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-sm font-medium text-white">{s.name}</span>
                    <Check className="w-4 h-4 text-secondary ml-auto" />
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => onConnected(connectedServices)}
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-medium text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
            >
              Start Using SmartAssist
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
