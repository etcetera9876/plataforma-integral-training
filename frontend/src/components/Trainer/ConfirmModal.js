import React from "react";
import "./TrainerDashboard.css"; // Asegúrate de que los estilos estén definidos

const ConfirmModal = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Confirmación</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="cancel-button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="confirm-button" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

const SuccessModal = ({ message, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Éxito</h3>
        <p>{message}</p>
      
      </div>
    </div>
  );
};


export { ConfirmModal, SuccessModal };