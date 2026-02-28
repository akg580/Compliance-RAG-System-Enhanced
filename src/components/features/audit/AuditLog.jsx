// src/components/features/audit/AuditLog.jsx
import React, { useState, useMemo } from 'react';
import { Activity, Search, X, ChevronRight, FileText } from 'lucide-react';
import { useAudit } from '../../../context/AuditContext';
import { Badge, StatusBadge, StatCard, SectionLabel } from '../../ui';
import { fmtTime, fmtDate, fmtMs, renderMarkdownBold, truncate } from '../../../utils';

// ── Expanded row content ──────────────────────────────────────────────────────
function ExpandedEntry({ entry }) {
  return (
    <div
      className="anim-fade-in"
      style={{
        padding:    '1.125rem 1.375rem 1.25rem',
        background: 'rgba(59,130,246,0.04)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {entry.answer ? (
        <>
          <SectionLabel icon={FileText} style={{ marginBottom: '0.5rem' }}>
            Response
          </SectionLabel>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(238,242,255,0.85)', marginBottom: '0.75rem' }}>
            {renderMarkdownBold(entry.answer)}
          </p>
          {entry.citations?.length > 0 && (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {entry.citations.map((c, i) => (
                <Badge key={i} variant="blue">{c.policy_id}</Badge>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No answer recorded for this entry.
        </p>
      )}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function AuditRow({ entry, expanded, onToggle }) {
  return (
    <>
      <div
        role="row"
        onClick={onToggle}
        style={{
          display:       'grid',
          gridTemplateColumns: '9rem 1fr 8.5rem 7rem 5.5rem 2rem',
          gap:           '0.875rem',
          padding:       '0.875rem 1.25rem',
          borderBottom:  '1px solid var(--border-subtle)',
          cursor:        'pointer',
          transition:    'background var(--transition-fast)',
          alignItems:    'center',
          background:    expanded ? 'rgba(59,130,246,0.05)' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
        aria-expanded={expanded}
      >
        {/* ID + time */}
        <div>
          <div className="font-mono" style={{ fontSize: '0.72rem', color: '#93C5FD', marginBottom: '0.15rem' }}>
            {entry.id}
          </div>
          <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{fmtTime(entry.timestamp)}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-disabled)' }}>{fmtDate(entry.timestamp)}</div>
        </div>

        {/* Query */}
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {truncate(entry.query, 90)}
          </p>
          {entry.responseTimeMs && (
            <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
              {fmtMs(entry.responseTimeMs)}
            </span>
          )}
        </div>

        {/* User */}
        <div>
          <div style={{ fontSize: '0.83rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.userName}
          </div>
          <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.userRole}
          </div>
        </div>

        {/* Status */}
        <div><StatusBadge status={entry.status} /></div>

        {/* Confidence */}
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: entry.confidence ? 'var(--success)' : 'var(--text-muted)' }}>
          {entry.confidence != null ? `${entry.confidence}%` : '—'}
        </div>

        {/* Toggle */}
        <ChevronRight
          size={14}
          color="var(--text-muted)"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </div>

      {expanded && <ExpandedEntry entry={entry} />}
    </>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function AuditLog() {
  const { entries, clearAll, stats } = useAudit();
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.trim().toLowerCase();
    return entries.filter(
      (e) =>
        e.query.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)    ||
        e.userName?.toLowerCase().includes(q),
    );
  }, [entries, search]);

  const STAT_CARDS = [
    { label: 'Total',     value: stats.total,    color: 'var(--accent-blue-lt)' },
    { label: 'Successful', value: stats.success,  color: 'var(--success)'       },
    { label: 'No Result', value: stats.noResult, color: 'var(--warning)'        },
    { label: 'Errors',    value: stats.errors,   color: 'var(--danger)'         },
  ];

  const COLUMNS = ['ID / Time', 'Query', 'User / Role', 'Status', 'Confidence', ''];

  return (
    <div className="anim-fade-in">

      {/* Page header */}
      <div
        style={{
          display:      'flex',
          alignItems:   'flex-start',
          justifyContent: 'space-between',
          flexWrap:     'wrap',
          gap:          '1rem',
          marginBottom: '1.375rem',
        }}
      >
        <div>
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Audit Log
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {entries.length} entries · retained 90 days
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="input-wrap" style={{ width: 240 }}>
            <span className="input-icon input-icon--left"><Search size={13} /></span>
            <input
              className="input input--icon-left"
              style={{ fontSize: '0.85rem', height: 38 }}
              placeholder="Search queries, IDs, users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search audit log"
            />
          </div>
          {entries.length > 0 && (
            <button
              className="btn btn--danger btn--sm"
              onClick={() => { if (window.confirm('Clear all audit records?')) clearAll(); }}
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.875rem', marginBottom: '1.375rem' }}>
        {STAT_CARDS.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>

        {/* Header row */}
        <div
          role="rowheader"
          style={{
            display:     'grid',
            gridTemplateColumns: '9rem 1fr 8.5rem 7rem 5.5rem 2rem',
            gap:         '0.875rem',
            padding:     '0.75rem 1.25rem',
            background:  'rgba(255,255,255,0.03)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {COLUMNS.map((col) => (
            <div key={col} className="section-label">{col}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Activity size={38} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {search ? 'No records match your search.' : 'No audit records yet. Run a query to begin.'}
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <AuditRow
              key={entry.id}
              entry={entry}
              expanded={expanded === entry.id}
              onToggle={() => setExpanded((prev) => (prev === entry.id ? null : entry.id))}
            />
          ))
        )}
      </div>
    </div>
  );
}
