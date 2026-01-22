import React from 'react';
import { AlertCircle } from 'lucide-react';

const WarningBanner = () => {
  return (
    <div className="mb-6 bg-amber-900/20 border border-amber-600/50 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-amber-300 mb-1">Decision-Support Tool Only</p>
        <p className="text-slate-300">
          This system provides policy references for informational purposes. All lending decisions 
          require human review and approval. Cited policies are subject to updates and interpretation 
          by compliance officers.
        </p>
      </div>
    </div>
  );
};

export default WarningBanner;