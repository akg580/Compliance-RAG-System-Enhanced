import React from 'react';
import { Shield, User } from 'lucide-react';

const Header = ({ userRole, setUserRole }) => {
  return (
    <header className="relative bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50"></div>
              <Shield className="relative w-10 h-10 text-blue-400" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Compliance RAG System
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Enterprise Knowledge Assistant
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-slate-400" />
            <select 
              value={userRole} 
              onChange={(e) => setUserRole(e.target.value)}
              className="px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:bg-white/20 cursor-pointer"
            >
              <option className="bg-slate-800">Junior Officer</option>
              <option className="bg-slate-800">Senior Loan Officer</option>
              <option className="bg-slate-800">Credit Manager</option>
              <option className="bg-slate-800">Risk Officer</option>
              <option className="bg-slate-800">Senior Management</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;