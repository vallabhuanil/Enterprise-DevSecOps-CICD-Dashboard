import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, FileText, ChevronLeft, ChevronRight, RefreshCw, Trash } from 'lucide-react';

export default function UserManagement() {
  const { token, API_BASE, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchLogs();
    }
  }, [token, page]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.content || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`${API_BASE}/api/audit-logs?page=${page}&size=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.content || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleToggleRole = async (userId, username, currentRoles) => {
    const isDevOps = currentRoles.some(r => r.includes('DEVOPS'));
    const targetRole = isDevOps ? 'DEVELOPER' : 'DEVOPS';
    
    if (!window.confirm(`Are you sure you want to change role of ${username} to ${targetRole}?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}/assign-role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roleName: targetRole })
      });
      if (response.ok) {
        fetchUsers();
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (userId === user.id) {
      alert("Security clearance violation: You cannot delete your own active administrator account!");
      return;
    }
    if (!window.confirm(`CRITICAL SECURITY ACTION: Are you sure you want to permanently revoke access credentials and delete operator ${username}?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchUsers();
        fetchLogs();
      } else {
        const msg = await response.text();
        alert("Action failed: " + msg);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cleanRole = (role) => {
    return role.replace('ROLE_', '');
  };

  return (
    <div>
      <div style={layoutStyle}>
        {/* Left Column: Operators */}
        <div className="glass-panel" style={{ flex: 1.2 }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#6366f1" />
            Registered Console Operators ({users.length})
          </h3>

          {loadingUsers ? (
            <div className="flex-center" style={{ padding: '30px' }}>
              <Users className="animate-spin" size={24} color="#6366f1" />
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>Operator Name</th>
                  <th style={thStyle}>Email Address</th>
                  <th style={thStyle}>Current Roles</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={tableRowStyle}>
                    <td style={tdStyle}>{u.username}</td>
                    <td style={{ ...tdStyle, color: '#9ca3af' }}>{u.email}</td>
                    <td style={tdStyle}>
                      {u.roles.map((r, i) => (
                        <span key={i} className="badge badge-info" style={{ fontSize: '0.65rem', marginRight: '4px' }}>
                          {cleanRole(r)}
                        </span>
                      ))}
                    </td>
                    <td style={{ ...tdStyle, display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {user && user.roles && user.roles.some(r => r.includes('ADMIN')) && !u.roles.some(r => r.includes('ADMIN')) && (
                        <>
                          <button 
                            onClick={() => handleToggleRole(u.id, u.username, u.roles)}
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', gap: '4px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                          >
                            <RefreshCw size={12} /> Shift Role
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="btn btn-danger" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', gap: '4px', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <Trash size={12} /> Revoke Access
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column: Audit logs */}
        <div className="glass-panel" style={{ flex: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <FileText size={20} color="#6366f1" />
              Platform System Security Audit Logs
            </h3>
            <button 
              onClick={() => fetchLogs()} 
              className="btn btn-secondary" 
              style={{ padding: '6px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loadingLogs ? (
            <div className="flex-center" style={{ padding: '40px' }}>
              <FileText className="animate-spin" size={28} color="#6366f1" />
            </div>
          ) : logs.length === 0 ? (
            <div style={emptyStyle}>No system logs reported yet.</div>
          ) : (
            <div>
              <div style={logsTimelineStyle}>
                {logs.map((log) => (
                  <div key={log.id} style={logItemStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 'bold' }}>
                        @{log.username}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#e5e7eb', marginTop: '6px', lineHeight: '1.4' }}>
                      <span className="badge badge-pending" style={{ fontSize: '0.65rem', marginRight: '6px', padding: '2px 6px' }}>
                        {log.action}
                      </span>
                      {log.details}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pager Buttons */}
              <div style={pagerStyle}>
                <button 
                  onClick={() => setPage(prev => Math.max(0, prev - 1))} 
                  disabled={page === 0}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', opacity: page === 0 ? 0.4 : 1, border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Page {page + 1} of {totalPages}</span>
                <button 
                  onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))} 
                  disabled={page >= totalPages - 1}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', opacity: page >= totalPages - 1 ? 0.4 : 1, border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const layoutStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '24px',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const tableHeaderRowStyle = {
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

const thStyle = {
  padding: '12px 16px',
  color: '#6b7280',
  fontSize: '0.8rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tableRowStyle = {
  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
};

const tdStyle = {
  padding: '16px',
  fontSize: '0.9rem',
  color: '#f3f4f6',
};

const logsTimelineStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const logItemStyle = {
  background: 'rgba(255,255,255,0.01)',
  border: '1px solid rgba(255,255,255,0.03)',
  borderRadius: '8px',
  padding: '12px 16px',
  width: '100%',
  textAlign: 'left',
};

const pagerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '20px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  paddingTop: '16px',
};

const emptyStyle = {
  padding: '40px 0',
  textAlign: 'center',
  color: '#6b7280',
  fontStyle: 'italic',
};
