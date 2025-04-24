import React from "react";
import "./TrainerDashboard.css";

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            background: 'transparent',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            zIndex: 10
          }}
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
