// src/components/features/upload/UploadPanel.jsx
import React, { useRef, useState } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { useUpload } from '../../../hooks/useUpload';
import { Alert, Field, Spinner, Divider, SectionLabel } from '../../ui';
import { USER_ROLES, RISK_LEVELS } from '../../../constants';

const DEFAULT_META = {
  policy_id:      '',
  name:           '',
  version:        '1.0',
  effective_date: '',
  required_role:  USER_ROLES[0],
  risk_level:     RISK_LEVELS[0],
};

export function UploadPanel() {
  const inputRef                = useRef(null);
  const { uploading, message, upload, reset } = useUpload();
  const [meta,  setMeta]        = useState(DEFAULT_META);
  const [dragOver, setDragOver] = useState(false);

  const setField = (key) => (e) => setMeta((prev) => ({ ...prev, [key]: e.target.value }));

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      alert('Only PDF files are supported.');
      return;
    }
    reset();
    upload(file, meta);
  };

  const onInputChange  = (e)  => handleFiles(e.target.files);
  const onDrop         = (e)  => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const onDragOver     = (e)  => { e.preventDefault(); setDragOver(true); };
  const onDragLeave    = ()   => setDragOver(false);

  return (
    <div className="anim-fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Page heading */}
      <div style={{ marginBottom: '1.625rem' }}>
        <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.3rem' }}>
          Upload Policy Document
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Add PDF documents to the compliance knowledge base for RAG indexing.
        </p>
      </div>

      <div className="card" style={{ padding: '1.875rem' }}>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload PDF file"
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '0.875rem',
            padding:        '2.75rem 2rem',
            background:     dragOver ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.03)',
            border:         `2px dashed ${dragOver ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.18)'}`,
            borderRadius:   'var(--radius-lg)',
            cursor:         uploading ? 'not-allowed' : 'pointer',
            opacity:        uploading ? 0.65 : 1,
            transition:     'all var(--transition-base)',
            outline:        'none',
            textAlign:      'center',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={onInputChange}
            style={{ display: 'none' }}
            disabled={uploading}
            aria-hidden="true"
          />

          <div
            style={{
              width:          52,
              height:         52,
              background:     'rgba(59,130,246,0.1)',
              borderRadius:   13,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            {uploading ? <Spinner size="lg" /> : <Upload size={22} color="var(--accent-blue-lt)" />}
          </div>

          <div>
            <div className="font-display" style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              {uploading ? 'Processing document…' : 'Drop your PDF here'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {uploading ? 'Chunking and indexing into vector store' : 'or click to browse'}
            </div>
          </div>

          <span className="badge badge--blue">PDF only · max 50 MB</span>
        </div>

        {/* Feedback message */}
        {message && (
          <Alert type={message.type} className="anim-fade-in" style={{ marginTop: '1.125rem' }}>
            {message.type === 'success' && <CheckCircle size={13} style={{ flexShrink: 0 }} />}
            {message.text}
          </Alert>
        )}

        <Divider />

        {/* Metadata form */}
        <SectionLabel style={{ marginBottom: '1rem' }}>Document Metadata (optional)</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>

          <Field label="Policy ID">
            <input
              className="input"
              placeholder="Auto-generated if blank"
              value={meta.policy_id}
              onChange={setField('policy_id')}
            />
          </Field>

          <Field label="Document Name">
            <input
              className="input"
              placeholder="Derived from filename if blank"
              value={meta.name}
              onChange={setField('name')}
            />
          </Field>

          <Field label="Version">
            <input
              className="input"
              placeholder="1.0"
              value={meta.version}
              onChange={setField('version')}
            />
          </Field>

          <Field label="Effective Date">
            <input
              className="input"
              type="date"
              value={meta.effective_date}
              onChange={setField('effective_date')}
            />
          </Field>

          <Field label="Required Role">
            <select className="input" value={meta.required_role} onChange={setField('required_role')}>
              {USER_ROLES.map((r) => (
                <option key={r} value={r} style={{ background: 'var(--bg-card)' }}>{r}</option>
              ))}
            </select>
          </Field>

          <Field label="Risk Level">
            <select className="input" value={meta.risk_level} onChange={setField('risk_level')}>
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r} style={{ background: 'var(--bg-card)' }}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}
