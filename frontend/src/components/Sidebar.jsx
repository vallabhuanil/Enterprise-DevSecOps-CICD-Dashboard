import React from 'react';
import { 
  LayoutDashboard, 
  GitFork, 
  PlaySquare, 
  ShieldCheck, 
  Users, 
  LogOut,
  Terminal as TerminalIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { user, logout } = useAuth();

  const getRoleColor = (role) => {
    if (!role) return 'badge-pending';
    if (role.includes('ADMIN')) return 'badge-success';
    if (role.includes('DEVOPS')) return 'badge-warning';
    if (role.includes('DEVELOPER')) return 'badge-info';
    return 'badge-pending';
  };

  const cleanRole = (role) => {
    if (!role) return 'Viewer';
    return role.replace('ROLE_', '');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'repositories', label: 'Repositories', icon: GitFork },
    { id: 'pipelines', label: 'Pipelines Run', icon: PlaySquare },
    { id: 'security', label: 'Security & Scans', icon: ShieldCheck },
  ];

  const hasAccess = user && user.roles && user.roles.some(r => r.includes('ADMIN') || r.includes('DEVOPS'));
  if (hasAccess) {
    menuItems.push({ id: 'users', label: 'Users & Auditing', icon: Users });
  }

  return (
    <div style={sidebarStyle}>
      {/* Brand header */}
      <div style={brandStyle}>
        <TerminalIcon size={28} color="#6366f1" />
        <span style={brandText}>DevSecOps Hub</span>
      </div>

      {/* User info card */}
      {user && (
        <div style={userCardStyle}>
          <div style={avatarStyle}>
            {user.username.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={usernameStyle}>{user.username}</div>
            <div style={{ marginTop: '4px' }}>
              {user.roles && user.roles.map((r, i) => (
                <span key={i} className={`badge ${getRoleColor(r)}`} style={{ fontSize: '0.65rem' }}>
                  {cleanRole(r)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nav Menu */}
      <nav style={navStyle}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              style={isActive ? activeItemStyle : itemStyle}
            >
              <Icon size={20} color={isActive ? "#6366f1" : "#9ca3af"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer logout button */}
      <button onClick={logout} style={logoutButtonStyle}>
        <LogOut size={20} color="#ef4444" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}

// Style specs
const sidebarStyle = {
  width: '260px',
  height: '100vh',
  position: 'fixed',
  top: 0,
  left: 0,
  background: '#111827',
  borderRight: '1px solid rgba(255, 255, 255, 0.07)',
  padding: '24px 16px',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
};

const brandStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '32px',
  paddingLeft: '8px',
};

const brandText = {
  fontSize: '1.25rem',
  fontWeight: '700',
  color: '#f3f4f6',
  letterSpacing: '-0.02em',
};

const userCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  padding: '12px',
  borderRadius: '12px',
  marginBottom: '24px',
};

const avatarStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '0.9rem',
  color: '#fff',
};

const usernameStyle = {
  fontSize: '0.95rem',
  fontWeight: '600',
  color: '#f3f4f6',
};

const navStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flex: 1,
};

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  borderRadius: '8px',
  background: 'transparent',
  border: 'none',
  color: '#9ca3af',
  fontSize: '0.95rem',
  fontWeight: '500',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s',
  width: '100%',
};

const activeItemStyle = {
  ...itemStyle,
  background: 'rgba(99, 102, 241, 0.08)',
  borderLeft: '4px solid #6366f1',
  color: '#6366f1',
};

const logoutButtonStyle = {
  ...itemStyle,
  marginTop: 'auto',
  color: '#ef4444',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  width: '100%',
};
