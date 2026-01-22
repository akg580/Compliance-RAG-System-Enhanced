import React from 'react';
import SuccessResponse from './SuccessResponse';
import FailureResponse from './FailureResponse';

const ResponseSection = ({ response, userRole }) => {
  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-20 blur"></div>
      
      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        {response.type === 'success' ? (
          <SuccessResponse response={response} />
        ) : (
          <FailureResponse response={response} userRole={userRole} />
        )}
      </div>
    </div>
  );
};

export default ResponseSection;