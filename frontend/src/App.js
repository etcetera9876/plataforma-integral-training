import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import WelcomePopup from './components/WelcomePopup';
import TrainingDashboard from './components/TrainingDashboard';
import API_URL from './config';
import axios from 'axios';

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

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Opcional: Validar que exista un token válido
      if (parsedUser && parsedUser.token) {
        setUser(parsedUser);
      }
    }
  }, []);


const handleLogin = (userData) => {
  console.log("userData recibido:", userData);
  setUser(userData);
  localStorage.setItem("user", JSON.stringify(userData)); // Guarda la sesión localmente
  console.log("LocalStorage user:", localStorage.getItem("user"));
  if (userData.role === 'recruiter' && !userData.hasSeenPopup) {
    // Obtenemos el token desde userData o localStorage
    const token = userData.token || localStorage.getItem("token");
    const popupKey = `welcomePopupShown_${userData.id}`;
    const hasSeenPopup = localStorage.getItem(popupKey);
    if (!hasSeenPopup) {
      setShowPopup(true);
      localStorage.setItem(popupKey, 'true');

      // Llamada al endpoint para actualizar el estado del popup
      axios.post(`${API_URL}/api/auth/updatePopupStatus`, {}, {
        headers: { Authorization: token }  // Enviamos solo el token sin "Bearer" si tu middleware lo espera así
      })
      .then(response => {
        console.log("Estado del popup actualizado:", response.data);
      })
      .catch(error => {
        console.error("Error al actualizar estado del popup:", error.response?.data || error.message);
      });
    }
  }
};
  

  // Manejo de tiempo de inactividad
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos en milisegundos

    let timeout = setTimeout(() => {
      setUser(null);
      
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser && storedUser.id) {
        localStorage.removeItem(`welcomePopupShown_${storedUser.id}`);
      }

      localStorage.removeItem(`welcomePopupShown_${user.id}`);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate("/");  // Solo navega, sin recargar
    }, INACTIVITY_TIMEOUT);

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setUser(null);
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser && storedUser.id) {
          localStorage.removeItem(`welcomePopupShown_${storedUser.id}`);
        }
        localStorage.removeItem('user');
        localStorage.removeItem('token');
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
        <Route path="/dashboard" element={user ? <TrainingDashboard setUser={setUser} user={user}/> : <Navigate to="/" />} />
      </Routes>
      {showPopup && <WelcomePopup onClose={() => setShowPopup(false)} />}
    </>
  );
}

export default App;
