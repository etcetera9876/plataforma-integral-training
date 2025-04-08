// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaBars } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Sidebar.css';
import API_URL from '../config';
import { SIDEBAR_MODULES } from '../constants/sidebarConfig';

const Sidebar = ({ onLogout, userName, userId }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState('');
  const [place, setPlace] = useState('');
  const navigate = useNavigate();

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

  const handleNavigate = (route) => {
    navigate(route);
  };

  const filteredModules = SIDEBAR_MODULES
  .filter(mod => mod.roles.includes(role))
  .sort((a, b) => a.order - b.order);


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
            <li key={mod.key} onClick={() => handleNavigate(mod.route)}>
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
    </div>
  );
};

export default Sidebar;
