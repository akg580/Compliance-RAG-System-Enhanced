import React, { useState, useCallback, useEffect } from 'react';
import { Search, Shield, Sparkles, TrendingUp, CheckCircle, Zap, Bell, User, Activity, FileText, Send } from 'lucide-react';
import { queryPolicy, healthCheck } from './services/api';
import './index.css';

function App() {
  const [userRole, setUserRole] = useState('Senior Loan Officer');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [auditLog, setAuditLog] = useState([]);

  // Stats
  const stats = {
    policiesIndexed: 847,
    citationCoverage: 100,
    avgResponse: 2.3,
    refusalRate: 8,
  };

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      await healthCheck();
      setBackendStatus('connected');
    } catch {
      setBackendStatus('disconnected');
    }
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);

    try {
      const apiResponse = await queryPolicy(query, userRole);
      setResponse(apiResponse);
      setAuditLog(prev => [...prev, {
        timestamp: new Date().toISOString(),
        query,
        status: apiResponse.success ? 'SUCCESS' : 'FAILED',
        confidence: apiResponse.confidence
      }]);
    } catch (error) {
      setResponse({
        success: false,
        message: 'Connection error. Please check backend.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, userRole]);

  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  setUploading(true);
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('policy_id', 'POL-' + Date.now());
  formData.append('name', file.name.replace('.pdf', ''));
  formData.append('required_role', 'Junior Officer');
  formData.append('risk_level', 'Low');
  
  try {
    const response = await fetch('http://localhost:8000/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    alert(`✅ Uploaded! ${data.chunks_created} chunks created from ${data.policy_id}`);
  } catch (err) {
    alert('❌ Upload failed: ' + err.message);
  } finally {
    setUploading(false);
  }
};

  const quickActions = [
    { icon: '🏢', title: 'CRE LTV Query', subtitle: 'Click to use' },
    { icon: '🏠', title: 'Mortgage Standards', subtitle: 'Click to use' },
    { icon: '📊', title: 'LTV Criteria', subtitle: 'Click to use' },
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e293b 100%)',
      fontFamily: 'Outfit, sans-serif',
      color: '#fff'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.9) 0%, rgba(49, 46, 129, 0.9) 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.5rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(252, 211, 77, 0.3)'
            }}>
              <Shield size={28} color="#1e3a8a" strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ 
                fontSize: '1.75rem', 
                fontWeight: '800',
                background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
                lineHeight: 1.2
              }}>
                Compliance RAG System
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                Enterprise Knowledge Assistant
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="rgba(255, 255, 255, 0.7)" />
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="Junior Officer" style={{ background: '#1e3a8a' }}>Junior Officer</option>
                <option value="Senior Loan Officer" style={{ background: '#1e3a8a' }}>Senior Loan Officer</option>
                <option value="Credit Manager" style={{ background: '#1e3a8a' }}>Credit Manager</option>
                <option value="Risk Officer" style={{ background: '#1e3a8a' }}>Risk Officer</option>
                <option value="Senior Management" style={{ background: '#1e3a8a' }}>Senior Management</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>

          
          {/* Left Column */}
          <div>
            {/* Search Panel */}
            <div style={{
              background: 'rgba(30, 58, 138, 0.4)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}>

              {/* Upload Section */}
<div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
  <label style={{
    display: 'block',
    padding: '1.25rem',
    background: 'rgba(255,255,255,0.05)',
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: uploading ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s',
    opacity: uploading ? 0.6 : 1
  }}
  onMouseEnter={(e) => !uploading && (e.currentTarget.style.borderColor = 'rgba(252, 211, 77, 0.5)')}
  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}>
    <input
      type="file"
      accept=".pdf"
      onChange={handleFileUpload}
      style={{ display: 'none' }}
      disabled={uploading}
    />
    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>
      {uploading ? 'Uploading...' : 'Upload Policy PDF'}
    </div>
    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
      Click to browse or drag and drop
    </div>
  </label>
</div>


              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Sparkles size={24} color="#FCD34D" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>POLICY QUERY</h2>
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSearch())}
                placeholder="Ask about lending policies, compliance requirements, or regulatory standards..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '1rem',
                  resize: 'none',
                  outline: 'none',
                  marginBottom: '1.5rem',
                  fontFamily: 'Outfit, sans-serif'
                }}
              />

              <button
                onClick={handleSearch}
                disabled={isLoading || !query.trim()}
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: isLoading ? '#64748b' : 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                }}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%' }}></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Search Policies
                  </>
                )}
              </button>





              
            </div>

            {/* Results */}
            {response && (
              <div style={{
                background: 'rgba(30, 58, 138, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
              }} className="animate-fadeIn">
                {response.success ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <CheckCircle size={32} color="#10B981" />
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Policy Found</h3>
                        <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                          Confidence: <strong style={{ color: '#10B981' }}>{response.confidence}%</strong>
                        </p>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      marginBottom: '1.5rem'
                    }}>
                      <p style={{ fontSize: '1rem', lineHeight: '1.7', margin: 0 }}>{response.answer}</p>
                    </div>

                    {response.citations && response.citations.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} />
                          CITATIONS
                        </h4>
                        {response.citations.map((citation, idx) => (
                          <div key={idx} style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '1rem',
                            marginBottom: '0.75rem'
                          }}>
                            <p style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{citation.policy_name}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                              <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px' }}>
                                {citation.policy_id}
                              </span>
                              <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px' }}>
                                v{citation.version}
                              </span>
                              {citation.page && (
                                <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px' }}>
                                  Page {citation.page}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Activity size={48} color="#F59E0B" style={{ margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>No Policy Found</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{response.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div>
            {/* System Status */}
            <div style={{
              background: 'rgba(30, 58, 138, 0.4)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Activity size={18} />
                  SYSTEM STATUS
                </h3>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: backendStatus === 'connected' ? '#10B981' : '#EF4444',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}>
                  ● {backendStatus === 'connected' ? 'Live' : 'Offline'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Policies Indexed</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#60A5FA' }}>{stats.policiesIndexed}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Citation Coverage</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10B981' }}>{stats.citationCoverage}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Avg Response</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#60A5FA' }}>{stats.avgResponse}s</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Refusal Rate</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#F472B6' }}>{stats.refusalRate}%</span>
                </div>
              </div>
            </div>

            {/* Quick Start */}
            <div style={{
              background: 'rgba(30, 58, 138, 0.4)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} color="#FCD34D" />
                QUICK START
              </h3>

              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(action.title)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(252, 211, 77, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}>
                    {action.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff', margin: 0 }}>{action.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>{action.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;