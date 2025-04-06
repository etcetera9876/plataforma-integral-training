// src/components/Sidebar.js
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
    if (!userId) return;
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/api/users/${userId}`,
          { headers: { Authorization: token } }
        );
        setRole(response.data.role);
        setPlace(response.data.place);
      } catch (error) {
        console.error('Error obteniendo datos del usuario:', error);
      }
    };
    fetchUserDetails();
  }, [userId]);

  const toggleSidebar = () => {
    setCollapsed(prev => !prev);
  };

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
          <li key="training">
            <img
              src={require('../assets/training.png')}
              alt="Training"
              className="menu-icon"
            />
            {!collapsed && <span>Training</span>}
          </li>
          <li key="candidates">
            <img
              src={require('../assets/hr-management.png')}
              alt="Candidate Management"
              className="menu-icon"
            />
            {!collapsed && <span>Candidate Management</span>}
          </li>
          <li key="resume">
            <img
              src={require('../assets/choice.png')}
              alt="Resume Optimization"
              className="menu-icon"
            />
            {!collapsed && <span>Resume Optimization</span>}
          </li>
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
