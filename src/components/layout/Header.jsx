// src/components/layout/Header.jsx
import React from 'react';
import { Shield, Search, Activity, Upload, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBackendStatus } from '../../hooks/useBackendStatus';
import { APP_TABS } from '../../constants';

const NAV_ITEMS = [
  { id: APP_TABS.QUERY,  label: 'Query',    Icon: Search   },
  { id: APP_TABS.AUDIT,  label: 'Audit Log', Icon: Activity },
  { id: APP_TABS.UPLOAD, label: 'Upload',   Icon: Upload   },
];

/**
 * @param {{ activeTab: string; onTabChange: (tab: string) => void }}
 */
export function Header({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const { status }       = useBackendStatus();

  const dotClass =
    status === 'connected'    ? 'status-dot status-dot--live'     :
    status === 'disconnected' ? 'status-dot status-dot--offline'  :
                                'status-dot status-dot--checking';

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '??';

  return (
    <header
      style={{
        background:    'rgba(13,17,23,0.96)',
        borderBottom:  '1px solid var(--border-subtle)',
        position:      'sticky',
        top:           0,
        zIndex:        100,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div
        style={{
          maxWidth:       'var(--max-width)',
          margin:         '0 auto',
          padding:        '0 1.5rem',
          height:         'var(--header-height)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            '1rem',
        }}
      >
        {/* ── Logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div
            style={{
              width:          36,
              height:         36,
              background:     'linear-gradient(135deg, #1d4ed8, #2563eb)',
              borderRadius:   10,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              boxShadow:      '0 0 18px rgba(59,130,246,0.3)',
            }}
          >
            <Shield size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div
              className="font-display shimmer-text"
              style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}
            >
              ComplianceAI
            </div>
            <div className="section-label" style={{ marginTop: 1 }}>Policy Intelligence</div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav
          style={{ display: 'flex', gap: '0.125rem' }}
          className="hide-sm"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`tab${activeTab === id ? ' tab--active' : ''}`}
              style={{ flex: 'none' }}
              onClick={() => onTabChange(id)}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </nav>

        {/* ── Right controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {/* Backend status pill */}
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '0.4rem',
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding:    '0.375rem 0.75rem',
            }}
            title={`Backend ${status}`}
          >
            <span className={dotClass} />
            <span
              className="section-label hide-md"
              style={{ marginBottom: 0 }}
            >
              {status === 'connected' ? 'LIVE' : status === 'checking' ? 'CHECKING' : 'OFFLINE'}
            </span>
          </div>

          {/* Avatar */}
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '0.5rem',
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding:    '0.3rem 0.75rem',
            }}
          >
            <div
              style={{
                width:          26,
                height:         26,
                borderRadius:   '50%',
                background:     'linear-gradient(135deg, #2563eb, #7c3aed)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '0.65rem',
                fontWeight:     700,
                flexShrink:     0,
              }}
            >
              {initials}
            </div>
            <div className="hide-md" style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{user?.name?.split(' ')[0]}</div>
              <div className="section-label" style={{ marginBottom: 0, fontSize: '0.63rem' }}>{user?.role}</div>
            </div>
          </div>

          {/* Logout */}
          <button
            className="btn btn--icon"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* ── Mobile nav (visible only on small screens) ── */}
      <div
        style={{
          display:       'flex',
          gap:           '0.25rem',
          padding:       '0.5rem 1rem',
          borderTop:     '1px solid var(--border-subtle)',
          overflowX:     'auto',
        }}
        className="hide-sm"   /* shown only when hide-sm hides the header nav */
        aria-label="Mobile navigation"
      >
        {/* Note: CSS shows this below 640 px by inverting hide-sm.
            The two navs share the same render so only CSS controls visibility. */}
      </div>
    </header>
  );
}
