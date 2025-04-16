import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import Sidebar from './Sidebar';
import './TrainingDashboard.css';

const TrainingDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]); // Estado para almacenar los cursos
  const [socket, setSocket] = useState(null); // Estado para almacenar la instancia de socket

  const handleLogout = () => {
    // Desconecta el socket actual
    if (socket) {
      socket.disconnect();
      setSocket(null); // Limpia el socket del estado
    }

    // Limpia el almacenamiento local y redirige al inicio de sesión
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  // Configura la conexión de Socket.IO al iniciar sesión
  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  
    newSocket.on("dbChange", (updatedCourses) => {
      const currentDate = new Date();
      // Filtrar solo los cursos válidos y asignados al usuario actual
      const validCourses = updatedCourses.filter((course) => {
        const isAssignedToAll = course.assignedTo.includes("All recruiters");
        const isAssignedToUser = course.assignedTo.some((id) => String(id) === String(user.id));
        return (!course.expirationDate || new Date(course.expirationDate) > currentDate) && (isAssignedToAll || isAssignedToUser);
      });
      const sortedCourses = validCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setCourses(sortedCourses);
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user]);


  // Obtener los cursos creados desde el backend
  useEffect(() => {
    if (!user) return;
  
    axios
      .get(`/api/courses`, {
        params: {
          recruiterId: user.id,
          branchId: user.branchId, // Usa el ObjectId del branch
        },
      })
      .then((response) => {

        const currentDate = new Date();
        const validCourses = response.data.filter((course) => {
          const isAssignedToAll = course.assignedTo.includes("All recruiters");
          const isAssignedToUser = course.assignedTo.some((id) => id === user.id);
          return (!course.expirationDate || new Date(course.expirationDate) > currentDate) && (isAssignedToAll || isAssignedToUser);
        });

        const sortedCourses = validCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCourses(sortedCourses); // Actualiza el estado con los cursos obtenidos
      })
      .catch((error) => {
        console.error("Error al obtener los cursos:", error);
      });
  }, [user]);



  return (
    <div className="dashboard-container">
      <Sidebar onLogout={handleLogout} userName={user.name} userId={user.id} />
      <main className="training-main-content">
        <h1>Dashboard de Recruiter</h1>
        <p>Bienvenido al área de administración. Aquí puedes gestionar cursos, simulaciones y más.</p>

        <section className="training-courses-section">
          <h2>Tus Cursos</h2>
          {courses.length > 0 ? (
            <div className="training-course-list scrollable-container"> {/* Clase para scroll horizontal */}
              {courses.map((course) => (
                <div key={course._id} className="training-course-item">
                  <h3 className="training-course-title">{course.name}</h3>
                  <p className="training-course-info">
                    Creado el: {new Date(course.createdAt).toLocaleDateString()}
                  </p>
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