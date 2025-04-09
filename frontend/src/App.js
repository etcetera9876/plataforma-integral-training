// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import WelcomePopup from './components/WelcomePopup';
import TrainingDashboard from './components/TrainingDashboard';
import TrainerDashboard from './components/Trainer/TrainerDashboard';
import SupervisorDashboard from './components/Supervisor/SupervisorDashboard';
import ManagerDashboard from './components/Manager/ManagerDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';

import API_URL from './config';
import axios from 'axios';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  
  // Simula un retardo para la pantalla de carga
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
    // Usamos un pequeño retraso para permitir que React termine de renderizar
    setTimeout(() => {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      // Si el usuario es "Recruiter" y aún no ha visto el popup, lo mostramos y actualizamos el estado en backend
      if (userData.role === 'Recruiter' && !userData.hasSeenPopup) {
        const token = userData.token || localStorage.getItem("token");
        const popupKey = `welcomePopupShown_${userData.id}`;
        const hasSeenPopup = localStorage.getItem(popupKey);
        if (!hasSeenPopup) {
          setShowPopup(true);
          localStorage.setItem(popupKey, 'true');
          axios.post(`${API_URL}/api/auth/updatePopupStatus`, {}, {
            headers: { Authorization: token }
          })
          .then(response => {
            console.log("Estado del popup actualizado:", response.data);
          })
          .catch(error => {
            console.error("Error al actualizar estado del popup:", error.response?.data || error.message);
          });
        }
      }
    }, 500); // 100 ms de retraso; puedes ajustar este tiempo si es necesario
  };

  // Manejo de tiempo de inactividad
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 15 minutos en milisegundos
    let timeout = setTimeout(() => {
      setUser(null);
      // Borra la bandera de popup del usuario
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser && storedUser.id) {
        localStorage.removeItem(`welcomePopupShown_${storedUser.id}`);
      }
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate("/");
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

  const getDashboardForRole = (role) => {
    switch (role) {
      case 'Trainer':
        return <TrainerDashboard setUser={setUser} user={user} />;
      case 'Recruiter':
        return <TrainingDashboard setUser={setUser} user={user} />;
      case 'Supervisor':
        return <SupervisorDashboard setUser={setUser} user={user} />;
      case 'Manager':
        return <ManagerDashboard setUser={setUser} user={user} />;
      case 'Admin':
        return <AdminDashboard setUser={setUser} user={user} />;
      // más roles aquí...
      default:
        return <Navigate to="/" />;
    }
  };
  
  <Route
    path="/dashboard"
    element={user ? getDashboardForRole(user.role) : <Navigate to="/" />}
  />
  
  return (
    <>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
        />
       <Route path="/dashboard" element={user ? getDashboardForRole(user.role) : <Navigate to="/" />}/>
      </Routes>
      {showPopup && <WelcomePopup onClose={() => setShowPopup(false)} />}
    </>
  );
}

export default App;
