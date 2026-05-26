import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User as UserIcon, Check } from 'lucide-react';

export default function Register({ onLoginRedirect }) {
  const { register, sendOtp, verifyOtp, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('developer'); // default
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = credentials, 2 = OTP
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    setSubmitting(true);
    setError(null);
    const ok = await sendOtp(email);
    setSubmitting(false);
    if (ok) {
      setStep(2);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp) return;
    setSubmitting(true);
    setError(null);
    
    // First, verify the OTP code against PostgreSQL
    const verified = await verifyOtp(email, otp);
    if (verified) {
      // Second, complete the actual registration flow
      const registered = await register(username, email, password, [selectedRole]);
      setSubmitting(false);
      if (registered) {
        setSuccess(true);
        setTimeout(() => {
          onLoginRedirect(); // Transfer directly to login page
        }, 1500);
      }
    } else {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle} className="glass-panel">
        <div style={headerStyle}>
          <div style={logoIconStyle}>
            <Shield size={32} color="#6366f1" />
          </div>
          <h2 style={{ marginTop: '16px', color: '#f3f4f6' }}>Create Console Access</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '4px' }}>
            {step === 1 ? "Register new DevSecOps platform credentials" : "Verify operator identity code"}
          </p>
        </div>

        {success && (
          <div style={successBoxStyle}>
            <Check size={20} color="#10b981" />
            <span>Registration successful! Redirecting to login...</span>
          </div>
        )}

        {error && (
          <div style={errorBoxStyle}>
            {error}
          </div>
        )}

        {!success && step === 1 && (
          <form onSubmit={handleRequestOtp} style={formStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={18} color="#6b7280" style={iconStyle} />
                <input
                  type="text"
                  placeholder="Enter a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#6b7280" style={iconStyle} />
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="password"
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Operator Target Role</label>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-input"
                style={{ background: '#111827' }}
              >
                <option value="developer">Developer</option>
                <option value="devops">DevOps Engineer</option>
                <option value="admin">Administrator</option>
                <option value="viewer">Viewer (Read-Only)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '8px' }} disabled={submitting}>
              {submitting ? "Sending OTP..." : "Request Verification Code"}
            </button>
          </form>
        )}

        {!success && step === 2 && (
          <form onSubmit={handleVerifyAndRegister} style={formStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Enter 6-Digit Verification Code</label>
              <div style={{ position: 'relative' }}>
                <Shield size={18} color="#6b7280" style={iconStyle} />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="E.g. 123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}
                  required
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px', lineHeight: '1.4' }}>
                We've sent a 6-digit OTP code to <strong>{email}</strong>. Enter the code to authorize and activate access.
              </span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '8px' }} disabled={submitting}>
              {submitting ? "Verifying Credentials..." : "Verify & Complete Registration"}
            </button>

            <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} disabled={submitting}>
              Back to Details
            </button>
          </form>
        )}

        <div style={footerStyle}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Already have credentials? </span>
          <button onClick={onLoginRedirect} style={linkStyle}>
            Sign In Here
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
  maxWidth: '440px',
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
  gap: '16px',
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
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

const successBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(16, 185, 129, 0.1)',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  color: '#10b981',
  fontSize: '0.9rem',
  marginBottom: '16px',
};

const errorBoxStyle = {
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  color: '#ef4444',
  fontSize: '0.9rem',
  marginBottom: '16px',
  textAlign: 'center',
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
  textAlign: 'center',
};
