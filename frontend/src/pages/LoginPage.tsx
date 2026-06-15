import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

type Tab = 'login' | 'register';

const DEMO = {
  email: 'demo@tpt.local',
  password: 'Demo1234!',
  first_name: 'Demo',
  last_name: 'User',
  organisation_name: 'Demo Organisation',
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);

  const [tab, setTab] = useState<Tab>('login');
  const [validationError, setValidationError] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regOrg, setRegOrg] = useState('');

  const switchTab = (t: Tab) => {
    setTab(t);
    setValidationError('');
    clearError();
  };

  const onLogin = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setValidationError('');
    if (!email || !password) { setValidationError('Please enter your email and password.'); return; }
    try {
      await login({ username: email, password });
      navigate('/dashboard');
    } catch { /* surfaced via store.error */ }
  };

  const onRegister = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setValidationError('');
    if (!regFirstName || !regLastName) { setValidationError('First and last name are required.'); return; }
    if (!regEmail) { setValidationError('Email is required.'); return; }
    if (regPassword.length < 8) { setValidationError('Password must be at least 8 characters.'); return; }
    try {
      await api.register({
        email: regEmail,
        password: regPassword,
        first_name: regFirstName,
        last_name: regLastName,
        organisation_name: regOrg || undefined,
      });
      await login({ username: regEmail, password: regPassword });
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed.';
      setValidationError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const onDemo = async () => {
    setDemoLoading(true);
    setValidationError('');
    clearError();
    try {
      await api.register(DEMO).catch(() => { /* already exists — fine */ });
      await login({ username: DEMO.email, password: DEMO.password });
      navigate('/dashboard');
    } catch {
      setValidationError('Demo login failed. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">TPT Infrastructure Engineer</h1>
          <p className="mt-2 text-sm text-gray-500">Open-source infrastructure project management</p>
        </div>

        {/* Demo button */}
        <button
          onClick={onDemo}
          disabled={demoLoading || isLoading}
          className="w-full flex justify-center py-2.5 px-4 border-2 border-blue-600 text-sm font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {demoLoading ? 'Loading demo…' : '⚡ Try Demo — no setup required'}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
          >
            Sign in
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
          >
            Create account
          </button>
        </div>

        {tab === 'login' ? (
          <form className="space-y-4" onSubmit={onLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
            {displayError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{displayError}</div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={onRegister}>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                autoComplete="given-name"
                required
                value={regFirstName}
                onChange={e => setRegFirstName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="First name"
              />
              <input
                type="text"
                autoComplete="family-name"
                required
                value={regLastName}
                onChange={e => setRegLastName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Last name"
              />
            </div>
            <input
              type="email"
              autoComplete="email"
              required
              value={regEmail}
              onChange={e => setRegEmail(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Email address"
            />
            <input
              type="password"
              autoComplete="new-password"
              required
              value={regPassword}
              onChange={e => setRegPassword(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Password (min. 8 characters)"
            />
            <input
              type="text"
              value={regOrg}
              onChange={e => setRegOrg(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Organisation name (optional)"
            />
            {displayError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{displayError}</div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
