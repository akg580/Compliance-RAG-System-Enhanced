import React from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

const AuditLog = ({ auditLog, showAudit, setShowAudit }) => {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition"></div>
      
      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-green-400" />
            <h3 className="font-bold text-white uppercase tracking-wide text-sm">Audit Log</h3>
            <span className="px-2.5 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-full border border-green-500/30">
              {auditLog.length}
            </span>
          </div>
          {showAudit ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        {showAudit && (
          <div className="border-t border-white/20 p-4 max-h-96 overflow-y-auto">
            {auditLog.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No queries yet</p>
            ) : (
              <div className="space-y-3">
                {auditLog.map((log, idx) => (
                  <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        log.status === 'SUCCESS' 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                        log.status === 'RBAC_DENIED' 
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                          'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-white text-sm mb-1 font-medium">
                      {log.user}
                    </p>
                    <p className="text-slate-300 text-xs truncate mb-2">
                      {log.query}
                    </p>
                    {log.confidence !== undefined && (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-500"
                            style={{ width: `${log.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-cyan-400 font-bold">{log.confidence}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;