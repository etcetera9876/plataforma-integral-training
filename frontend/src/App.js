import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import WelcomePopup from './components/WelcomePopup';
import TrainingDashboard from './components/TrainingDashboard';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData.role === 'recruiter') {
      const hasSeenPopup = localStorage.getItem('hasSeenWelcomePopup');
      if (!hasSeenPopup) {
        setShowPopup(true);
        localStorage.setItem('hasSeenWelcomePopup', 'true');
      }
    }
  };

  // Manejo de tiempo de inactividad
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 15 minutos en milisegundos

    let timeout = setTimeout(() => {
      setUser(null);
      navigate("/");
    }, INACTIVITY_TIMEOUT);

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setUser(null);
        navigate("/");
      }, INACTIVITY_TIMEOUT);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [user, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
        <Route path="/dashboard" element={user ? <TrainingDashboard /> : <Navigate to="/" />} />
      </Routes>
      {showPopup && <WelcomePopup onClose={() => setShowPopup(false)} />}
    </>
  );
}

export default App;
