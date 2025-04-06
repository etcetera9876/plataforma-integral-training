// src/components/TrainingDashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import './TrainingDashboard.css';


const TrainingDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <Sidebar onLogout={handleLogout} userName={user.name} userId={user.id} />
      <main className="main-content">
        <h1>Dashboard de Training</h1>
        <p>Bienvenido al área de administración. Aquí puedes gestionar cursos, simulaciones y más.</p>
       
      </main>
    </div>
  );
};

export default TrainingDashboard;
