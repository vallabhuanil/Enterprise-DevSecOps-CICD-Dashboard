import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react';

export default function Login({ onRegisterRedirect }) {
  const { login, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    await login(username, password);
    setSubmitting(false);
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle} className="glass-panel">
        <div style={headerStyle}>
          <div style={logoIconStyle}>
            <Shield size={32} color="#6366f1" />
          </div>
          <h2 style={{ marginTop: '16px', color: '#f3f4f6' }}>DevSecOps Pipeline Hub</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '4px' }}>
            Enterprise CI/CD Dashboard Authenticator
          </p>
        </div>

        {error && (
          <div style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', textTransform: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Username</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={18} color="#6b7280" style={iconStyle} />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#6b7280" style={iconStyle} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={eyeButtonStyle}
              >
                {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '8px' }} disabled={submitting}>
            {submitting ? "Authenticating Session..." : "Authorize Login"}
          </button>
        </form>

        <div style={footerStyle}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>New operator? </span>
          <button onClick={onRegisterRedirect} style={linkStyle}>
            Request Account Credentials
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  width: '100vw',
  background: '#0a0e1a',
  padding: '16px',
};

const cardStyle = {
  width: '100%',
  maxWidth: '420px',
  padding: '40px 32px',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '32px',
};

const logoIconStyle = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: 'rgba(99, 102, 241, 0.08)',
  border: '1px solid rgba(99, 102, 241, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const inputGroupStyle = {
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

const iconStyle = {
  position: 'absolute',
  top: '50%',
  left: '16px',
  transform: 'translateY(-50%)',
};

const eyeButtonStyle = {
  position: 'absolute',
  top: '50%',
  right: '16px',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const footerStyle = {
  textAlign: 'center',
  marginTop: '24px',
};

const linkStyle = {
  background: 'transparent',
  border: 'none',
  color: '#6366f1',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '0.9rem',
};
