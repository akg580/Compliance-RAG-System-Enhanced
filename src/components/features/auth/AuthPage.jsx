// src/components/features/auth/AuthPage.jsx
import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Alert, Field, Spinner } from '../../ui';
import { USER_ROLES, DEMO_CREDENTIALS } from '../../../constants';

const MODES = { LOGIN: 'login', SIGNUP: 'signup' };

export function AuthPage() {
  const { login, signup } = useAuth();

  const [mode,     setMode]     = useState(MODES.LOGIN);
  const [form,     setForm]     = useState({ name: '', email: '', password: '', role: USER_ROLES[1] });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Small artificial delay so the spinner renders at least once.
    await new Promise((r) => setTimeout(r, 500));
    try {
      if (mode === MODES.LOGIN) {
        login({ email: form.email, password: form.password });
      } else {
        signup({ name: form.name, email: form.email, password: form.password, role: form.role });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setError(''); };

  return (
    <div
      style={{
        minHeight:      '100vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '2rem',
        background:     `radial-gradient(ellipse 80% 55% at 50% -5%,
                           rgba(37,99,235,0.16) 0%,
                           transparent 60%),
                         var(--bg-base)`,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }} className="anim-fade-up">

        {/* Logo */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            '0.875rem',
            justifyContent: 'center',
            marginBottom:   '2.25rem',
          }}
        >
          <div
            style={{
              width:          46,
              height:         46,
              background:     'linear-gradient(135deg, #1d4ed8, #2563eb)',
              borderRadius:   13,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              boxShadow:      '0 0 28px rgba(59,130,246,0.32)',
            }}
          >
            <Shield size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display shimmer-text" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              ComplianceAI
            </div>
            <div className="section-label" style={{ marginTop: 2 }}>
              Policy Intelligence Platform
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '1.875rem' }}>

          {/* Tabs */}
          <div className="tab-bar" style={{ marginBottom: '1.625rem' }}>
            <button
              className={`tab${mode === MODES.LOGIN ? ' tab--active' : ''}`}
              onClick={() => switchMode(MODES.LOGIN)}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`tab${mode === MODES.SIGNUP ? ' tab--active' : ''}`}
              onClick={() => switchMode(MODES.SIGNUP)}
              type="button"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Name (signup only) */}
            {mode === MODES.SIGNUP && (
              <Field label="Full Name" required>
                <div className="input-wrap">
                  <span className="input-icon input-icon--left"><User size={14} /></span>
                  <input
                    className="input input--icon-left"
                    type="text"
                    placeholder="Jane Smith"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={set('name')}
                  />
                </div>
              </Field>
            )}

            {/* Email */}
            <Field label="Email" required>
              <div className="input-wrap">
                <span className="input-icon input-icon--left"><Mail size={14} /></span>
                <input
                  className="input input--icon-left"
                  type="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                />
              </div>
            </Field>

            {/* Password */}
            <Field label="Password" required>
              <div className="input-wrap">
                <span className="input-icon input-icon--left"><Lock size={14} /></span>
                <input
                  className={`input input--icon-left input--icon-right${error ? ' input--error' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === MODES.LOGIN ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={set('password')}
                />
                <button
                  type="button"
                  className="btn btn--icon input-icon input-icon--right"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>

            {/* Role (signup only) */}
            {mode === MODES.SIGNUP && (
              <Field label="Role" required>
                <select
                  className="input"
                  value={form.role}
                  onChange={set('role')}
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r} style={{ background: 'var(--bg-card)' }}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Error */}
            {error && <Alert type="error">{error}</Alert>}

            {/* Submit */}
            <button
              className="btn btn--primary btn--lg btn--full"
              type="submit"
              disabled={loading}
              style={{ marginTop: '0.25rem' }}
            >
              {loading ? <Spinner /> : <ArrowRight size={15} />}
              {loading
                ? 'Please wait…'
                : mode === MODES.LOGIN
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          {/* Demo hint */}
          {mode === MODES.LOGIN && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1.125rem' }}>
              Demo —{' '}
              <span className="font-mono" style={{ color: '#93C5FD', fontSize: '0.73rem' }}>
                {DEMO_CREDENTIALS.email}
              </span>{' '}
              /{' '}
              <span className="font-mono" style={{ color: '#93C5FD', fontSize: '0.73rem' }}>
                {DEMO_CREDENTIALS.password}
              </span>
            </p>
          )}
        </div>

        <p
          style={{
            textAlign:  'center',
            fontSize:   '0.72rem',
            color:      'var(--text-disabled)',
            marginTop:  '1.375rem',
            lineHeight: 1.6,
          }}
        >
          AES-256 encrypted · SOC 2 Type II · GDPR compliant
        </p>
      </div>
    </div>
  );
}
