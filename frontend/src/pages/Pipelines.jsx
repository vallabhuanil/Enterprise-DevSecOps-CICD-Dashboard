import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import Terminal from '../components/Terminal';
import { Play, RotateCcw, Plus, Activity, Cpu } from 'lucide-react';

export default function Pipelines() {
  const { token, API_BASE, user } = useAuth();
  const [pipelines, setPipelines] = useState([]);
  const [repos, setRepos] = useState([]);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [activeBuildId, setActiveBuildId] = useState(null);
  const [liveLogs, setLiveLogs] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep a ref to token so async callbacks don't capture stale values
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; });

  // ─────────────────────────────────────────────────────────────────────
  // Bug fix: stable WebSocket callbacks via useCallback
  // Previously these were inline arrows → new reference each render →
  // the (old) useWebSocket hook reconnected on every render cycle.
  // ─────────────────────────────────────────────────────────────────────

  // 1. Pipeline status updates — merge into list, don't replace wholesale
  const handlePipelineUpdate = useCallback((updatedPipeline) => {
    if (!updatedPipeline || !updatedPipeline.id) {
      console.warn('[Pipelines] Received invalid pipeline WS payload:', updatedPipeline);
      return;
    }
    setPipelines(prev => {
      const exists = prev.some(p => p.id === updatedPipeline.id);
      if (exists) {
        return prev.map(p => p.id === updatedPipeline.id ? updatedPipeline : p);
      }
      // Pipeline was just created — append it
      return [...prev, updatedPipeline];
    });
  }, []);

  // 2. Live build log lines — append only, never replace
  const handleLogLine = useCallback((newLogLine) => {
    if (typeof newLogLine !== 'string') return;
    setLiveLogs(prev => prev + newLogLine);
  }, []);

  useWebSocket('/topic/pipelines', handlePipelineUpdate);
  useWebSocket(activeBuildId ? `/topic/logs/${activeBuildId}` : null, handleLogLine);

  // ─────────────────────────────────────────────────────────────────────
  // Fetch on mount
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      fetchPipelines();
      fetchRepos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchPipelines = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/pipelines`, {
        headers: { 'Authorization': `Bearer ${tokenRef.current}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPipelines(data);
      }
    } catch (e) {
      console.error('[Pipelines] fetchPipelines error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepos = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/repos`, {
        headers: { 'Authorization': `Bearer ${tokenRef.current}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRepos(data);
        if (data.length > 0) setSelectedRepoId(data[0].id);
      }
    } catch (e) {
      console.error('[Pipelines] fetchRepos error:', e);
    }
  };

  const handleCreatePipeline = async (e) => {
    e.preventDefault();
    if (!newPipelineName || !selectedRepoId) return;
    try {
      const response = await fetch(`${API_BASE}/api/pipelines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenRef.current}`
        },
        body: JSON.stringify({ name: newPipelineName, repositoryId: Number(selectedRepoId) })
      });
      if (response.ok) {
        setNewPipelineName('');
        fetchPipelines();
      }
    } catch (e) {
      console.error('[Pipelines] handleCreatePipeline error:', e);
    }
  };

  const handleTrigger = async (id) => {
    setLiveLogs('Connecting secure console logs WebSocket channel...\n');
    setSelectedPipelineId(id);
    try {
      const response = await fetch(`${API_BASE}/api/pipelines/${id}/trigger`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenRef.current}` }
      });
      if (response.ok) {
        // Small delay to let the backend create the Build record
        setTimeout(() => fetchLatestBuildForPipeline(id), 500);
      }
    } catch (e) {
      console.error('[Pipelines] handleTrigger error:', e);
    }
  };

  const handleRetry = async (id) => {
    setLiveLogs('Retrying compilation stages from failed nodes...\n');
    setSelectedPipelineId(id);
    try {
      const response = await fetch(`${API_BASE}/api/pipelines/${id}/retry`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenRef.current}` }
      });
      if (response.ok) {
        setTimeout(() => fetchLatestBuildForPipeline(id), 500);
      }
    } catch (e) {
      console.error('[Pipelines] handleRetry error:', e);
    }
  };

  const fetchLatestBuildForPipeline = async (pipelineId) => {
    try {
      const response = await fetch(`${API_BASE}/api/builds`, {
        headers: { 'Authorization': `Bearer ${tokenRef.current}` }
      });
      if (response.ok) {
        const builds = await response.json();
        if (!Array.isArray(builds)) return;
        const pipelineBuilds = builds.filter(b => b.pipeline && b.pipeline.id === pipelineId);
        if (pipelineBuilds.length > 0) {
          const latest = pipelineBuilds.sort((a, b) => b.id - a.id)[0];
          setActiveBuildId(latest.id);
          // Seed existing logs; WebSocket will append new lines
          setLiveLogs(latest.logs || '');
        }
      }
    } catch (e) {
      console.error('[Pipelines] fetchLatestBuildForPipeline error:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Pure helpers — declared outside render so they're stable references
  // ─────────────────────────────────────────────────────────────────────
  const getStageBadgeColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'badge-success';
      case 'FAILED':  return 'badge-error';
      case 'RUNNING': return 'badge-warning animate-pulse';
      default:        return 'badge-pending';
    }
  };

  const getOverallBadgeColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'badge-success';
      case 'FAILED':  return 'badge-error';
      case 'RUNNING': return 'badge-warning';
      default:        return 'badge-pending';
    }
  };

  const canTrigger = user?.roles?.some(r => r.includes('ADMIN') || r.includes('DEVOPS') || r.includes('DEVELOPER'));

  return (
    <div>
      <div style={layoutStyle}>
        {/* ── Left Column: Pipeline List & Creator ── */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Creator form — only shown when user has repos and trigger rights */}
          {canTrigger && repos.length > 0 && (
            <div className="glass-panel">
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="#6366f1" />
                Register New CI/CD Pipeline
              </h3>
              <form onSubmit={handleCreatePipeline} style={formStyle}>
                <div style={{ flex: 1.5 }}>
                  <label style={labelStyle}>Pipeline Name</label>
                  <input
                    type="text"
                    placeholder="E.g. Webhook Autocommit Jenkins Run"
                    value={newPipelineName}
                    onChange={(e) => setNewPipelineName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Link Repository Integration</label>
                  <select
                    value={selectedRepoId}
                    onChange={(e) => setSelectedRepoId(e.target.value)}
                    className="form-input"
                    style={{ background: '#111827' }}
                  >
                    {repos.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.branch})</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '46px', alignSelf: 'flex-end', border: 'none', cursor: 'pointer' }}
                >
                  Register Pipeline
                </button>
              </form>
            </div>
          )}

          {/* Pipelines list */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '20px' }}>Orchestrated Pipelines ({pipelines.length})</h3>

            {loading ? (
              <div className="flex-center" style={{ padding: '40px' }}>
                <Activity className="animate-spin" size={32} color="#6366f1" />
              </div>
            ) : pipelines.length === 0 ? (
              <div style={emptyStyle}>No pipelines registered yet. Register a repo integration first.</div>
            ) : (
              <div style={listStyle}>
                {pipelines.map((p) => {
                  const isActive = selectedPipelineId === p.id;
                  const stages = Array.isArray(p.stages) ? p.stages : [];
                  return (
                    <div
                      key={p.id}
                      style={isActive ? activeListItemStyle : listItemStyle}
                      onClick={() => {
                        setSelectedPipelineId(p.id);
                        fetchLatestBuildForPipeline(p.id);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ color: '#f3f4f6' }}>{p.name}</h4>
                          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                            Branch: {p.branch} / Trigger: {p.triggerType}
                          </span>
                        </div>
                        <span className={`badge ${getOverallBadgeColor(p.status)}`}>
                          {p.status}
                        </span>
                      </div>

                      {/* Stage cards */}
                      {stages.length > 0 && (
                        <div style={stagesWrapperStyle}>
                          {stages.map((stage) => (
                            <div key={stage.id} style={stageCardStyle}>
                              <span style={stageNameStyle}>{stage.name}</span>
                              <span
                                className={`badge ${getStageBadgeColor(stage.status)}`}
                                style={{ fontSize: '0.65rem', padding: '2px 8px' }}
                              >
                                {stage.status.toLowerCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      {canTrigger && (
                        <div style={buttonGroupStyle}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTrigger(p.id); }}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                            disabled={p.status === 'RUNNING'}
                          >
                            <Play size={14} /> Run Pipeline
                          </button>
                          {p.status === 'FAILED' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRetry(p.id); }}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#f59e0b', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer' }}
                            >
                              <RotateCcw size={14} /> Retry Failed
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Live Console Terminal ── */}
        <div style={{ flex: 1 }}>
          <div className="glass-panel" style={{ position: 'sticky', top: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={20} color="#6366f1" />
              Live Console Output Log Traces
            </h3>
            <Terminal logs={liveLogs} buildId={activeBuildId} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Styles (unchanged from original)
// ─────────────────────────────────────────────
const layoutStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '24px',
};

const formStyle = {
  display: 'flex',
  gap: '16px',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const labelStyle = {
  fontSize: '0.85rem',
  fontWeight: '600',
  color: '#9ca3af',
  marginBottom: '6px',
  display: 'block',
  textAlign: 'left',
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
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
  background: 'rgba(99, 102, 241, 0.03)',
  borderColor: 'rgba(99, 102, 241, 0.25)',
};

const stagesWrapperStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '10px',
  margin: '16px 0 12px 0',
};

const stageCardStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.04)',
  padding: '8px',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
};

const stageNameStyle = {
  fontSize: '0.75rem',
  fontWeight: 'bold',
  color: '#9ca3af',
  textTransform: 'uppercase',
};

const buttonGroupStyle = {
  display: 'flex',
  gap: '8px',
  marginTop: '8px',
};

const emptyStyle = {
  padding: '40px 0',
  textAlign: 'center',
  color: '#6b7280',
  fontStyle: 'italic',
};
