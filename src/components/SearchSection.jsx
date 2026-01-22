import React from 'react';
import { Search, Sparkles } from 'lucide-react';

const SearchSection = ({ query, setQuery, isLoading, searchPolicy, handleKeyPress }) => {
  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-500"></div>
      
      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <label className="text-sm font-bold text-white uppercase tracking-wide">
            Policy Query
          </label>
        </div>
        
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about lending policies, compliance requirements, or regulatory standards..."
            className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all backdrop-blur-sm"
            rows={4}
          />
        </div>
        
        <button
          onClick={searchPolicy}
          disabled={isLoading || !query.trim()}
          className="mt-4 w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-cyan-500/50 disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Policy Database...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Search Policies</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SearchSection;