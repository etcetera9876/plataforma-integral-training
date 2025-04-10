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
    if (user) {
      console.log("Iniciando conexión de Socket.IO para el usuario:", user);

      // Crea una nueva conexión de socket
      const newSocket = io("http://localhost:5000", {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Almacena la conexión en el estado
      setSocket(newSocket);

      // Escucha el evento dbChange
      newSocket.on("dbChange", (updatedCourses) => {
        console.log("Evento dbChange recibido:", updatedCourses);

        // Actualiza el estado de los cursos
        setCourses((prevCourses) => {
          // Crea un mapa de los cursos existentes
          const existingCoursesMap = new Map(prevCourses.map((course) => [course._id, course]));

          // Actualiza/agrega los nuevos cursos
          updatedCourses.forEach((course) => {
            existingCoursesMap.set(course._id, course);
          });

          // Ordena los cursos por publicationDate en orden descendente
          const updated = Array.from(existingCoursesMap.values()).sort((a, b) => {
            return new Date(b.publicationDate) - new Date(a.publicationDate); // Ordenar por fecha de publicación
          });
          
          return updated;
        });
      });

      // Limpia los eventos al desmontar el componente
      return () => {
        newSocket.off("dbChange");
        newSocket.disconnect();
      };
    }
  }, [user]); // Se ejecuta cada vez que cambia el usuario

  // Obtener los cursos creados desde el backend
  useEffect(() => {
    if (!user) return;

    console.log("Usuario logueado:", user);
    console.log("branchId enviado:", user.branchId); // Ahora debería ser un ObjectId
  
    axios
      .get(`/api/courses`, {
        params: {
          recruiterId: user.id,
          branchId: user.branchId, // Usa el ObjectId del branch
        },
      })
      .then((response) => {
        setCourses(response.data); // Actualiza el estado con los cursos obtenidos
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