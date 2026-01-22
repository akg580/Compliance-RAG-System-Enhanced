import React from 'react';
import { Zap } from 'lucide-react';

const SampleQueries = ({ setQuery }) => {
  const queries = [
    {
      title: 'CRE LTV Query',
      query: 'What is the LTV ratio for commercial real estate in Zone B?',
      icon: '🏢'
    },
    {
      title: 'Mortgage Standards',
      query: 'What is the minimum credit score for residential mortgages?',
      icon: '🏠'
    },
    {
      title: 'Basel III Capital',
      query: 'Basel III capital requirements for corporate exposures',
      icon: '📊'
    }
  ];

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition"></div>
      
      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-white uppercase tracking-wide text-sm">Quick Start</h3>
        </div>
        
        <div className="space-y-2">
          {queries.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(item.query)}
              className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-lg transition-all group/btn"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white group-hover/btn:text-purple-300 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    Click to use
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SampleQueries;