import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDashboard } from './DashboardContext';
import Sidebar from './Sidebar';
import AlertMessage from './Trainer/AlertMessage';
import './TrainingDashboard.css';
import checkIcon from '../assets/check-icon.png';

const TrainingDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });
  const [now, setNow] = useState(new Date());
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedCourseName, setLockedCourseName] = useState("");

  // Usar datos del contexto global
  const { courses, signedCourses, assessments, loading, refetchAll } = useDashboard();

  const handleCourseClick = (course) => {
    if (course.isLocked) {
      setLockedCourseName(course.name);
      setShowLockedModal(true);
    } else {
      navigate(`/course/${course._id}`);
    }
  };

  const handleAssessmentClick = (assessment) => {
    if (assessment.submittedAt) {
      setSnackbar({ open: true, message: 'Ya se tomó el test.', type: 'info' });
      return;
    }
    if (!assessment.canTakeTest && Array.isArray(assessment.relatedCourses) && assessment.relatedCourses.length > 0) {
      const courseNames = (assessment.relatedCourseNames || []).join(', ');
      setSnackbar({ open: true, message: `Debes firmar los cursos: ${courseNames}`, type: 'info' });
      return;
    }
    navigate(`/assessment/${assessment._id}`);
  };

  const handleLogout = () => {
    // Limpia el almacenamiento local y redirige al inicio de sesión
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  // Actualización automática de 'now' cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000); // 1 segundo
    return () => clearInterval(interval);
  }, []);

  // Mostrar snackbar de éxito tras enviar el test
  useEffect(() => {
    if (location.state && location.state.successMessage) {
      setSnackbar({ open: true, message: location.state.successMessage, type: 'success' });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Cierre automático del snackbar después de 1.5s
  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar(s => ({ ...s, open: false }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

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
                  {/* Icono de check si el curso está firmado */}
                  {signedCourses.some(id => String(id) === String(course._id)) && (
                    <img src={checkIcon} alt="Curso firmado" title="Curso firmado" style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, zIndex: 3 }} />
                  )}
                  {/* Icono de candado si el curso está bloqueado, debajo del check-icon */}
                  {course.isLocked && (
                    <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 22, color: '#ff9800', zIndex: 2 }} title="Curso bloqueado">🔒</span>
                  )}
                  {/* Nombre del curso y check-icon alineados en extremos */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
                    <h3 className="training-course-title" style={{ margin: 0 }}>{course.name}</h3>
                  </div>
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
                    cursor: assessment.submittedAt ? 'not-allowed' : 'pointer',
                    minWidth: 260,
                    maxWidth: 320,
                    margin: '0 16px 24px 0',
                    background: assessment.submittedAt ? '#f5f5f5' : '#fff',
                    borderRadius: 10,
                    boxShadow: '0 2px 8px #e0e0e0',
                    padding: 18,
                    display: 'inline-block',
                    verticalAlign: 'top',
                    opacity: assessment.submittedAt ? 0.6 : 1,
                    pointerEvents: assessment.submittedAt ? 'auto' : 'auto'
                  }}
                  onClick={() => handleAssessmentClick(assessment)}
                >
                  <h3 className="training-course-title">{assessment.name}</h3>
                  <p className="training-course-info">{assessment.description}</p>
                  <button
                    className="confirm-button"
                    style={{ marginTop: 12 }}
                    onClick={e => { e.stopPropagation(); handleAssessmentClick(assessment); }}
                    disabled={assessment.submittedAt || !assessment.canTakeTest}
                  >
                    {assessment.submittedAt
                      ? 'Ya respondido'
                      : assessment.canTakeTest
                        ? 'Resolver evaluación'
                        : 'Debes firmar todos los cursos relacionados'}
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

        {/* Snackbar de éxito */}
        <AlertMessage
          open={snackbar.open}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        />
      </main>
    </div>
  );
};

export default TrainingDashboard;