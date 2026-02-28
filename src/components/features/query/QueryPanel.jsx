// src/components/features/query/QueryPanel.jsx
import React, { useRef } from 'react';
import { Search, Sparkles, Zap, Clock, ChevronRight, CheckCircle, AlertCircle, FileText, Activity } from 'lucide-react';
import { usePolicyQuery } from '../../../hooks/usePolicyQuery';
import { useAudit } from '../../../context/AuditContext';
import { useBackendStatus } from '../../../hooks/useBackendStatus';
import { Badge, StatCard, SectionLabel, Spinner, Divider } from '../../ui';
import { QUICK_ACTIONS } from '../../../constants';
import { renderMarkdownBold, fmtMs, truncate } from '../../../utils';

// ── Result card ───────────────────────────────────────────────────────────────
function QueryResult({ response }) {
  if (!response) return null;

  return (
    <div className="card anim-slide-in" style={{ padding: '1.625rem' }}>
      {response.success ? (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.125rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 34, height: 34, background: 'rgba(16,185,129,0.12)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={18} color="var(--success)" />
              </div>
              <div>
                <div className="font-display" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                  Policy Found
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  Confidence:{' '}
                  <strong style={{ color: 'var(--success)' }}>{response.confidence}%</strong>
                  {response.response_time_ms && (
                    <span style={{ marginLeft: '0.625rem' }}>· {fmtMs(response.response_time_ms)}</span>
                  )}
                </div>
              </div>
            </div>
            <Badge variant="green">VERIFIED</Badge>
          </div>

          {/* Answer */}
          <div
            style={{
              background:  'rgba(59,130,246,0.06)',
              border:      '1px solid rgba(59,130,246,0.14)',
              borderRadius: 12,
              padding:     '1.125rem',
              marginBottom: '1.375rem',
            }}
          >
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.75, color: 'rgba(238,242,255,0.88)', margin: 0 }}>
              {renderMarkdownBold(response.answer)}
            </p>
          </div>

          {/* Citations */}
          {response.citations?.length > 0 && (
            <>
              <SectionLabel icon={FileText} style={{ marginBottom: '0.75rem' }}>
                Citations ({response.citations.length})
              </SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {response.citations.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'space-between',
                      background:   'rgba(255,255,255,0.03)',
                      border:       '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      padding:      '0.75rem 1rem',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                        {c.policy_name}
                      </p>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <Badge variant="blue">{c.policy_id}</Badge>
                        <Badge variant="purple">v{c.version}</Badge>
                        {c.page && <Badge variant="gold">pg.{c.page}</Badge>}
                      </div>
                    </div>
                    <ChevronRight size={15} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.75rem' }}>
          <AlertCircle size={38} color="var(--warning)" style={{ display: 'block', margin: '0 auto 0.875rem' }} />
          <div className="font-display" style={{ fontWeight: 700, marginBottom: '0.4rem' }}>
            No Policy Found
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{response.message}</p>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ onSetQuery }) {
  const { status }  = useBackendStatus();
  const { entries } = useAudit();

  const dotClass =
    status === 'connected'    ? 'status-dot status-dot--live'    :
    status === 'disconnected' ? 'status-dot status-dot--offline' :
                                'status-dot status-dot--checking';

  const STATS = [
    { label: 'Indexed',  value: 847,    color: 'var(--accent-blue-lt)' },
    { label: 'Coverage', value: '100%', color: 'var(--success)'        },
    { label: 'Avg Time', value: '2.3s', color: 'var(--accent-blue-lt)' },
    { label: 'Refusals', value: '8%',   color: 'var(--accent-pink)'    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

      {/* System status */}
      <div className="card" style={{ padding: '1.125rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <SectionLabel icon={Activity}>System Status</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={dotClass} />
            <span className="section-label" style={{ marginBottom: 0, color: 'var(--text-muted)' }}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          {STATS.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ padding: '1.125rem' }}>
        <SectionLabel icon={Zap} style={{ marginBottom: '0.875rem', color: 'var(--accent-gold)' }}>
          Quick Start
        </SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => onSetQuery(a.query)}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         '0.75rem',
                padding:     '0.6875rem 0.875rem',
                background:  'rgba(255,255,255,0.025)',
                border:      '1px solid var(--border-subtle)',
                borderRadius: 10,
                cursor:      'pointer',
                transition:  'all var(--transition-fast)',
                textAlign:   'left',
                width:       '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.07)';
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{a.icon}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent queries */}
      <div className="card" style={{ padding: '1.125rem' }}>
        <SectionLabel icon={Clock} style={{ marginBottom: '0.875rem' }}>
          Recent Queries
        </SectionLabel>
        {entries.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
            No queries yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {entries.slice(0, 5).map((e) => (
              <div
                key={e.id}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '0.5rem',
                  padding:    '0.5rem 0.625rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 7,
                }}
              >
                <Badge variant={e.status === 'SUCCESS' ? 'green' : 'red'}>
                  {e.status === 'SUCCESS' ? '✓' : '✗'}
                </Badge>
                <span
                  style={{
                    fontSize:     '0.78rem',
                    color:        'var(--text-secondary)',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                    flex:         1,
                  }}
                >
                  {truncate(e.query, 52)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function QueryPanel() {
  const textRef = useRef(null);
  const { query, setQuery, response, isLoading, submit } = usePolicyQuery();

  const handleSetQuery = (q) => {
    setQuery(q);
    // Focus textarea after state update
    setTimeout(() => textRef.current?.focus(), 0);
  };

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr var(--sidebar-width)', gap: '1.5rem' }}
      className="main-grid"   /* CSS overrides to single column on mobile */
    >
      {/* Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.375rem' }}>

        {/* Query card */}
        <div className="card" style={{ padding: '1.625rem' }}>
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              marginBottom:   '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Sparkles size={16} color="var(--accent-gold)" />
              <span className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Policy Query
              </span>
            </div>
          </div>

          {/* Textarea */}
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask about lending policies, compliance requirements, or regulatory standards… (Enter to submit)"
              rows={4}
              className="input"
              style={{ resize: 'none', lineHeight: 1.65, paddingBottom: '3rem', boxSizing: 'border-box' }}
              aria-label="Policy query"
            />
            <button
              className="btn btn--primary btn--md"
              onClick={submit}
              disabled={isLoading || !query.trim()}
              style={{ position: 'absolute', bottom: 10, right: 10 }}
            >
              {isLoading ? <Spinner /> : <Search size={14} />}
              {isLoading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {/* Result */}
        <QueryResult response={response} />
      </div>

      {/* Right sidebar */}
      <Sidebar onSetQuery={handleSetQuery} />
    </div>
  );
}
