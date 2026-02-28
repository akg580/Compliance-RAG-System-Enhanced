// src/context/AuditContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { STORAGE_KEYS, AUDIT_STATUS, MAX_AUDIT_ENTRIES } from '../constants';
import { genId } from '../utils';

const loadAudit = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT) ?? '[]');
  } catch {
    return [];
  }
};

const persistAudit = (entries) =>
  localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(entries));

const AuditContext = createContext(null);

export function AuditProvider({ children }) {
  const [entries, setEntries] = useState(() => loadAudit());

  /**
   * Add a new audit entry.
   *
   * @param {{
   *   userId: string;
   *   userName: string;
   *   userRole: string;
   *   query: string;
   *   status: 'SUCCESS'|'NO_RESULT'|'ERROR';
   *   confidence?: number|null;
   *   responseTimeMs: number;
   *   answer?: string|null;
   *   citations?: Array;
   * }} data
   * @returns {string}  The generated audit entry ID
   */
  const addEntry = useCallback((data) => {
    const id = genId('QRY');
    const entry = {
      id,
      timestamp: new Date().toISOString(),
      ...data,
    };
    setEntries((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_AUDIT_ENTRIES);
      persistAudit(updated);
      return updated;
    });
    return id;
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    persistAudit([]);
  }, []);

  const stats = {
    total:    entries.length,
    success:  entries.filter((e) => e.status === AUDIT_STATUS.SUCCESS).length,
    noResult: entries.filter((e) => e.status === AUDIT_STATUS.NO_RESULT).length,
    errors:   entries.filter((e) => e.status === AUDIT_STATUS.ERROR).length,
  };

  return (
    <AuditContext.Provider value={{ entries, addEntry, clearAll, stats }}>
      {children}
    </AuditContext.Provider>
  );
}

export const useAudit = () => {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used inside <AuditProvider>');
  return ctx;
};
