// src/components/TrainingDashboard.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        localStorage.removeItem('token'); // Borra el token
        navigate('/login'); // Redirige al login
      }, 120000); // 900,000 ms = 15 minutos
    };

    // Eventos para detectar actividad
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    
    resetTimer(); // Iniciar el timer cuando el usuario entra al dashboard

    return () => {
      clearTimeout(inactivityTimer); // Limpia el timer al salir del dashboard
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [navigate]);

  return (
    <div>
      <h1>Bienvenido al Dashboard</h1>
      <p>Si no interactúas durante 15 minutos, serás desconectado.</p>
      <h2>Dashboard de Training</h2>
      <nav>
        <ul>
          <li>Curso de Training para Reclutadores</li>
          <li>Simulación de Entrevistas (Materiales, Videos, Exámenes Teóricos y Prácticos)</li>
          <li>Sistema Integral de Gestión de Candidatos</li>
          <li>Módulo de Onboarding y Capacitación Virtual</li>
          <li>Herramienta de Optimización de CVs y Preselección con IA</li>
        </ul>
      </nav>
      {/* Aquí puedes ir añadiendo componentes o enlaces a cada módulo */}
    </div>
  );
};

export default Dashboard;

