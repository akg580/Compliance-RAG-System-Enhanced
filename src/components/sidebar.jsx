import React, { useState } from 'react';
import StatsCard from './StatsCard';
import SampleQueries from './SampleQueries';
import AuditLog from './AuditLog';
import SystemArchitecture from './SystemArchitecture';

const Sidebar = ({ auditLog, setQuery }) => {
  const [showAudit, setShowAudit] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);

  return (
    <div className="space-y-6">
      <StatsCard />
      <SampleQueries setQuery={setQuery} />
      <AuditLog 
        auditLog={auditLog} 
        showAudit={showAudit} 
        setShowAudit={setShowAudit} 
      />
      <SystemArchitecture 
        showArchitecture={showArchitecture} 
        setShowArchitecture={setShowArchitecture} 
      />
    </div>
  );
};

export default Sidebar;