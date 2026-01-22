import React from 'react';
import { Lock, ChevronDown, ChevronUp } from 'lucide-react';

const SystemArchitecture = ({ showArchitecture, setShowArchitecture }) => {
  const steps = [
    { num: 1, title: 'RBAC Filter', desc: 'Role-based access control', color: 'blue' },
    { num: 2, title: 'Semantic Search', desc: 'Policy retrieval with chunking', color: 'green' },
    { num: 3, title: 'Citation Validator', desc: 'Mandatory citation extraction', color: 'purple' },
    { num: 4, title: 'Confidence Check', desc: 'Threshold-based refusal (≥70%)', color: 'orange' },
    { num: 5, title: 'Audit Logger', desc: 'Immutable query logs', color: 'red' }
  ];

  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30'
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition"></div>
      
      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        <button
          onClick={() => setShowArchitecture(!showArchitecture)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white uppercase tracking-wide text-sm">Architecture</h3>
          </div>
          {showArchitecture ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        {showArchitecture && (
          <div className="border-t border-white/20 p-5">
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${colorClasses[step.color]}`}>
                    <span className="font-bold text-sm">{step.num}</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="font-bold text-white text-sm">{step.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemArchitecture;