// src/App.jsx
// Top-level component. Owns routing between auth and the main shell.
// All state is delegated to context providers and feature hooks.

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuditProvider }         from './context/AuditContext';
import { AuthPage }              from './components/features/auth/AuthPage';
import { Header }                from './components/layout/Header';
import { QueryPanel }            from './components/features/query/QueryPanel';
import { AuditLog }              from './components/features/audit/AuditLog';
import { UploadPanel }           from './components/features/upload/UploadPanel';
import { APP_TABS }              from './constants';

// ── Authenticated shell ────────────────────────────────────────────────────────
function AppShell() {
  const [activeTab, setActiveTab] = useState(APP_TABS.QUERY);

  const PAGE = {
    [APP_TABS.QUERY]:  <QueryPanel />,
    [APP_TABS.AUDIT]:  <AuditLog />,
    [APP_TABS.UPLOAD]: <UploadPanel />,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main
        style={{
          flex:      1,
          maxWidth:  'var(--max-width)',
          width:     '100%',
          margin:    '0 auto',
          padding:   '2rem 1.5rem',
        }}
      >
        {PAGE[activeTab]}
      </main>
    </div>
  );
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
function AuthGate() {
  const { user } = useAuth();
  return user ? <AppShell /> : <AuthPage />;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AuditProvider>
        <AuthGate />
      </AuditProvider>
    </AuthProvider>
  );
}
