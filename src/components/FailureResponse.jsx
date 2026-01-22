import React from 'react';
import { XCircle, Shield, Lightbulb } from 'lucide-react';

const FailureResponse = ({ response, userRole }) => {
  const isRBACDenial = response.type === 'rbac_denial';
  
  return (
    <div>
      <div className={`${
        isRBACDenial 
          ? 'bg-gradient-to-r from-orange-600/30 to-red-600/30' 
          : 'bg-gradient-to-r from-red-600/30 to-rose-600/30'
      } border-b border-white/20 px-6 py-5 flex items-center space-x-3 backdrop-blur-sm`}>
        {isRBACDenial ? (
          <Shield className="w-7 h-7 text-orange-400" strokeWidth={2.5} />
        ) : (
          <XCircle className="w-7 h-7 text-red-400" strokeWidth={2.5} />
        )}
        <div>
          <h3 className="font-bold text-white text-lg">
            {isRBACDenial ? 'Access Denied' : 'Policy Not Found'}
          </h3>
          <p className={`text-sm ${
            isRBACDenial ? 'text-orange-300' : 'text-red-300'
          }`}>
            {response.message}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {isRBACDenial && (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-orange-500/30 rounded-xl p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Policy Name</span>
                <span className="text-white font-semibold">{response.policyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Required Role</span>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-lg text-sm font-bold border border-orange-500/30">
                  {response.requiredRole}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Your Role</span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-bold border border-blue-500/30">
                  {userRole}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-wide">
                Recommended Action
              </p>
              <p className="text-white leading-relaxed">{response.recommendedAction}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FailureResponse;