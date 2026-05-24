import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Settings, Save } from 'lucide-react';
import api from '../api';

interface Profile { id: string; email: string; name?: string; }
interface UserSettings { theme: string; language: string; notificationsEnabled: boolean; timezone: string; }

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="bg-surface/50 border border-border rounded-2xl p-5 space-y-4">
    <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-primary" /> {title}
    </h2>
    {children}
  </div>
);

const inputCls = "w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted";
const labelCls = "text-xs text-text-muted uppercase tracking-wider block mb-1";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [name, setName] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get('/profile'), api.get('/profile/settings')]).then(([p, s]) => {
      setProfile(p.data);
      setName(p.data.name ?? '');
      setSettings(s.data);
    }).catch(console.error);
  }, []);

  const toast = (key: string) => { setSaved(key); setTimeout(() => setSaved(null), 2000); };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('profile');
    try {
      const { data } = await api.put('/profile', { name });
      setProfile(data);
      toast('profile');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(null);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    setSaving('password');
    try {
      await api.put('/profile/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast('password');
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(null);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving('settings');
    try {
      const { data } = await api.put('/profile/settings', settings);
      setSettings(data);
      toast('settings');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(null);
    }
  };

  if (!profile || !settings) return <div className="flex h-full items-center justify-center text-text-muted">Loading...</div>;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile & Settings</h1>
          <p className="text-text-muted text-sm mt-1">{profile.email}</p>
        </div>

        {/* Profile */}
        <Section icon={User} title="Profile">
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className={labelCls}>Display Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={profile.email} disabled className={inputCls + ' opacity-50 cursor-not-allowed'} />
            </div>
            <div className="flex justify-end">
              <motion.button type="submit" disabled={saving === 'profile'}
                animate={saved === 'profile' ? { backgroundColor: '#10B981' } : {}}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />
                {saving === 'profile' ? 'Saving...' : saved === 'profile' ? 'Saved!' : 'Save Profile'}
              </motion.button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section icon={Lock} title="Change Password">
          <form onSubmit={savePassword} className="space-y-3">
            {pwError && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">{pwError}</p>}
            <div>
              <label className={labelCls}>Current Password</label>
              <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required className={inputCls} />
            </div>
            <div className="flex justify-end">
              <motion.button type="submit" disabled={saving === 'password'}
                animate={saved === 'password' ? { backgroundColor: '#10B981' } : {}}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors">
                <Lock className="w-4 h-4" />
                {saving === 'password' ? 'Changing...' : saved === 'password' ? 'Changed!' : 'Change Password'}
              </motion.button>
            </div>
          </form>
        </Section>

        {/* Settings */}
        <Section icon={Settings} title="Preferences">
          <form onSubmit={saveSettings} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Theme</label>
                <select value={settings.theme} onChange={e => setSettings(s => s && ({ ...s, theme: e.target.value }))}
                  className={inputCls + ' cursor-pointer'}>
                  {['DARK', 'LIGHT'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Language</label>
                <select value={settings.language} onChange={e => setSettings(s => s && ({ ...s, language: e.target.value }))}
                  className={inputCls + ' cursor-pointer'}>
                  {['en', 'es', 'fr', 'de', 'pt'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Timezone</label>
              <input value={settings.timezone} onChange={e => setSettings(s => s && ({ ...s, timezone: e.target.value }))} className={inputCls} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.notificationsEnabled}
                onChange={e => setSettings(s => s && ({ ...s, notificationsEnabled: e.target.checked }))}
                className="accent-primary w-4 h-4" />
              <span className="text-sm text-text-muted">Enable notifications</span>
            </label>
            <div className="flex justify-end">
              <motion.button type="submit" disabled={saving === 'settings'}
                animate={saved === 'settings' ? { backgroundColor: '#10B981' } : {}}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />
                {saving === 'settings' ? 'Saving...' : saved === 'settings' ? 'Saved!' : 'Save Settings'}
              </motion.button>
            </div>
          </form>
        </Section>
      </div>
    </div>
  );
}
