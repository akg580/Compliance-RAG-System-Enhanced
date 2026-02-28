// src/components/ui/index.jsx
// Tiny, reusable primitive components used across features.

import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

// ── Badge ─────────────────────────────────────────────────────────────────────
/** @param {{ variant?: 'blue'|'green'|'gold'|'red'|'purple'|'cyan'; children: React.ReactNode; className?: string }} */
export function Badge({ variant = 'blue', children, className = '' }) {
  return (
    <span className={`badge badge--${variant} ${className}`}>
      {children}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const STATUS_MAP = {
  SUCCESS:   { variant: 'green',  label: 'SUCCESS' },
  NO_RESULT: { variant: 'gold',   label: 'NO RESULT' },
  ERROR:     { variant: 'red',    label: 'ERROR' },
};

export function StatusBadge({ status }) {
  const { variant, label } = STATUS_MAP[status] ?? { variant: 'blue', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Alert ─────────────────────────────────────────────────────────────────────
const ALERT_ICONS = {
  error:   AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info:    Info,
};

/**
 * @param {{ type?: 'error'|'success'|'warning'|'info'; children: React.ReactNode; className?: string }}
 */
export function Alert({ type = 'info', children, className = '' }) {
  const Icon = ALERT_ICONS[type];
  return (
    <div className={`alert alert--${type} ${className}`} role="alert">
      {Icon && <Icon size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
      <span>{children}</span>
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  return <span className={`spinner${size === 'lg' ? ' spinner--lg' : ''}`} aria-label="Loading" />;
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <div className="divider" style={style} />;
}

// ── Section Label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, icon: Icon, style }) {
  return (
    <div
      className="section-label"
      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', ...style }}
    >
      {Icon && <Icon size={12} />}
      {children}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
/**
 * @param {{ label: string; value: string|number; color?: string }}
 */
export function StatCard({ label, value, color = 'var(--accent-blue-lt)' }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
      }}
    >
      <span className="section-label">{label}</span>
      <span
        className="font-display"
        style={{ fontSize: '1.35rem', fontWeight: 700, color, lineHeight: 1.2 }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
/**
 * A labelled input/select wrapper.
 * @param {{ label: string; children: React.ReactNode; required?: boolean }}
 */
export function Field({ label, required, children }) {
  return (
    <div className="field">
      <label className="input-label">
        {label}
        {required && <span style={{ color: 'var(--accent-red)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
