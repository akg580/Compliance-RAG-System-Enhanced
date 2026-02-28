// src/hooks/useBackendStatus.js
import { useState, useEffect, useCallback } from 'react';
import { healthCheck } from '../services/api';

/**
 * Polls the backend health endpoint on mount and every `intervalMs`.
 *
 * @param {number} [intervalMs=30_000]
 * @returns {{ status: 'checking'|'connected'|'disconnected', retry: Function }}
 */
export function useBackendStatus(intervalMs = 30_000) {
  const [status, setStatus] = useState('checking');

  const check = useCallback(async () => {
    try {
      await healthCheck();
      setStatus('connected');
    } catch {
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  return { status, retry: check };
}
