import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaBars } from 'react-icons/fa';
import axios from 'axios';
import './Sidebar.css';
import API_URL from '../config';

const Sidebar = ({ onLogout, userName, userId }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState('');
  const [place, setPlace] = useState('');

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/users/${userId}`);
        setRole(response.data.role);
        setPlace(response.data.place);
      } catch (error) {
        console.error('Error obteniendo datos del usuario:', error);
      }
    };

    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="toggle-button" onClick={toggleSidebar}>
          <FaBars />
        </button>
        {!collapsed && (
          <div>
            <h2>{userName}</h2>
            <p className="role-place">{role} - {place}</p>
          </div>
        )}
      </div>

      <nav className="sidebar-menu">
        <ul>
          <li>
            <img src={require('../assets/training.png')} alt="Training" className="menu-icon" />
            {!collapsed && <span>Training</span>}
          </li>
          <li>
            <img src={require('../assets/hr-management.png')} alt="Candidate Management" className="menu-icon" />
            {!collapsed && <span>Candidate Management</span>}
          </li>
          <li>
            <img src={require('../assets/choice.png')} alt="Resume Optimization" className="menu-icon" />
            {!collapsed && <span>Resume Optimization</span>}
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer" onClick={onLogout}>
        <FaSignOutAlt className="menu-icon" />
        {!collapsed && <span>Cerrar Sesión</span>}
      </div>
    </div>
  );
};

export default Sidebar;
