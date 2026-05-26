import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ title }) {
  const { token, API_BASE } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [wsOnline, setWsOnline] = useState(false);

  // Subscribe to live notifications via WS
  useWebSocket('/topic/notifications', (newNotif) => {
    setNotifications(prev => [newNotif, ...prev]);
    setWsOnline(true);
  });

  // Pull existing notifications on mount
  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setWsOnline(true);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={navbarStyle}>
      <h2 style={titleStyle}>{title}</h2>

      <div style={actionsStyle}>
        {/* WS Connection Status */}
        <div style={connectionStatusStyle}>
          {wsOnline ? (
            <>
              <Wifi size={16} color="#10b981" />
              <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '500' }}>WS Active</span>
            </>
          ) : (
            <>
              <WifiOff size={16} color="#6b7280" />
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>WS Connecting</span>
            </>
          )}
        </div>

        {/* Notifications Icon Button */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={notificationButtonStyle}
          >
            <Bell size={20} color="#f3f4f6" />
            {unreadCount > 0 && (
              <span style={badgeStyle} className="animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={dropdownStyle} className="glass-panel">
              <div style={dropdownHeaderStyle}>
                <h4 style={{ margin: 0 }}>System Notifications Center</h4>
                {unreadCount > 0 && <span className="badge badge-error">{unreadCount} New</span>}
              </div>
              <div style={dropdownListStyle}>
                {notifications.length === 0 ? (
                  <div style={emptyStyle}>No active notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      style={n.isRead ? readItemStyle : unreadItemStyle}
                      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        {n.type.includes('FAILED') ? (
                          <ShieldAlert size={16} color="#ef4444" style={{ marginTop: '2px' }} />
                        ) : (
                          <CheckCircle size={16} color="#10b981" style={{ marginTop: '2px' }} />
                        )}
                        <div>
                          <div style={itemMessageStyle}>{n.message}</div>
                          <div style={itemTimeStyle}>
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      {!n.isRead && (
                        <span style={unreadDotStyle} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const navbarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '70px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
  marginBottom: '24px',
  paddingLeft: '8px',
  position: 'relative',
};

const titleStyle = {
  fontSize: '1.5rem',
  fontWeight: '700',
  color: '#f3f4f6',
  letterSpacing: '-0.02em',
};

const actionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
};

const connectionStatusStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  padding: '6px 12px',
  borderRadius: '20px',
};

const notificationButtonStyle = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 0.2s',
};

const badgeStyle = {
  position: 'absolute',
  top: '-4px',
  right: '-4px',
  background: '#ef4444',
  color: '#fff',
  fontSize: '0.65rem',
  fontWeight: 'bold',
  borderRadius: '50%',
  width: '18px',
  height: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px solid #111827',
};

const dropdownStyle = {
  position: 'absolute',
  top: '50px',
  right: 0,
  width: '360px',
  maxHeight: '400px',
  overflowY: 'auto',
  background: '#1f2937',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  zIndex: 1000,
  padding: '16px',
};

const dropdownHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  paddingBottom: '12px',
  marginBottom: '12px',
};

const dropdownListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const emptyStyle = {
  padding: '24px 0',
  textAlign: 'center',
  color: '#6b7280',
  fontSize: '0.9rem',
};

const readItemStyle = {
  padding: '10px',
  borderRadius: '8px',
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px solid rgba(255,255,255,0.03)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
};

const unreadItemStyle = {
  ...readItemStyle,
  background: 'rgba(99, 102, 241, 0.05)',
  borderColor: 'rgba(99, 102, 241, 0.2)',
};

const itemMessageStyle = {
  fontSize: '0.85rem',
  fontWeight: '500',
  color: '#f3f4f6',
  lineHeight: '1.3',
};

const itemTimeStyle = {
  fontSize: '0.75rem',
  color: '#9ca3af',
  marginTop: '4px',
};

const unreadDotStyle = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#ef4444',
  flexShrink: 0,
};
