import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Shield, ShieldAlert, AlertTriangle, Eye, Download, Info } from 'lucide-react';

export default function Security() {
  const { token, API_BASE } = useAuth();
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-refresh when a new scan event is broadcasted
  useWebSocket('/topic/scans', useCallback((newScan) => {
    if (newScan) {
      setScans(prev => [newScan, ...prev.filter(s => s.id !== newScan.id)]);
    }
  }, []));

  useEffect(() => {
    if (token) {
      fetchScans();
    }
  }, [token]);

  const fetchScans = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setScans(data);
      }
    } catch (e) {
      console.error("Failed to load security scans:", e);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (count, type) => {
    if (count > 5) return <span className="badge badge-error">{count} {type}</span>;
    if (count > 0) return <span className="badge badge-warning">{count} {type}</span>;
    return <span className="badge badge-success">{count} {type}</span>;
  };

  const totalCritical = scans.reduce((acc, curr) => acc + curr.criticalVulnerabilities, 0);
  const totalHigh = scans.reduce((acc, curr) => acc + curr.highVulnerabilities, 0);
  const totalMedium = scans.reduce((acc, curr) => acc + curr.mediumVulnerabilities, 0);
  const totalLow = scans.reduce((acc, curr) => acc + curr.lowVulnerabilities, 0);

  return (
    <div>
      {/* 4 Cards Grid */}
      <div style={grid4Style}>
        <div className="glass-panel" style={{ ...cardStyle, borderLeft: '4px solid #ef4444' }}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>CRITICAL VULNERABILITIES</span>
            <ShieldAlert size={24} color="#ef4444" />
          </div>
          <div style={{ ...cardValueStyle, color: '#ef4444' }}>{totalCritical}</div>
          <div style={cardMetaStyle}>Blocker bugs & secret leaks</div>
        </div>

        <div className="glass-panel" style={{ ...cardStyle, borderLeft: '4px solid #f59e0b' }}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>HIGH RISK BULLETINS</span>
            <AlertTriangle size={24} color="#f59e0b" />
          </div>
          <div style={{ ...cardValueStyle, color: '#f59e0b' }}>{totalHigh}</div>
          <div style={cardMetaStyle}>OWASP CVE dependencies</div>
        </div>

        <div className="glass-panel" style={{ ...cardStyle, borderLeft: '4px solid #facc15' }}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>MEDIUM ANOMALIES</span>
            <AlertTriangle size={24} color="#facc15" />
          </div>
          <div style={{ ...cardValueStyle, color: '#facc15' }}>{totalMedium}</div>
          <div style={cardMetaStyle}>Deprecated libraries & warnings</div>
        </div>

        <div className="glass-panel" style={{ ...cardStyle, borderLeft: '4px solid #06b6d4' }}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>LOW CVE ISSUES</span>
            <Info size={24} color="#06b6d4" />
          </div>
          <div style={{ ...cardValueStyle, color: '#06b6d4' }}>{totalLow}</div>
          <div style={cardMetaStyle}>SonarQube code smell tags</div>
        </div>
      </div>

      <div style={layoutStyle}>
        {/* Left: Scan list */}
        <div className="glass-panel" style={{ flex: 1.2 }}>
          <h3 style={{ marginBottom: '20px' }}>Security Audit Scans History</h3>
          
          {loading ? (
            <div className="flex-center" style={{ padding: '40px' }}>
              <Shield className="animate-spin" size={32} color="#ef4444" />
            </div>
          ) : scans.length === 0 ? (
            <div style={emptyStyle}>No scan records executed yet. Run pipelines to compile reports.</div>
          ) : (
            <div style={listStyle}>
              {scans.map((s) => (
                <div 
                  key={s.id} 
                  style={selectedScan && selectedScan.id === s.id ? activeListItemStyle : listItemStyle}
                  onClick={() => setSelectedScan(s)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ color: '#f3f4f6' }}>Report #{s.id} - {s.scannerType}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        Timestamp: {new Date(s.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
                    >
                      <Eye size={16} />
                    </button>
                  </div>

                  <div style={badgeWrapperStyle}>
                    {getSeverityBadge(s.criticalVulnerabilities, 'Critical')}
                    {getSeverityBadge(s.highVulnerabilities, 'High')}
                    {getSeverityBadge(s.mediumVulnerabilities, 'Medium')}
                    {getSeverityBadge(s.lowVulnerabilities, 'Low')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div style={{ flex: 1 }}>
          <div className="glass-panel" style={{ position: 'sticky', top: '24px' }}>
            <h3>Detailed Threat Intel Report</h3>
            {selectedScan ? (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ color: '#6366f1' }}>{selectedScan.scannerType} Scan Output</h4>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>ID: #{selectedScan.id}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([selectedScan.reportDetails], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = `sec-report-${selectedScan.scannerType}-${selectedScan.id}.txt`;
                      document.body.appendChild(element);
                      element.click();
                    }}
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '6px 12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <Download size={14} /> Export Report
                  </button>
                </div>

                <div 
                  style={{
                    background: '#05070f',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: '#e5e7eb',
                    maxHeight: '350px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4'
                  }}
                >
                  {selectedScan.reportDetails}
                </div>
              </div>
            ) : (
              <div style={emptyReportStyle}>
                Select an audit report to load CVE descriptions and mitigation strategies.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const grid4Style = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
  marginBottom: '24px',
};

const cardStyle = {
  padding: '20px',
  position: 'relative',
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const cardTitleStyle = {
  fontSize: '0.8rem',
  fontWeight: '700',
  color: '#6b7280',
  letterSpacing: '0.05em',
};

const cardValueStyle = {
  fontSize: '2.25rem',
  fontWeight: '800',
  lineHeight: '1',
  marginBottom: '6px',
};

const cardMetaStyle = {
  fontSize: '0.85rem',
  color: '#9ca3af',
};

const layoutStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '24px',
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const listItemStyle = {
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  borderRadius: '12px',
  padding: '16px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  width: '100%',
  textAlign: 'left',
};

const activeListItemStyle = {
  ...listItemStyle,
  background: 'rgba(239, 68, 68, 0.02)',
  borderColor: 'rgba(239, 68, 68, 0.2)',
};

const badgeWrapperStyle = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
  flexWrap: 'wrap',
};

const emptyStyle = {
  padding: '40px 0',
  textAlign: 'center',
  color: '#6b7280',
  fontStyle: 'italic',
};

const emptyReportStyle = {
  padding: '60px 0',
  textAlign: 'center',
  color: '#6b7280',
  fontStyle: 'italic',
  fontSize: '0.9rem',
};
