import React from 'react';
import { CheckCircle, FileText, ExternalLink, Info, AlertTriangle, TrendingUp } from 'lucide-react';

const SuccessResponse = ({ response }) => {
  return (
    <div>
      <div className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-b border-white/20 px-6 py-5 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-7 h-7 text-green-400" strokeWidth={2.5} />
          <div>
            <h3 className="font-bold text-white text-lg">Policy Retrieved</h3>
            <p className="text-sm text-green-300">High confidence match</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{response.confidence}%</div>
            <div className="text-xs text-slate-300">Confidence</div>
          </div>
          <div className={`px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm ${
            response.riskLevel === 'High' ? 'bg-red-500/30 text-red-200 border border-red-400/50' :
            response.riskLevel === 'Medium' ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50' :
            'bg-blue-500/30 text-blue-200 border border-blue-400/50'
          }`}>
            {response.riskLevel} Risk
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="relative">
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
          <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center pl-3">
            <FileText className="w-4 h-4 mr-2" />
            POLICY TEXT
          </h4>
          <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-5 ml-3">
            <p className="text-white leading-relaxed text-base">{response.answer}</p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
          <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center pl-3">
            <ExternalLink className="w-4 h-4 mr-2" />
            CITATION METADATA
          </h4>
          <div className="bg-purple-900/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-5 ml-3">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Policy ID</span>
                <p className="font-mono text-purple-300 font-bold mt-1">{response.citation.policyId}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Version</span>
                <p className="font-bold text-purple-300 mt-1">{response.citation.version}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Section</span>
                <p className="font-mono text-purple-300 font-bold mt-1">{response.citation.section}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Page</span>
                <p className="font-bold text-purple-300 mt-1">{response.citation.page}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-purple-500/30">
              <span className="text-xs text-slate-400 uppercase tracking-wide">Policy Name</span>
              <p className="font-bold text-white mt-1">{response.citation.policyName}</p>
              <p className="text-xs text-slate-400 mt-2">Effective: {response.citation.effectiveDate}</p>
            </div>
          </div>
        </div>

        {response.preconditions.length > 0 && (
          <div className="relative">
            <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
            <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center pl-3">
              <Info className="w-4 h-4 mr-2" />
              PRECONDITIONS
            </h4>
            <div className="bg-amber-900/20 backdrop-blur-sm border border-amber-500/30 rounded-xl p-5 ml-3">
              <ul className="space-y-2">
                {response.preconditions.map((cond, idx) => (
                  <li key={idx} className="flex items-start text-amber-100">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {response.exceptions.length > 0 && (
          <div className="relative">
            <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-pink-500 rounded-full"></div>
            <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center pl-3">
              <AlertTriangle className="w-4 h-4 mr-2" />
              EXCEPTIONS
            </h4>
            <div className="bg-rose-900/20 backdrop-blur-sm border border-rose-500/30 rounded-xl p-5 ml-3">
              <ul className="space-y-2">
                {response.exceptions.map((exc, idx) => (
                  <li key={idx} className="flex items-start text-rose-100">
                    <span className="w-2 h-2 bg-rose-400 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                    <span>{exc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessResponse;