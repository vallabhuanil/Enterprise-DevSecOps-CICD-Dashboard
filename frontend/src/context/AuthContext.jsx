import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jwt_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      // Don't log out immediately if it's a network glitch
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('refresh_token', data.refreshToken);
        setToken(data.token);
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          roles: data.roles
        });
        return true;
      } else {
        setError(data.message || "Authentication failed!");
        return false;
      }
    } catch (err) {
      setError("Network error! Make sure the backend server is running.");
      return false;
    }
  };

  const register = async (username, email, password, roles) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, roles })
      });
      if (response.ok) {
        return true;
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.message || "Registration failed!");
        return false;
      }
    } catch (err) {
      setError("Network error during account registration.");
      return false;
    }
  };

  const sendOtp = async (email) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        return true;
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.message || "Failed to send verification code!");
        return false;
      }
    } catch (err) {
      setError("Network error while sending verification code.");
      return false;
    }
  };

  const verifyOtp = async (email, otp) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      if (response.ok) {
        return true;
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.message || "Email verification failed!");
        return false;
      }
    } catch (err) {
      setError("Network error while verifying OTP.");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, setError, login, register, sendOtp, verifyOtp, logout, API_BASE }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
