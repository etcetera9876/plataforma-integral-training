// src/components/TrainingDashboard.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import './TrainingDashboard.css';

const TrainingDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]); // Estado para almacenar los cursos

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  // Obtener los cursos creados desde el backend
  useEffect(() => {
    axios
      .get(`/api/courses?recruiterId=${user.id}`) // Filtra por el recruiter logueado
      .then((response) => {
        setCourses(response.data); // Actualiza el estado con los cursos obtenidos
      })
      .catch((error) => {
        console.error("Error al obtener los cursos:", error);
      });
  }, [user.id]);

  return (
    <div className="dashboard-container">
      <Sidebar onLogout={handleLogout} userName={user.name} userId={user.id} />
      <main className="training-main-content">
  <h1>Dashboard de Recruiter</h1>
  <p>Bienvenido al área de administración. Aquí puedes gestionar cursos, simulaciones y más.</p>

  <section className="training-courses-section">
    <h2>Tus Cursos</h2>
    {courses.length > 0 ? (
      <div className="training-course-list">
        {courses.map((course) => (
          <div key={course.id} className="training-course-item">
            <h3 className="training-course-title">{course.name}</h3>
            <p className="training-course-info">Creado el: {new Date(course.createdAt).toLocaleDateString()}</p>
            <p className="training-course-info">Asignado a: {course.assignedTo}</p>
          </div>
        ))}
      </div>
    ) : (
      <p className="training-empty-message">No tienes cursos creados aún.</p>
    )}
  </section>
</main>
    </div>
  );
};

export default TrainingDashboard;