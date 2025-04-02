// src/components/LoadingScreen.js
import React from 'react';
import loadingGif from '../assets/logo-jcs.png'; // Importamos la imagen
import './LoadingScreen.css'; // Estilos

const LoadingScreen = () => {
  return (
    <div className="loading-container">
      <img src={loadingGif} alt="Cargando..." className="logo-jcs" />
    </div>
  );
};

export default LoadingScreen;
