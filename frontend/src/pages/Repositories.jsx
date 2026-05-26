import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { GitFork, Link as LinkIcon, Trash2, Plus, ShieldCheck, AlertTriangle, X, CheckCircle, XCircle } from 'lucide-react';

// ─────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={toastContainerStyle}>
      {toasts.map((t) => (
        <div key={t.id} style={{ ...toastStyle, ...(t.type === 'success' ? toastSuccessStyle : toastErrorStyle) }}>
          {t.type === 'success'
            ? <CheckCircle size={16} style={{ flexShrink: 0 }} />
            : <XCircle size={16} style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: '0.875rem' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Delete Confirmation Modal
// ─────────────────────────────────────────────
function DeleteModal({ repo, onCancel, onConfirm, deleting }) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div style={modalIconWrapStyle}>
            <AlertTriangle size={24} color="#ef4444" />
          </div>
          <button onClick={onCancel} style={modalCloseBtn} disabled={deleting}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={modalBodyStyle}>
          <h3 style={modalTitleStyle}>Remove Repository Integration</h3>
          <p style={modalSubtitleStyle}>
            You are about to permanently remove the following repository from the platform:
          </p>
          <div style={modalRepoCardStyle}>
            <GitFork size={20} color="#6366f1" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ color: '#f3f4f6', fontWeight: 700, fontSize: '0.95rem' }}>{repo.name}</div>
              <div style={{ color: '#9ca3af', fontSize: '0.78rem', wordBreak: 'break-all', marginTop: '2px' }}>{repo.repoUrl}</div>
              <span style={{ fontSize: '0.65rem', marginTop: '6px', display: 'inline-block' }} className="badge badge-info">Branch: {repo.branch}</span>
            </div>
          </div>
          <div style={modalWarningBoxStyle}>
            <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: '#fbbf24', lineHeight: '1.5' }}>
              <strong>This action cannot be undone.</strong> Deleting this repository will permanently remove all associated
              pipelines, builds, deployments, and security scan reports.
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={modalFooterStyle}>
          <button
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '11px', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger"
            style={{ flex: 1, padding: '11px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Removing...
              </>
            ) : (
              <>
                <Trash2 size={15} />
                Delete Repository
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Repositories Page
// ─────────────────────────────────────────────
export default function Repositories() {
  const { token, API_BASE, user } = useAuth();
  const [repos, setRepos] = useState([]);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalRepo, setModalRepo] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // WebSocket — listen for repository-deleted events from other sessions
  const handleWsRepoEvent = useCallback((event) => {
    if (event.type === 'REPOSITORY_DELETED') {
      setRepos(prev => prev.filter(r => r.id !== event.repositoryId));
      addToast(`Repository "${event.repositoryName}" was removed by ${event.deletedBy}`, 'success');
    }
  }, []);

  useWebSocket('/topic/repository-events', handleWsRepoEvent);

  useEffect(() => {
    if (token) fetchRepos();
  }, [token]);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/repos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      }
    } catch (e) {
      console.error('Failed to load repositories:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!repoUrl) return;
    try {
      const response = await fetch(`${API_BASE}/api/repos/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ repoUrl, branch })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Connected ${data.name} successfully!`);
        setRepoUrl('');
        setBranch('main');
        fetchRepos();
        addToast(`Repository "${data.name}" connected!`, 'success');
      } else {
        setError(data.message || 'Failed to connect repository');
      }
    } catch (err) {
      setError('Network error connecting repository.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!modalRepo) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/api/repos/${modalRepo.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setRepos(prev => prev.filter(r => r.id !== modalRepo.id));
        addToast(`Repository "${modalRepo.name}" removed successfully!`, 'success');
        setModalRepo(null);
      } else if (response.status === 403) {
        addToast('Access denied — ADMIN role required.', 'error');
        setModalRepo(null);
      } else if (response.status === 404) {
        addToast('Repository not found — it may have already been removed.', 'error');
        setModalRepo(null);
        fetchRepos();
      } else {
        addToast(data.message || 'Failed to delete repository.', 'error');
      }
    } catch (e) {
      addToast('Network error while deleting repository.', 'error');
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const canConnect = user?.roles?.some(r => r.includes('ADMIN') || r.includes('DEVOPS') || r.includes('DEVELOPER'));
  const isAdmin = user?.roles?.some(r => r.includes('ADMIN'));

  return (
    <div>
      <Toast toasts={toasts} />

      {/* Confirmation Modal */}
      {modalRepo && (
        <DeleteModal
          repo={modalRepo}
          onCancel={() => !deleting && setModalRepo(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}

      <div style={layoutStyle}>
        {/* ── Left Column: Connect Form ── */}
        <div className="glass-panel" style={{ flex: 1 }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LinkIcon size={20} color="#6366f1" />
            Connect New Version Control Integration
          </h3>

          {!canConnect ? (
            <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '16px' }}>
              Your account lacks Developer/DevOps authorization clearance to register new repositories.
            </div>
          ) : (
            <form onSubmit={handleConnect} style={formStyle}>
              {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}
              {success && <div style={{ color: '#10b981', fontSize: '0.85rem' }}>{success}</div>}

              <div style={groupStyle}>
                <label style={labelStyle}>Repository Remote Origin URL</label>
                <input
                  type="text"
                  placeholder="https://github.com/company/microservice"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div style={groupStyle}>
                <label style={labelStyle}>Target Branch Mapping</label>
                <input
                  type="text"
                  placeholder="main or release/prod"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', alignSelf: 'flex-start' }}>
                <Plus size={18} />
                Connect Integration Repository
              </button>
            </form>
          )}
        </div>

        {/* ── Right Column: Repository List ── */}
        <div className="glass-panel" style={{ flex: 1.2 }}>
          <h3 style={{ marginBottom: '20px' }}>Active Integrated Repositories ({repos.length})</h3>

          {loading ? (
            <div className="flex-center" style={{ padding: '40px' }}>
              <GitFork className="animate-spin" size={32} color="#6366f1" />
            </div>
          ) : repos.length === 0 ? (
            <div style={emptyStyle}>No integrated repositories connected yet.</div>
          ) : (
            <div style={listStyle}>
              {repos.map((r) => (
                <div key={r.id} style={listItemStyle}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={iconContainerStyle}>
                      <GitFork size={22} color="#6366f1" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ color: '#f3f4f6', margin: 0 }}>{r.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af', wordBreak: 'break-all', display: 'block', marginTop: '2px' }}>{r.repoUrl}</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Branch: {r.branch}</span>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <ShieldCheck size={10} /> Active
                        </span>
                      </div>
                    </div>

                    {/* Admin-only Delete Button */}
                    {isAdmin && (
                      <button
                        id={`delete-repo-${r.id}`}
                        onClick={() => setModalRepo(r)}
                        title="Remove repository integration"
                        style={deleteButtonStyle}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const layoutStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '24px',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const groupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle = {
  fontSize: '0.85rem',
  fontWeight: '600',
  color: '#9ca3af',
  textAlign: 'left',
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
  transition: 'border-color 0.2s',
};

const iconContainerStyle = {
  width: '44px',
  height: '44px',
  borderRadius: '10px',
  background: 'rgba(99, 102, 241, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const deleteButtonStyle = {
  padding: '8px',
  borderRadius: '8px',
  background: 'rgba(239, 68, 68, 0.08)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  color: '#ef4444',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  flexShrink: 0,
};

const emptyStyle = {
  padding: '40px 0',
  textAlign: 'center',
  color: '#6b7280',
  fontStyle: 'italic',
};

// ── Modal Styles ──
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px',
};

const modalStyle = {
  background: 'linear-gradient(135deg, #0f1628 0%, #1a2240 100%)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.1)',
  overflow: 'hidden',
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '24px 24px 0',
};

const modalIconWrapStyle = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalCloseBtn = {
  background: 'transparent',
  border: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  borderRadius: '6px',
};

const modalBodyStyle = {
  padding: '20px 24px',
};

const modalTitleStyle = {
  color: '#f3f4f6',
  fontSize: '1.15rem',
  fontWeight: 700,
  margin: '0 0 8px 0',
};

const modalSubtitleStyle = {
  color: '#9ca3af',
  fontSize: '0.875rem',
  margin: '0 0 16px 0',
  lineHeight: '1.5',
};

const modalRepoCardStyle = {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  background: 'rgba(99, 102, 241, 0.06)',
  border: '1px solid rgba(99, 102, 241, 0.15)',
  borderRadius: '10px',
  padding: '14px',
  marginBottom: '16px',
};

const modalWarningBoxStyle = {
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-start',
  background: 'rgba(245, 158, 11, 0.06)',
  border: '1px solid rgba(245, 158, 11, 0.2)',
  borderRadius: '8px',
  padding: '12px',
};

const modalFooterStyle = {
  display: 'flex',
  gap: '12px',
  padding: '0 24px 24px',
};

// ── Toast Styles ──
const toastContainerStyle = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  zIndex: 2000,
  pointerEvents: 'none',
};

const toastStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 18px',
  borderRadius: '10px',
  backdropFilter: 'blur(12px)',
  border: '1px solid',
  minWidth: '280px',
  maxWidth: '380px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  animation: 'slideInRight 0.3s ease',
};

const toastSuccessStyle = {
  background: 'rgba(16, 185, 129, 0.12)',
  borderColor: 'rgba(16, 185, 129, 0.3)',
  color: '#10b981',
};

const toastErrorStyle = {
  background: 'rgba(239, 68, 68, 0.12)',
  borderColor: 'rgba(239, 68, 68, 0.3)',
  color: '#ef4444',
};
