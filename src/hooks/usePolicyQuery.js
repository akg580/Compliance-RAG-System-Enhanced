// src/hooks/usePolicyQuery.js
import { useState, useCallback } from 'react';
import { queryPolicy } from '../services/api';
import { useAudit } from '../context/AuditContext';
import { useAuth } from '../context/AuthContext';
import { AUDIT_STATUS } from '../constants';

/**
 * Manages the lifecycle of a single policy query:
 *   loading state → API call → audit log entry → result state.
 *
 * @returns {{
 *   query: string;
 *   setQuery: Function;
 *   response: object|null;
 *   isLoading: boolean;
 *   error: string|null;
 *   submit: Function;
 *   reset: Function;
 * }}
 */
export function usePolicyQuery() {
  const { user } = useAuth();
  const { addEntry } = useAudit();

  const [query, setQuery]       = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState(null);

  const submit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    const start = Date.now();

    try {
      const res = await queryPolicy(trimmed, user.role, user.id);
      const elapsed = Date.now() - start;

      setResponse({ ...res, response_time_ms: elapsed });

      addEntry({
        userId:          user.id,
        userName:        user.name,
        userRole:        user.role,
        query:           trimmed,
        status:          res.success ? AUDIT_STATUS.SUCCESS : AUDIT_STATUS.NO_RESULT,
        confidence:      res.confidence ?? null,
        responseTimeMs:  elapsed,
        answer:          res.answer ?? null,
        citations:       res.citations ?? [],
      });
    } catch (err) {
      const elapsed = Date.now() - start;
      const message = err.message ?? 'Unexpected error.';

      setError(message);
      setResponse({ success: false, message });

      addEntry({
        userId:         user.id,
        userName:       user.name,
        userRole:       user.role,
        query:          trimmed,
        status:         AUDIT_STATUS.ERROR,
        confidence:     null,
        responseTimeMs: elapsed,
        answer:         null,
        citations:      [],
      });
    } finally {
      setLoading(false);
    }
  }, [query, isLoading, user, addEntry]);

  const reset = useCallback(() => {
    setQuery('');
    setResponse(null);
    setError(null);
  }, []);

  return { query, setQuery, response, isLoading, error, submit, reset };
}
