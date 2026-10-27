'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/adminApi';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      await api('/auth/login', { method: 'POST', body: { email: String(f.get('email')), password: String(f.get('password')) } });
      router.replace('/admin');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <main className="a-login">
      <form onSubmit={submit} className="a-login-card">
        <h1>Sign in</h1>
        <p className="a-hint">Owner access only.</p>
        {error ? <p className="a-error" role="alert">{error}</p> : null}
        <div className="a-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
        <div className="a-field">
          <label htmlFor="password">Password</label>
          <div className="a-password">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required />
            <button
              type="button"
              className="a-password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5.2 9 5.2a15.8 15.8 0 01-2.4 2.8M6.2 6.2C4.2 7.5 3 9.2 3 9.2S6.5 16 12 16a9.8 9.8 0 003.2-.6" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" /><circle cx="12" cy="12" r="2.5" /></svg>
              )}
            </button>
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
