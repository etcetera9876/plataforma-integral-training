// src/components/WelcomePopup.js
import React from 'react';
import './WelcomePopup.css';

const WelcomePopup = ({ onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h3>¡Bienvenido Reclutador!</h3>
        <p>Recuerda que tu trabajo es fundamental para encontrar el mejor talento. ¡Éxito!</p>
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

export default WelcomePopup;
