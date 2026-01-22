import React, { useState, useCallback, useMemo } from 'react';
import { Search, Shield, FileText, AlertTriangle, CheckCircle, XCircle, User, Clock, Database, Lock, ChevronDown, ChevronUp, ExternalLink, Info, Activity, Zap, Sparkles, Lightbulb } from 'lucide-react';

const POLICY_DATABASE = {
  'CRE-001-v2.3': {
    name: 'Commercial Real Estate Lending Policy',
    version: 'v2.3',
    effectiveDate: '2024-01-15',
    sections: {
      '4.2.1': {
        text: 'Maximum Loan-to-Value (LTV) ratio for commercial real estate in Zone B shall not exceed 75% for stabilized properties.',
        page: 12,
        conditions: ['Property must be stabilized', 'Independent appraisal required'],
        exceptions: ['LTV may reach 80% with DSCR >=1.35 and Senior Credit Committee approval']
      }
    },
    requiredRole: 'Senior Loan Officer',
    riskLevel: 'Medium'
  },
  'RES-003-v1.8': {
    name: 'Residential Mortgage Underwriting Standards',
    version: 'v1.8',
    effectiveDate: '2024-02-01',
    sections: {
      '2.1.3': {
        text: 'Minimum credit score for conventional residential mortgages is 620. Borrowers must demonstrate 24 months of stable employment history.',
        page: 8,
        conditions: ['24 months stable employment', 'Debt-to-Income ratio <=43%'],
        exceptions: ['DTI may reach 50% with compensating factors: 12+ months reserves, credit score >720, or 20%+ down payment']
      }
    },
    requiredRole: 'Junior Officer',
    riskLevel: 'Low'
  },
  'BASEL-III-2024': {
    name: 'Basel III Capital Requirements Framework',
    version: 'v4.2',
    effectiveDate: '2024-01-01',
    sections: {
      '3.1.1': {
        text: 'Common Equity Tier 1 (CET1) capital ratio must be maintained at minimum 4.5% of risk-weighted assets. Capital conservation buffer of 2.5% must be maintained above minimum requirements.',
        page: 45,
        conditions: ['Applies to all corporate exposures', 'Monthly reporting required'],
        exceptions: []
      }
    },
    requiredRole: 'Risk Officer',
    riskLevel: 'High'
  },
  'AUTO-LOAN-v2.1': {
    name: 'Auto Loan Origination Policy',
    version: 'v2.1',
    effectiveDate: '2023-12-01',
    sections: {
      '1.2.4': {
        text: 'Maximum auto loan term is 72 months for new vehicles and 60 months for used vehicles. Prime rate applies to borrowers with credit score >=720.',
        page: 5,
        conditions: ['Vehicle age restrictions apply', 'Maximum LTV 110% for new vehicles'],
        exceptions: ['Extended terms available for electric vehicles up to 84 months']
      }
    },
    requiredRole: 'Junior Officer',
    riskLevel: 'Low'
  }
};

const ROLE_HIERARCHY = {
  'Junior Officer': ['Junior Officer'],
  'Senior Loan Officer': ['Junior Officer', 'Senior Loan Officer'],
  'Credit Manager': ['Junior Officer', 'Senior Loan Officer', 'Credit Manager'],
  'Risk Officer': ['Junior Officer', 'Senior Loan Officer', 'Credit Manager', 'Risk Officer'],
  'Senior Management': ['Junior Officer', 'Senior Loan Officer', 'Credit Manager', 'Risk Officer', 'Senior Management']
};

