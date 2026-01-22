import React from 'react';
import { Database, Activity } from 'lucide-react';

const StatsCard = () => {
  const stats = [
    { label: 'Policies Indexed', value: '847', color: 'text-blue-400' },
    { label: 'Citation Coverage', value: '100%', color: 'text-green-400' },
    { label: 'Avg Response', value: '2.3s', color: 'text-cyan-400' },
    { label: 'Refusal Rate', value: '8%', color: 'text-purple-400' }
  ];

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition"></div>
      
      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-2 mb-5">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white uppercase tracking-wide text-sm">System Status</h3>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400 font-medium">Live</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white/5 rounded-lg p-3 border border-white/10">
              <span className="text-sm text-slate-300">{stat.label}</span>
              <span className={`font-bold text-lg ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;