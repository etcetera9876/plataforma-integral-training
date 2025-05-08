// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaBars } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Sidebar.css';
import API_URL from '../config';
import { SIDEBAR_MODULES } from '../constants/sidebarConfig';

const Sidebar = ({ onLogout, userName, userId, onShowResults }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState('');
  const [place, setPlace] = useState('');
  const [showPopup, setShowPopup] = useState(false); // Agregado el hook useState
  const navigate = useNavigate();
  const location = useLocation(); // Para obtener la ruta actual
 

  useEffect(() => {
    if (!userId) return;
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/users/${userId}`, {
          headers: { Authorization: token }
        });
        setRole(response.data.role);
        setPlace(response.data.place);
      } catch (error) {
        console.error('Error obteniendo datos del usuario:', error);
      }
    };
    fetchUserDetails();
  }, [userId]);

  const toggleSidebar = () => setCollapsed(prev => !prev);

  const handleNavigate = (route, mod) => {
    if (mod.key === 'results' && typeof onShowResults === 'function') {
      onShowResults();
      return;
    }
    navigate(route);
  };

  // Filtrar módulos según el rol del usuario
  const filteredModules = SIDEBAR_MODULES.filter((mod) =>
    mod.roles.includes(role)
  );


  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* HEADER */}
      <div className="sidebar-header">
        <button className="toggle-button" onClick={toggleSidebar}>
          <FaBars />
        </button>
        {!collapsed && (
          <div className="header-info">
            <h2><span>Hello, {userName}</span></h2>
            <p className="role-place"><span>{role} - {place}</span></p>
          </div>
        )}
      </div>

      {/* MENU */}
      <nav className="sidebar-menu">
        <ul>
          {filteredModules.map(mod => (
            <li key={mod.key}
                className={mod.key === 'results' && typeof onShowResults === 'function' ? (window.location.pathname === '/courses-assessments' && onShowResults ? 'active' : '') : (location.pathname === mod.route ? 'active' : '')}
                onClick={() => handleNavigate(mod.route, mod)}>
              <img src={mod.icon} alt={mod.label} className="menu-icon" />
              {!collapsed && <span>{mod.label}</span>}
            </li>
          ))}
        </ul>
      </nav>

      {/* FOOTER */}
      <div className="sidebar-footer" onClick={onLogout}>
        <FaSignOutAlt className="menu-icon" />
        {!collapsed && <span>Cerrar Sesión</span>}
      </div>


      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Próximamente</h3>
            <p>Esta funcionalidad estará disponible en futuras actualizaciones.</p>
            <button onClick={() => setShowPopup(false)} className='bottom-cerrar'>Cerrar</button>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Sidebar;