const processQuery = (query, userRole) => {
  let matchedPolicy = null;
  let matchedSection = null;
  let confidence = 0;

  const queryLower = query.toLowerCase();

  if (queryLower.includes('ltv') && queryLower.includes('commercial')) {
    matchedPolicy = POLICY_DATABASE['CRE-001-v2.3'];
    matchedSection = matchedPolicy.sections['4.2.1'];
    confidence = 92;
  } else if (queryLower.includes('basel') || queryLower.includes('capital requirement')) {
    matchedPolicy = POLICY_DATABASE['BASEL-III-2024'];
    matchedSection = matchedPolicy.sections['3.1.1'];
    confidence = 88;
  } else if (queryLower.includes('credit score') && queryLower.includes('mortgage')) {
    matchedPolicy = POLICY_DATABASE['RES-003-v1.8'];
    matchedSection = matchedPolicy.sections['2.1.3'];
    confidence = 90;
  } else if (queryLower.includes('auto loan')) {
    matchedPolicy = POLICY_DATABASE['AUTO-LOAN-v2.1'];
    matchedSection = matchedPolicy.sections['1.2.4'];
    confidence = 85;
  }

  if (matchedPolicy) {
    const hasAccess = ROLE_HIERARCHY[userRole].includes(matchedPolicy.requiredRole);
    
    if (!hasAccess) {
      return {
        type: 'rbac_denial',
        message: 'Insufficient access permissions',
        policyName: matchedPolicy.name,
        requiredRole: matchedPolicy.requiredRole,
        recommendedAction: `Consult ${matchedPolicy.requiredRole} or Risk Officer for this information`
      };
    }
  }

  if (!matchedPolicy || confidence < 70) {
    return {
      type: 'no_policy',
      message: 'No definitive policy found for this query',
      recommendedAction: 'Please refine your query or consult the Policy Documentation Team',
      searchedTerms: query
    };
  }

  return {
    type: 'success',
    answer: matchedSection.text,
    citation: {
      policyId: Object.keys(POLICY_DATABASE).find(key => POLICY_DATABASE[key] === matchedPolicy),
      policyName: matchedPolicy.name,
      version: matchedPolicy.version,
      section: Object.keys(matchedPolicy.sections)[0],
      page: matchedSection.page,
      effectiveDate: matchedPolicy.effectiveDate
    },
    preconditions: matchedSection.conditions,
    exceptions: matchedSection.exceptions,
    confidence: confidence,
    riskLevel: matchedPolicy.riskLevel
  };
};

