import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import Sidebar from './Sidebar';
import './TrainingDashboard.css';

const TrainingDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState([]); // Guardar todos los cursos del backend
  const [courses, setCourses] = useState([]); // Cursos filtrados
  const [assessments, setAssessments] = useState([]); // Evaluaciones asignadas
  const [socket, setSocket] = useState(null); // Estado para almacenar la instancia de socket
  const [now, setNow] = useState(new Date()); // Estado para actualización automática

  // Modal para curso bloqueado
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedCourseName, setLockedCourseName] = useState("");

  const handleCourseClick = (course) => {
    if (course.isLocked) {
      setLockedCourseName(course.name);
      setShowLockedModal(true);
    } else {
      navigate(`/course/${course._id}`);
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

  // Socket: solo actualiza los cursos del backend, no el filtrado
  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  
    newSocket.on("dbChange", () => {
      if (!user) return;
      axios
        .get('/api/courses', {
          params: {
            recruiterId: user.id,
            branchId: user.branchId,
          },
        })
        .then((response) => {
          setAllCourses(response.data);
        })
        .catch((error) => {
          console.error("[SOCKET] Error al obtener los cursos:", error);
        });
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user]);

  // Actualización automática de 'now' cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000); // 1 segundo
    return () => clearInterval(interval);
  }, []);

  // Obtener los cursos creados desde el backend SOLO cuando cambia el usuario o llega un evento de socket
  useEffect(() => {
    if (!user) return;
    axios
      .get('/api/courses', {
        params: {
          recruiterId: user.id,
          branchId: user.branchId,
        },
      })
      .then((response) => {
        setAllCourses(response.data);
      })
      .catch((error) => {
        console.error("Error al obtener los cursos:", error);
      });
  }, [user]);

  // Obtener las evaluaciones asignadas desde el backend
  useEffect(() => {
    if (!user) return;
    axios
      .get('/api/assessments/assigned', {
        params: {
          userId: user.id,
          branchId: user.branchId,
        },
        headers: {
          Authorization: localStorage.getItem('token')
        }
      })
      .then((response) => {
        setAssessments(response.data);
      })
      .catch((error) => {
        console.error("Error al obtener las evaluaciones:", error);
      });
  }, [user]);

  // Filtrar cursos en el frontend cada vez que cambian allCourses, user o now
  useEffect(() => {
    if (!user) return;
    const validCourses = allCourses.filter((course) => {
      const assignedToArr = Array.isArray(course.assignedTo)
        ? course.assignedTo.map(id => (typeof id === 'object' && id !== null && id.toString) ? id.toString() : id)
        : [];
      const isAssignedToAll = assignedToArr.includes("All recruiters");
      const isAssignedToUser = assignedToArr.includes(user.id) || assignedToArr.includes(String(user.id));
      const notExpired = !course.expirationDate || new Date(course.expirationDate) > now;
      let isPublished = false;
      if (!course.publicationDate) {
        isPublished = true;
      } else {
        const pubDate = new Date(course.publicationDate);
        isPublished = pubDate <= now;
      }
      return notExpired && isPublished && (isAssignedToAll || isAssignedToUser);
    });
    const sortedCourses = validCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setCourses(sortedCourses);
  }, [allCourses, user, now]);

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

        <section className="training-assessments-section">
          <h2>Tus Evaluaciones</h2>
          {assessments.length > 0 ? (
            <div className="training-course-list scrollable-container">
              {assessments.map((assessment) => (
                <div
                  key={assessment._id}
                  className="training-course-item"
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    minWidth: 260,
                    maxWidth: 320,
                    margin: '0 16px 24px 0',
                    background: '#fff',
                    borderRadius: 10,
                    boxShadow: '0 2px 8px #e0e0e0',
                    padding: 18,
                    display: 'inline-block',
                    verticalAlign: 'top'
                  }}
                >
                  <h3 className="training-course-title">{assessment.name}</h3>
                  <p className="training-course-info">{assessment.description}</p>
                  <button
                    className="confirm-button"
                    style={{ marginTop: 12 }}
                    onClick={() => navigate(`/assessment/${assessment._id}`)}
                  >
                    Resolver evaluación
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="training-empty-message">No tienes evaluaciones asignadas aún.</p>
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