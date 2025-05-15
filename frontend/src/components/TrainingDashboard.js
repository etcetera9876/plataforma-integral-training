import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDashboard } from './DashboardContext';
import Sidebar from './Sidebar';
import AlertMessage from './Trainer/AlertMessage';
import './TrainingDashboard.css';
import checkIcon from '../assets/check-icon.png';
import axios from 'axios';

const TrainingDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });
  const [now, setNow] = useState(new Date());
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedCourseName, setLockedCourseName] = useState("");
  const [showLockedAssessmentModal, setShowLockedAssessmentModal] = useState(false);
  const [lockedAssessmentName, setLockedAssessmentName] = useState("");
  const [assessmentStates, setAssessmentStates] = useState({}); // { [assessmentId]: { status, result } }
  const [showResultModal, setShowResultModal] = useState(false);
  const [modalResult, setModalResult] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false); // Estado para el modal de curso

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
    if (assessment.isLocked) {
      setLockedAssessmentName(assessment.name);
      setShowLockedAssessmentModal(true);
      return;
    }
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

  // Filtrar assessments para mostrar solo los tests libres o los relacionados a cursos ya resueltos o listos para resolver (canTakeTest)
  const visibleAssessments = assessments.filter((assessment) => {
    // Test libre: no tiene cursos relacionados
    const isLibre = !assessment.relatedCourses || assessment.relatedCourses.length === 0;
    // Test relacionado: mostrar si ya fue resuelto o si está listo para resolver (canTakeTest)
    const isRelacionadoListo = Array.isArray(assessment.relatedCourses) && assessment.relatedCourses.length > 0 && assessment.canTakeTest;
    // Fechas de publicación/expiración
    const pub = assessment.publicationDate ? new Date(assessment.publicationDate) : null;
    const exp = assessment.expirationDate ? new Date(assessment.expirationDate) : null;
    const fechaOk = (!pub || now >= pub) && (!exp || now < exp);
    return fechaOk && (isLibre || isRelacionadoListo);
  });

  // Maneja el flujo del botón y resultado
  const handleAssessmentButtonClick = async (assessment) => {
    const state = assessmentStates[assessment._id];
    if (!assessment.submittedAt) {
      // No debería pasar, pero por seguridad
      return;
    }
    // Si ya tenemos resultado local, mostrar modal
    if (state && state.result) {
      setModalResult({ ...state.result, name: assessment.name });
      setShowResultModal(true);
      return;
    }
    // Si no, consulta el backend para obtener el subtest
    try {
      setAssessmentStates(prev => ({ ...prev, [assessment._id]: { status: 'loading' } }));
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId') || (JSON.parse(localStorage.getItem('user'))?.id);
      const res = await axios.get(`/api/assessments/${assessment._id}/subtests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subtest = Array.isArray(res.data)
        ? res.data.find(st => String(st.userId?._id || st.userId) === String(userId))
        : null;
      if (subtest && typeof subtest.score === 'number') {
        const result = {
          score: subtest.score,
          correctCount: subtest.correctCount,
          totalQuestions: subtest.totalQuestions
        };
        setAssessmentStates(prev => ({ ...prev, [assessment._id]: { status: 'done', result } }));
        setModalResult({ ...result, name: assessment.name });
        setShowResultModal(true);
      } else {
        setSnackbar({ open: true, message: 'No se pudo obtener el resultado.', type: 'error' });
        setAssessmentStates(prev => ({ ...prev, [assessment._id]: { status: 'error' } }));
      }
    } catch {
      setSnackbar({ open: true, message: 'Error al consultar el resultado.', type: 'error' });
      setAssessmentStates(prev => ({ ...prev, [assessment._id]: { status: 'error' } }));
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar onLogout={handleLogout} userName={user.name} userId={user.id} />
      <main className="training-main-content">
        <h1>Dashboard de Recruiter</h1>
        <p>Bienvenido al área de administración. Aquí puedes gestionar cursos, simulaciones y más.</p>

        <section className="training-courses-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2>Tus Cursos</h2>
         
          </div>
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
          <h2 style={{marginTop: 80}}>Tus Evaluaciones</h2>
          {visibleAssessments.length > 0 ? (
            <div className="training-course-list scrollable-container">
              {visibleAssessments.map((assessment) => {
                const state = assessmentStates[assessment._id];
                let buttonText = 'Resolver evaluación';
                let buttonDisabled = false;
                if (assessment.isLocked) {
                  buttonText = 'Evaluación bloqueada';
                  buttonDisabled = true;
                } else if (!assessment.canTakeTest) {
                  buttonText = 'Debes firmar todos los cursos relacionados';
                  buttonDisabled = true;
                } else if (state && state.status === 'sending') {
                  buttonText = 'Corrigiendo...';
                  buttonDisabled = true;
                } else if (assessment.submittedAt) {
                  buttonText = 'Mostrar puntaje';
                  buttonDisabled = false; // Siempre habilitado visualmente
                }
                return (
                  <div
                    key={assessment._id}
                    className="training-course-item"
                    style={{

                      position: 'relative',
                      minWidth: 260,
                      maxWidth: 320,
                      margin: '0 16px 24px 0',
                      background: assessment.submittedAt ? '#f5f5f5' : '#fff',
                      borderRadius: 10,
                      boxShadow: '0 2px 8px #e0e0e0',
                      padding: 18,
                      display: 'inline-block',
                      verticalAlign: 'top'
                    }}
                    onClick={() => {
                      if (assessment.isLocked) {
                        setLockedAssessmentName(assessment.name);
                        setShowLockedAssessmentModal(true);
                      }
                    }}
                  >
                    {/* Contenido opaco excepto el botón */}
                    <div
                      style={{
                        opacity: (assessment.submittedAt || assessment.isLocked) ? 0.6 : 1,
                        pointerEvents: (assessment.submittedAt || assessment.isLocked) ? 'none' : 'auto'
                      }}
                    >
                      {/* Icono de candado si la evaluación está bloqueada */}
                      {assessment.isLocked && (
                        <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 22, color: '#ff9800', zIndex: 2 }} title="Evaluación bloqueada">🔒</span>
                      )}
                      <h3 className="training-course-title">{assessment.name}</h3>
                      <p className="training-course-info">{assessment.description}</p>
                    </div>
                    {/* Botón SIEMPRE habilitado */}
                    <button
                      className={`confirm-button${buttonText === 'Mostrar puntaje' ? ' show-result-active' : ''}`}
                      style={{
                        marginTop: 12,
                        opacity: 1,
                        cursor: 'pointer',
                        background: buttonText === 'Mostrar puntaje' ? '#1976d2' : undefined,
                        color: buttonText === 'Mostrar puntaje' ? '#fff' : undefined,
                        zIndex: 2,
                        position: 'relative'
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        if (assessment.isLocked) {
                          setLockedAssessmentName(assessment.name);
                          setShowLockedAssessmentModal(true);
                          return;
                        }
                        if (buttonText === 'Debes firmar todos los cursos relacionados') {
                          const courseNames = (assessment.relatedCourseNames || []).join(', ');
                          setSnackbar({ open: true, message: `Debes firmar los cursos relacionados: ${courseNames}`, type: 'info' });
                          return;
                        }
                        if (!assessment.submittedAt) {
                          setAssessmentStates(prev => ({ ...prev, [assessment._id]: { status: 'sending' } }));
                          handleAssessmentClick(assessment);
                        } else {
                          handleAssessmentButtonClick(assessment);
                        }
                      }}
                      disabled={buttonDisabled && buttonText !== 'Mostrar puntaje' && buttonText !== 'Debes firmar todos los cursos relacionados'}
                    >
                      {buttonText}
                    </button>
                  </div>
                );
              })}
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

        {/* Modal de evaluación bloqueada */}
        {showLockedAssessmentModal && (
          <div className="modal-overlay" onClick={() => setShowLockedAssessmentModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Evaluación bloqueada</h3>
              <p style={{ textAlign: 'center', marginBottom: 24 }}>
                La evaluación <b>"{lockedAssessmentName}"</b> está bloqueada por el trainer.<br />No puedes acceder hasta que sea desbloqueada.
              </p>
              <div className="modal-actions" style={{ justifyContent: 'center' }}>
                <button className="confirm-button" onClick={() => setShowLockedAssessmentModal(false)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de resultado de test */}
        {showResultModal && modalResult && (
          <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
              <h2 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 18 }}>Resultado de "{modalResult.name}"</h2>
              <p style={{ fontSize: 20, margin: '32px 0' }}>
                Puntaje: <b>{modalResult.score}%</b><br />
                Respuestas correctas: <b>{modalResult.correctCount}</b> de <b>{modalResult.totalQuestions}</b>
              </p>
              <button className="confirm-button" style={{ minWidth: 130, fontSize: 17, padding: '6px 24px' }} onClick={() => setShowResultModal(false)}>
                Cerrar
              </button>
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