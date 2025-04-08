// frontend/src/components/TrainerDashboard.js
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import './ManagerDashboard.css';

const ManagerDashboard = ({ setUser, user }) => {
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
        <h1>Manager Dashboard</h1>
        <p>Bienvenido al panel de entrenamiento. Aquí puedes crear y programar cursos y evaluaciones.</p>
      </main>
    </div>
  );
};

export default ManagerDashboard;