function App() {
  const [userRole, setUserRole] = useState('Senior Loan Officer');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);

  const searchPolicy = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      user: userRole,
      query: query,
      status: 'Processing'
    };

    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = processQuery(query, userRole);
    
    if (result.type === 'rbac_denial') {
      logEntry.status = 'RBAC_DENIED';
      logEntry.reason = 'Insufficient permissions';
    } else if (result.type === 'no_policy') {
      logEntry.status = 'NO_MATCH';
      logEntry.confidence = 0;
    } else {
      logEntry.status = 'SUCCESS';
      logEntry.confidence = result.confidence;
      logEntry.citationCount = 1;
    }

    setAuditLog(prev => [logEntry, ...prev]);
    setResponse(result);
    setIsLoading(false);
  }, [query, userRole]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      searchPolicy();
    }
  }, [searchPolicy]);

  const sampleQueries = useMemo(() => [
    {
      emoji: '🏢',
      title: 'CRE LTV Query',
      query: 'What is the LTV ratio for commercial real estate in Zone B?'
    },
    {
      emoji: '🏠',
      title: 'Mortgage Standards',
      query: 'What is the minimum credit score for residential mortgages?'
    },
    {
      emoji: '📊',
      title: 'Basel III Capital',
      query: 'Basel III capital requirements for corporate exposures'
    }
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>
      
      {/* Header */}
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
                aria-label="Select user role"
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
      
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Section */}
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
                    aria-label="Policy query input"
                  />
                </div>
                
                <button
                  onClick={searchPolicy}
                  disabled={isLoading || !query.trim()}
                  className="mt-4 w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-cyan-500/50 disabled:transform-none disabled:shadow-none"
                  aria-label="Search policies"
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

            {/* Response Section */}
            {response && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-20 blur"></div>
                
                <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                  {response.type === 'success' ? (
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
                  ) : (
                    <div>
                      <div className={`${
                        response.type === 'rbac_denial' 
                          ? 'bg-gradient-to-r from-orange-600/30 to-red-600/30' 
                          : 'bg-gradient-to-r from-red-600/30 to-rose-600/30'
                      } border-b border-white/20 px-6 py-5 flex items-center space-x-3 backdrop-blur-sm`}>
                        {response.type === 'rbac_denial' ? (
                          <Shield className="w-7 h-7 text-orange-400" strokeWidth={2.5} />
                        ) : (
                          <XCircle className="w-7 h-7 text-red-400" strokeWidth={2.5} />
                        )}
                        <div>
                          <h3 className="font-bold text-white text-lg">
                            {response.type === 'rbac_denial' ? 'Access Denied' : 'Policy Not Found'}
                          </h3>
                          <p className={`text-sm ${
                            response.type === 'rbac_denial' ? 'text-orange-300' : 'text-red-300'
                          }`}>
                            {response.message}
                          </p>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        {response.type === 'rbac_denial' && (
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
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
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
                  <div className="flex justify-between items-center bg-white/5 rounded-lg p-3 border border-white/10">
                    <span className="text-sm text-slate-300">Policies Indexed</span>
                    <span className="font-bold text-lg text-blue-400">847</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 rounded-lg p-3 border border-white/10">
                    <span className="text-sm text-slate-300">Citation Coverage</span>
                    <span className="font-bold text-lg text-green-400">100%</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 rounded-lg p-3 border border-white/10">
                    <span className="text-sm text-slate-300">Avg Response</span>
                    <span className="font-bold text-lg text-cyan-400">2.3s</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 rounded-lg p-3 border border-white/10">
                    <span className="text-sm text-slate-300">Refusal Rate</span>
                    <span className="font-bold text-lg text-purple-400">8%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Queries */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition"></div>
              
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white uppercase tracking-wide text-sm">Quick Start</h3>
                </div>
                
                <div className="space-y-2">
                  {sampleQueries.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(sample.query)}
                      className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-lg transition-all group/btn"
                      aria-label={`Use sample query: ${sample.title}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{sample.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white group-hover/btn:text-purple-300 transition-colors">
                            {sample.title}
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

            {/* Audit Log */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition"></div>
              
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                <button
                  onClick={() => setShowAudit(!showAudit)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  aria-label={showAudit ? "Hide audit log" : "Show audit log"}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-white uppercase tracking-wide text-sm">Audit Log</h3>
                    <span className="px-2.5 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-full border border-green-500/30">
                      {auditLog.length}
                    </span>
                  </div>
                  {showAudit ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                
                {showAudit && (
                  <div className="border-t border-white/20 p-4 max-h-96 overflow-y-auto">
                    {auditLog.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">No queries yet</p>
                    ) : (
                      <div className="space-y-3">
                        {auditLog.map((log, idx) => (
                          <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                            <div className="flex items-start justify-between mb-2">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                log.status === 'SUCCESS' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                log.status === 'RBAC_DENIED' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {log.status}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-white text-sm mb-1 font-medium">{log.user}</p>
                            <p className="text-slate-300 text-xs truncate mb-2">{log.query}</p>
                            {log.confidence !== undefined && (
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-500"
                                    style={{ width: `${log.confidence}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-cyan-400 font-bold">{log.confidence}%</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* System Architecture */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition"></div>
              
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                <button
                  onClick={() => setShowArchitecture(!showArchitecture)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  aria-label={showArchitecture ? "Hide architecture details" : "Show architecture details"}
                >
                  <div className="flex items-center space-x-2">
                    <Lock className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-bold text-white uppercase tracking-wide text-sm">Architecture</h3>
                  </div>
                  {showArchitecture ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                
                {showArchitecture && (
                  <div className="border-t border-white/20 p-5">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border bg-blue-500/20 text-blue-300 border-blue-500/30">
                          <span className="font-bold text-sm">1</span>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="font-bold text-white text-sm">RBAC Filter</p>
                          <p className="text-xs text-slate-400 mt-0.5">Role-based access control</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border bg-green-500/20 text-green-300 border-green-500/30">
                          <span className="font-bold text-sm">2</span>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="font-bold text-white text-sm">Semantic Search</p>
                          <p className="text-xs text-slate-400 mt-0.5">Policy retrieval with chunking</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border bg-purple-500/20 text-purple-300 border-purple-500/30">
                          <span className="font-bold text-sm">3</span>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="font-bold text-white text-sm">Citation Validator</p>
                          <p className="text-xs text-slate-400 mt-0.5">Mandatory citation extraction</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border bg-orange-500/20 text-orange-300 border-orange-500/30">
                          <span className="font-bold text-sm">4</span>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="font-bold text-white text-sm">Confidence Check</p>
                          <p className="text-xs text-slate-400 mt-0.5">Threshold-based refusal (≥70%)</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border bg-red-500/20 text-red-300 border-red-500/30">
                          <span className="font-bold text-sm">5</span>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="font-bold text-white text-sm">Audit Logger</p>
                          <p className="text-xs text-slate-400 mt-0.5">Immutable query logs</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;