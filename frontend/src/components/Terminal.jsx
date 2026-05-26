import React, { useEffect, useRef } from 'react';

export default function Terminal({ logs, buildId }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Color text outputs
  const formatLogLine = (line) => {
    if (line.includes('[ERROR]')) {
      return <span style={{ color: '#ef4444' }}>{line}</span>;
    }
    if (line.includes('[WARN]')) {
      return <span style={{ color: '#f59e0b' }}>{line}</span>;
    }
    if (line.includes('[DEPLOY]')) {
      return <span style={{ color: '#06b6d4' }}>{line}</span>;
    }
    if (line.includes('SUCCESS')) {
      return <span style={{ color: '#10b981', fontWeight: 'bold' }}>{line}</span>;
    }
    return <span>{line}</span>;
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={actionsStyle}>
          <span style={{ ...dotStyle, background: '#ef4444' }} />
          <span style={{ ...dotStyle, background: '#f59e0b' }} />
          <span style={{ ...dotStyle, background: '#10b981' }} />
        </div>
        <span style={titleStyle}>Console Logs Terminal {buildId ? `(Build #${buildId})` : ''}</span>
      </div>
      <div className="terminal-window">
        {logs ? (
          logs.split('\n').map((line, i) => (
            <div key={i} className="terminal-line">
              {formatLogLine(line)}
            </div>
          ))
        ) : (
          <div className="terminal-line" style={{ color: '#6b7280', fontStyle: 'italic' }}>
            Awaiting build pipeline execution triggers...
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}

const containerStyle = {
  background: '#05070f',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 8px 32px 0 rgba(0,0,0,0.6)',
  marginTop: '16px',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  background: '#0f172a',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  gap: '16px',
};

const actionsStyle = {
  display: 'flex',
  gap: '6px',
};

const dotStyle = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  display: 'inline-block',
};

const titleStyle = {
  color: '#9ca3af',
  fontSize: '0.8rem',
  fontFamily: 'var(--font-mono)',
  fontWeight: '500',
};
