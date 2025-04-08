// frontend/src/components/TrainerDashboard.js
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import './AdminDashboard.css';

const AdminDashboard = ({ setUser, user }) => {
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
        <h1>Admin Dashboard</h1>
        <p>Bienvenido al panel de entrenamiento. Aquí puedes crear y programar cursos y evaluaciones.</p>
      </main>
    </div>
  );
};

export default AdminDashboard;
