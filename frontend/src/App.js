// src/App.js
import React, { useState, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import WelcomePopup from './components/WelcomePopup';
import TrainingDashboard from './components/TrainingDashboard';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // Simula una pantalla de carga durante 2 segundos
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Mostrar el popup solo para el perfil de reclutador
    if (userData.perfil === 'reclutador') {
      setShowPopup(true);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      {showPopup && <WelcomePopup onClose={() => setShowPopup(false)} />}
      <TrainingDashboard />
    </div>
  );
}

export default App;
