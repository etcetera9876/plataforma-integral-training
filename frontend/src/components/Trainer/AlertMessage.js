import React, { useEffect } from 'react';
import './AlertMessage.css';

const AlertMessage = ({ message, type = 'success', open, onClose, duration = 1500 }) => {
  useEffect(() => {
    if (open && message) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [open, message, duration, onClose]);

  if (!open || !message) return null;

  return (
    <div className={`alert-message alert-${type}`} style={{
      position: 'fixed',
      bottom: 32,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      minWidth: 280,
      maxWidth: 420,
      background: type === 'success' ? '#43a047' : (type === 'error' ? '#d32f2f' : '#1976d2'),
      color: '#fff',
      fontWeight: 600,
      fontSize: 17,
      borderRadius: 10,
      boxShadow: '0 4px 24px #2224',
      padding: '16px 32px',
      textAlign: 'center',
      opacity: 0.98,
      letterSpacing: 0.2,
      pointerEvents: 'auto',
      transition: 'all 0.3s',
    }}>{message}</div>
  );
};

export default AlertMessage;
