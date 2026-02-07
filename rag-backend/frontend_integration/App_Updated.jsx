/**
 * Updated App component that uses the RAG backend API instead of local processQuery.
 * Copy this file to your React app (e.g. src/App.jsx) and ensure VITE_API_URL is set to http://localhost:8000.
 *
 * Usage in project:
 * 1. Copy api.js to src/services/api.js (or keep in frontend_integration and adjust import).
 * 2. Replace your App.jsx with this component (or merge the searchPolicy logic).
 * 3. Set .env: VITE_API_URL=http://localhost:8000
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Search, Shield, FileText, AlertTriangle, CheckCircle, XCircle, User, Lightbulb, Sparkles } from 'lucide-react';
import { queryPolicy } from './api';

function App() {
  const [userRole, setUserRole] = useState('Senior Loan Officer');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [error, setError] = useState(null);

  const searchPolicy = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    const logEntry = {
      timestamp: new Date().toISOString(),
      user: userRole,
      query: query,
      status: 'Processing',
    };

    try {
      const result = await queryPolicy(query, userRole);

      if (result.type === 'rbac_denial') {
        logEntry.status = 'RBAC_DENIED';
        logEntry.reason = 'Insufficient permissions';
      } else if (result.type === 'no_policy') {
        logEntry.status = 'NO_MATCH';
        logEntry.confidence = 0;
      } else {
        logEntry.status = 'SUCCESS';
        logEntry.confidence = result.confidence;
        logEntry.citationCount = 1;
      }

      setAuditLog((prev) => [logEntry, ...prev]);
      setResponse(result);
    } catch (err) {
      logEntry.status = 'ERROR';
      logEntry.reason = err.message;
      setAuditLog((prev) => [logEntry, ...prev]);
      setError(err.message);
      setResponse({
        type: 'no_policy',
        message: 'Backend unavailable or error',
        recommendedAction: 'Ensure the RAG backend is running at ' + (import.meta.env?.VITE_API_URL || 'http://localhost:8000'),
        searchedTerms: query,
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, userRole]);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        searchPolicy();
      }
    },
    [searchPolicy]
  );

  const sampleQueries = useMemo(
    () => [
      { emoji: '🏢', title: 'CRE LTV Query', query: 'What is the LTV ratio for commercial real estate in Zone B?' },
      { emoji: '🏠', title: 'Mortgage Standards', query: 'What is the minimum credit score for residential mortgages?' },
      { emoji: '📊', title: 'Basel III Capital', query: 'Basel III capital requirements for corporate exposures' },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <header className="relative bg-white/5 backdrop-blur-xl border-b border-white/10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Shield className="w-10 h-10 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Compliance RAG System
              </h1>
              <p className="text-sm text-slate-400">Enterprise Knowledge Assistant (Backend API)</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-slate-400" />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option className="bg-slate-800">Junior Officer</option>
              <option className="bg-slate-800">Senior Loan Officer</option>
              <option className="bg-slate-800">Credit Manager</option>
              <option className="bg-slate-800">Risk Officer</option>
              <option className="bg-slate-800">Senior Management</option>
            </select>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
            API error: {error}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-6">
          <label className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-cyan-400" /> Policy Query
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about lending policies, compliance requirements..."
            className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 resize-none"
            rows={4}
          />
          <button
            onClick={searchPolicy}
            disabled={isLoading || !query.trim()}
            className="mt-4 w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing Policy Database...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" /> Search Policies
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {sampleQueries.map((s) => (
            <button
              key={s.query}
              onClick={() => setQuery(s.query)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm"
            >
              {s.emoji} {s.title}
            </button>
          ))}
        </div>

        {response && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20">
            {response.type === 'success' ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-green-400">
                  <CheckCircle className="w-7 h-7" />
                  <div>
                    <h3 className="font-bold text-white text-lg">Policy Retrieved</h3>
                    <p className="text-sm text-slate-300">Confidence: {response.confidence}% · {response.riskLevel} Risk</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-cyan-400 mb-2">Policy Text</h4>
                  <div className="bg-slate-900/50 rounded-xl p-5 text-white">{response.answer}</div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-purple-400 mb-2">Citation</h4>
                  <div className="bg-purple-900/20 rounded-xl p-5 text-white">
                    {response.citation.policyName} · {response.citation.section} · Page {response.citation.page}
                  </div>
                </div>
                {response.preconditions?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-amber-400 mb-2">Preconditions</h4>
                    <ul className="list-disc list-inside text-amber-100">{response.preconditions.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                )}
                {response.exceptions?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-rose-400 mb-2">Exceptions</h4>
                    <ul className="list-disc list-inside text-rose-100">{response.exceptions.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-center gap-3 text-orange-400 mb-4">
                  {response.type === 'rbac_denial' ? (
                    <Shield className="w-7 h-7" />
                  ) : (
                    <XCircle className="w-7 h-7" />
                  )}
                  <div>
                    <h3 className="font-bold text-white text-lg">
                      {response.type === 'rbac_denial' ? 'Access Denied' : 'Policy Not Found'}
                    </h3>
                    <p className="text-slate-300">{response.message}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-blue-900/20 rounded-xl p-5 border border-blue-500/30">
                  <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-white">{response.recommendedAction}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {auditLog.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-3">Recent queries</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {auditLog.slice(0, 5).map((entry, i) => (
                <li key={i} className="flex justify-between">
                  <span>{entry.query}</span>
                  <span className="text-cyan-400">{entry.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
