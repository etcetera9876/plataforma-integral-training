import React, { useEffect } from 'react';
import './AlertMessage.css';

const AlertMessage = ({ message, type = 'success', open, onClose, duration = 3500 }) => {
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
    <div className={`alert-message alert-${type}`}>{message}</div>
  );
};

export default AlertMessage;
