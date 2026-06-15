import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

type Section = 'profile' | 'security' | 'preferences';

export default function SettingsPage() {
  const { user, fetchCurrentUser } = useAuthStore();
  const [section, setSection] = useState<Section>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');

  // Security form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Preferences
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('tpt_dark_mode') === 'true'
  );
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
    }
  }, [user]);

  function flash(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.updateCurrentUser({ first_name: firstName, last_name: lastName });
      await fetchCurrentUser();
      flash('success', 'Profile updated successfully.');
    } catch {
      flash('error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPw !== confirmPw) {
      flash('error', 'New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.updateCurrentUser({ current_password: currentPw, new_password: newPw });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      flash('success', 'Password changed successfully.');
    } catch (err: any) {
      flash('error', err?.response?.data?.detail ?? 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  function applyDarkMode(enabled: boolean) {
    setDarkMode(enabled);
    localStorage.setItem('tpt_dark_mode', String(enabled));
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', enabled);
  }

  const navItems: { id: Section; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'preferences', label: 'Preferences' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-md text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-44 shrink-0">
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  section === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6">
          {section === 'profile' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="text"
                  value={user?.email ?? ''}
                  disabled
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={user?.role ?? ''}
                  disabled
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500 capitalize"
                />
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Change password</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={changePassword}
                disabled={saving || !currentPw || !newPw || !confirmPw}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Change password'}
              </button>
            </div>
          )}

          {section === 'preferences' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Appearance</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => applyDarkMode(!darkMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      darkMode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                  <span className="text-sm text-gray-700">Dark mode</span>
                </label>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
