import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  GitFork,
  Activity,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

// Seed points shown before first WebSocket metric arrives
const INITIAL_HISTORY = [
  { time: 'T-20s', cpu: 32.5, memory: 45.2 },
  { time: 'T-15s', cpu: 34.0, memory: 46.8 },
  { time: 'T-10s', cpu: 38.2, memory: 47.1 },
  { time: 'T-5s',  cpu: 35.5, memory: 48.2 },
];
const MAX_HISTORY_POINTS = 15;

export default function Dashboard() {
  const { token, API_BASE } = useAuth();
  // stats starts as an empty-shape object (not null) so cards always render.
  // Individual fields will be '—' until fetchStats completes.
  const [stats, setStats] = useState({
    totalProjects: null,
    buildSuccessRate: null,
    deploymentFrequency: null,
    criticalVulnerabilities: null,
    highVulnerabilities: null,
    recentPipelines: [],
    recentDeployments: [],
  });
  // Initialise with seed data so the chart is never empty on first mount
  const [cpuHistory, setCpuHistory] = useState(INITIAL_HISTORY);
  const [loading, setLoading] = useState(true);

  // ─────────────────────────────────────────────────────────────────────
  // Bug fix 1 & 2: WebSocket metrics handler
  //
  // Previously this was an inline arrow → new reference every render →
  // the useWebSocket hook's useEffect re-ran → STOMP reconnect →
  // dashboard state wiped.
  //
  // Fixed: wrapped in useCallback with NO changing deps (all state
  // updates use the functional-updater form so they don't capture
  // stale state). The hook itself also now uses a ref so even if this
  // callback reference did change it would NOT reconnect.
  // ─────────────────────────────────────────────────────────────────────
  const handleMetric = useCallback((liveMetric) => {
    // Guard: ignore malformed payloads
    if (!liveMetric || typeof liveMetric.cpuUsage !== 'number') {
      console.warn('[Dashboard] Received invalid metric payload:', liveMetric);
      return;
    }

    setCpuHistory(prev => {
      const point = {
        time: new Date(liveMetric.timestamp).toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }),
        cpu: liveMetric.cpuUsage,
        memory: liveMetric.memoryUsage ?? 0,
      };
      const updated = [...prev, point];
      // Keep only the last N points — slice instead of shift to stay immutable
      return updated.length > MAX_HISTORY_POINTS
        ? updated.slice(updated.length - MAX_HISTORY_POINTS)
        : updated;
    });

    // Bug fix 3: merge into existing stats; never replace if prev is null
    // (prev can be null before fetchStats finishes — returning null caused
    //  all `{stats && ...}` sections to collapse after a pipeline run)
    // Always merge — prev is now never null (initialised to shape object above)
    setStats(prev => ({
      ...prev,
      buildSuccessRate:   liveMetric.buildSuccessRate   ?? prev.buildSuccessRate,
      deploymentFrequency: liveMetric.deploymentFrequency ?? prev.deploymentFrequency,
    }));
  }, []); // stable — no external deps needed because of functional updaters

  useWebSocket('/topic/metrics', handleMetric);
  useWebSocket('/topic/scans', () => {
    fetchStats();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Fetch initial dashboard stats once on mount (and when token changes)
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Bug fix 4: only set stats, NEVER reset cpuHistory here.
        // Previously fetchStats() blew away all WebSocket telemetry
        // points by calling setCpuHistory([...4 seed points]) every
        // time it ran (including after pipeline completions that
        // indirectly triggered re-renders).
        // Merge API response into the existing shape — never replace wholesale
        // so that any live WebSocket values already received are preserved.
        setStats(prev => ({ ...prev, ...data }));
        // Only seed history if it's still at the initial placeholder
        setCpuHistory(prev =>
          prev.length <= INITIAL_HISTORY.length ? INITIAL_HISTORY : prev
        );
      } else {
        console.error('[Dashboard] Stats API returned', response.status);
      }
    } catch (e) {
      console.error('[Dashboard] Failed to load statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Render helpers (pure functions — no state reads — won't cause re-renders)
  // ─────────────────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS': return <span className="badge badge-success">Success</span>;
      case 'FAILED':  return <span className="badge badge-error">Failed</span>;
      case 'RUNNING': return <span className="badge badge-warning animate-pulse">Running</span>;
      default:        return <span className="badge badge-pending">Pending</span>;
    }
  };

  const getStageDotColor = (stageStatus) => {
    switch (stageStatus) {
      case 'SUCCESS': return '#10b981';
      case 'FAILED':  return '#ef4444';
      case 'RUNNING': return '#f59e0b';
      default:        return '#374151';
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Loading state — only shown on the very first load
  // ─────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '16px' }}>
        <Activity className="animate-spin" size={48} color="#6366f1" />
        <span style={{ color: '#9ca3af' }}>Gathering Dashboard Telemetry...</span>
      </div>
    );
  }

  // Safe accessors — avoid crashing when stats sub-fields are missing
  const recentPipelines = stats?.recentPipelines ?? [];
  const recentDeployments = stats?.recentDeployments ?? [];

  return (
    <div>
      {/* ── 4-Card Metrics Grid ──
           Cards are ALWAYS mounted — they show '—' while stats loads.
           Removing the `stats && (...)` gate was the core fix: if fetchStats
           failed or returned null the entire grid silently disappeared. */}
      <div style={grid4Style}>
        <div className="glass-panel" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>CONNECTED PROJECTS</span>
            <GitFork size={24} color="#6366f1" />
          </div>
          <div style={cardValueStyle}>
            {stats.totalProjects !== null ? stats.totalProjects : '—'}
          </div>
          <div style={cardMetaStyle}>Connected Git Repos</div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>BUILD SUCCESS RATE</span>
            <TrendingUp size={24} color="#10b981" />
          </div>
          <div style={{ ...cardValueStyle, color: '#10b981' }}>
            {stats.buildSuccessRate !== null ? `${stats.buildSuccessRate}%` : '—'}
          </div>
          <div style={cardMetaStyle}>Live compiler health metrics</div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>DEPLOYMENT FREQUENCY</span>
            <Activity size={24} color="#06b6d4" />
          </div>
          <div style={{ ...cardValueStyle, color: '#06b6d4' }}>
            {stats.deploymentFrequency !== null ? `${stats.deploymentFrequency}/day` : '—'}
          </div>
          <div style={cardMetaStyle}>Releases to active target envs</div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>SECURITY ANOMALIES</span>
            <ShieldAlert size={24} color="#ef4444" />
          </div>
          <div style={{ ...cardValueStyle, color: '#ef4444' }}>
            {stats.criticalVulnerabilities !== null
              ? (stats.criticalVulnerabilities ?? 0) + (stats.highVulnerabilities ?? 0)
              : '—'}
          </div>
          <div style={cardMetaStyle}>
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
              {stats.criticalVulnerabilities ?? 0} Critical
            </span>
            {' / '}{stats.highVulnerabilities ?? 0} High
          </div>
        </div>
      </div>

      {/* ── Live Telemetry Graph ── */}
      <div className="glass-panel" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="#6366f1" />
          Live Platform Resources Telemetry Stream (WebSockets Live)
        </h3>
        <div style={{ height: '300px', width: '100%' }}>
          {cpuHistory.length === 0 ? (
            /* Defensive fallback — chart will never crash on empty data */
            <div className="flex-center" style={{ height: '100%', color: '#6b7280', fontStyle: 'italic' }}>
              Waiting for telemetry stream...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cpuHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#6b7280" />
                <YAxis stroke="#6b7280" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#111827', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  name="CPU Load %"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  name="Memory Utilization %"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Two-Column: Pipeline Runs & Deployments ── */}
      <div style={grid2Style}>
        {/* Recent Pipeline Runs */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px' }}>Recent Pipeline Runs</h3>
          <div style={listStyle}>
            {recentPipelines.length === 0 ? (
              <div style={emptyStyle}>No active pipelines registered yet.</div>
            ) : (
              recentPipelines.map((p) => (
                <div key={p.id} style={listItemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ color: '#f3f4f6' }}>{p.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Branch: {p.branch}</span>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>
                  {/* Stage indicator dots */}
                  {Array.isArray(p.stages) && p.stages.length > 0 && (
                    <div style={stagesRowStyle}>
                      {p.stages.map((st) => (
                        <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: getStageDotColor(st.status),
                              boxShadow: `0 0 8px ${getStageDotColor(st.status)}`,
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{st.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Release Environment Deployments */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px' }}>Release Environments Status</h3>
          <div style={listStyle}>
            {recentDeployments.length === 0 ? (
              <div style={emptyStyle}>No deployments initiated yet.</div>
            ) : (
              recentDeployments.map((d) => (
                <div key={d.id} style={listItemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ color: '#f3f4f6' }}>{d.pipelineName}</h4>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{d.environment}</span>
                        {d.rollbackToId && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Rollback</span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(d.status)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginTop: '8px' }}>
                    Released at: {d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Style constants (unchanged from original)
// ─────────────────────────────────────────────
const grid4Style = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
};

const cardStyle = {
  padding: '20px',
  position: 'relative',
  overflow: 'hidden',
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
  color: '#f3f4f6',
  lineHeight: '1',
  marginBottom: '6px',
};

const cardMetaStyle = {
  fontSize: '0.85rem',
  color: '#9ca3af',
};

const grid2Style = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
  gap: '24px',
  marginTop: '24px',
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const listItemStyle = {
  background: 'rgba(255,255,255,0.01)',
  border: '1px solid rgba(255,255,255,0.04)',
  borderRadius: '8px',
  padding: '12px 16px',
};

const emptyStyle = {
  padding: '32px 0',
  textAlign: 'center',
  color: '#6b7280',
  fontStyle: 'italic',
};

const stagesRowStyle = {
  display: 'flex',
  gap: '16px',
  marginTop: '12px',
  paddingTop: '8px',
  borderTop: '1px solid rgba(255,255,255,0.03)',
};
