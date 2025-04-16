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

  // Modal para curso bloqueado
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedCourseName, setLockedCourseName] = useState("");

  const handleCourseClick = (course) => {
    if (course.isLocked) {
      setLockedCourseName(course.name);
      setShowLockedModal(true);
    } else {
      // Aquí iría la lógica para acceder al curso normalmente
      // Por ejemplo: navigate(`/curso/${course._id}`)
    }
  };

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
  
    newSocket.on("dbChange", () => {
      // Cuando llegue un cambio, vuelve a pedir los cursos al endpoint correcto
      if (!user) return;
      axios
        .get('/api/courses', {
          params: {
            recruiterId: user.id,
            branchId: user.branchId,
          },
        })
        .then((response) => {
          const currentDate = new Date();
          const validCourses = response.data.filter((course) => {
            const assignedToArr = Array.isArray(course.assignedTo)
              ? course.assignedTo.map(id => (typeof id === 'object' && id !== null && id.toString) ? id.toString() : id)
              : [];
            const isAssignedToAll = assignedToArr.includes("All recruiters");
            const isAssignedToUser = assignedToArr.includes(user.id) || assignedToArr.includes(String(user.id));
            const notExpired = !course.expirationDate || new Date(course.expirationDate) > currentDate;
            return notExpired && (isAssignedToAll || isAssignedToUser);
          });
          const sortedCourses = validCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setCourses(sortedCourses);
        })
        .catch((error) => {
          console.error("[SOCKET] Error al obtener los cursos:", error);
        });
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user]);


  // Obtener los cursos creados desde el backend
  useEffect(() => {
    if (!user) return;
    // Usa SIEMPRE el endpoint correcto para reclutador
    axios
      .get('/api/courses', {
        params: {
          recruiterId: user.id,
          branchId: user.branchId,
        },
      })
      .then((response) => {
        console.log("Cursos recibidos del backend:", response.data);
        const currentDate = new Date();
        const validCourses = response.data.filter((course) => {
          const assignedToArr = Array.isArray(course.assignedTo)
            ? course.assignedTo.map(id => (typeof id === 'object' && id !== null && id.toString) ? id.toString() : id)
            : [];
          const isAssignedToAll = assignedToArr.includes("All recruiters");
          const isAssignedToUser = assignedToArr.includes(user.id) || assignedToArr.includes(String(user.id));
          const notExpired = !course.expirationDate || new Date(course.expirationDate) > currentDate;
          if (!(notExpired && (isAssignedToAll || isAssignedToUser))) {
            console.log("Curso filtrado:", course.name, {notExpired, isAssignedToAll, isAssignedToUser, assignedToArr, expirationDate: course.expirationDate});
          }
          return notExpired && (isAssignedToAll || isAssignedToUser);
        });
        console.log("Cursos que pasan el filtro:", validCourses);
        const sortedCourses = validCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCourses(sortedCourses);
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
                <div key={course._id} className="training-course-item" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => handleCourseClick(course)}>
                  {/* Icono de candado si el curso está bloqueado */}
                  {course.isLocked && (
                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 22, color: '#ff9800' }} title="Curso bloqueado">🔒</span>
                  )}
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

        {/* Modal de curso bloqueado */}
        {showLockedModal && (
          <div className="modal-overlay" onClick={() => setShowLockedModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Curso bloqueado</h3>
              <p style={{ textAlign: 'center', marginBottom: 24 }}>
                El curso <b>"{lockedCourseName}"</b> está bloqueado por el trainer.<br />No puedes acceder hasta que sea desbloqueado.
              </p>
              <div className="modal-actions" style={{ justifyContent: 'center' }}>
                <button className="confirm-button" onClick={() => setShowLockedModal(false)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TrainingDashboard;