import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import API_URL from "../../config";
import Sidebar from "../Sidebar";
import useBranches from "../../hooks/useBranches";
import CourseModal from "./CourseModal"; // Asegúrate de importar CourseModal
import "./TrainerDashboard.css";
import io from "socket.io-client"; // Importación de Socket.IO
import { useNavigate, useLocation } from "react-router-dom";
import { ConfirmModal } from "./ConfirmModal"; // Importa el modal de confirmación
import CourseEditModal from "./CourseEditModal"; // Importa el nuevo modal de edición
import { getCourseStatus } from '../../utils/courseStatus'; // Importa la función centralizada
import AssessmentModal from "./AssessmentModal"; // Importa el modal de evaluación
import BlocksConfigModal from "./ComponentsConfigModal"; // Importación corregida
import AlertMessage from "./AlertMessage"; // Importa el componente AlertMessage
import QuestionBankModal from './QuestionBankModal';
import { FaLock, FaLockOpen } from "react-icons/fa";

// Configuración de Socket.IO
const socketUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const socket = io(socketUrl, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const TrainerDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { branches, loading } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [courses, setCourses] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [showCourseModal, setShowCourseModal] = useState(false); // Estado para manejar el modal
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [now, setNow] = useState(new Date()); // Para forzar re-render periódico

  // Estado y lógica para evaluaciones
  const [assessments, setAssessments] = useState([]);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [isAssessmentConfirmModalOpen, setIsAssessmentConfirmModalOpen] = useState(false);
  const [assessmentSuccessMessage, setAssessmentSuccessMessage] = useState("");
  const [isAssessmentSuccessModalOpen, setIsAssessmentSuccessModalOpen] = useState(false);

  // Estado global de bloques de evaluación para la sucursal
  const [blocks, setBlocks] = useState([]);
  const [showComponentsConfigModal, setShowComponentsConfigModal] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "info" });

  // Cargar bloques desde el backend cada vez que cambia la sucursal
  useEffect(() => {
    if (!selectedBranch) {
      setBlocks([]);
      return;
    }
    const token = user?.token || localStorage.getItem("token");
    axios.get(`${API_URL}/api/assessments/blocks/${selectedBranch}`, {
      headers: { Authorization: token }
    })
      .then(res => setBlocks(res.data))
      .catch(() => setBlocks([]));
  }, [selectedBranch, user]);

  const handleUpdate = (course) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (courseId) => {
    setCourseToDelete(courseId); // Guarda el ID del curso a eliminar
    setIsConfirmModalOpen(true); // Abre el modal de confirmación
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courses/${courseToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar el curso");
      }
      setSnackbar({ open: true, message: "Curso eliminado correctamente", type: "success" });
      fetchCourses();
    } catch (error) {
      console.error("Error al eliminar el curso:", error);
      alert(error.message || "Hubo un error al eliminar el curso");
    } finally {
      setIsConfirmModalOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleToggleLock = async (courseId, isLocked) => {
    try {
      // Usa la URL absoluta para asegurar que apunte al backend correcto
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/toggle-lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      // Verifica que la respuesta sea JSON y status 200
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorMsg = "Error al cambiar el estado de bloqueo";
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          errorMsg = data.message || errorMsg;
        }
        throw new Error(errorMsg);
      }
      if (contentType && contentType.includes("application/json")) {
        await response.json();
      }
      fetchCourses();
    } catch (error) {
      console.error("Error al cambiar el estado de bloqueo:", error);
      alert(error.message || "Hubo un error al cambiar el estado de bloqueo");
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/"); // Redirige al login si el usuario no está definido
    }
  }, [user, navigate]);

  const getValidToken = () => {
    // Prioriza el token del usuario, si no, usa el de localStorage
    return (user && user.token) || localStorage.getItem("token") || "";
  };

  const fetchCourses = useCallback(async () => {
    if (!selectedBranch) return;
    try {
      const token = getValidToken();
      const response = await axios.get(`${API_URL}/api/courses/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedCourses = response.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setCourses(sortedCourses);
    } catch (error) {
      if (error.response?.data?.message === "Token inválido") {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
      }
      console.error("Error al obtener cursos:", error.response?.data || error.message);
    }
  }, [selectedBranch, user]);

  const fetchAssessments = useCallback(async () => {
    if (!selectedBranch) return;
    try {
      const token = getValidToken();
      const response = await axios.get(`${API_URL}/api/assessments`, {
        params: { branchId: selectedBranch },
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssessments(response.data);
    } catch (error) {
      if (error.response?.data?.message === "Token inválido") {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
      }
      console.error("Error al obtener evaluaciones:", error.response?.data || error.message);
    }
  }, [selectedBranch, user]);

  const fetchUserNames = useCallback(async (userIds) => {
    try {
      const validUserIds = userIds.filter((id) => id && id !== "All recruiters"); // Filtrar IDs válidos

      if (validUserIds.length === 0) return;

      const response = await axios.post(
        `${API_URL}/api/users/names`,
        { userIds: validUserIds },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      setUserNames((prev) => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error("Error al obtener nombres de usuarios:", error.response?.data || error.message);
    }
  }, [user.token]);

  const handleAddCourse = async (courseData) => {
    try {
      const token = user.token;
      const response = await axios.post(
        `${API_URL}/api/courses`,
        {
          ...courseData,
          createdBy: {
            id: user.id,
            name: user.name,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newCourse = response.data.course; // Acceder al curso desde response.data.course
      // console.log("Nuevo curso creado:", newCourse); // Log para depuración

      // Actualizar el estado con el nuevo curso
      setCourses((prevCourses) => [newCourse, ...prevCourses]);
      setSnackbar({ open: true, message: "Curso creado con éxito", type: "success" });
    } catch (error) {
      console.error("Error al agregar el curso:", error.response?.data || error.message);
      setSnackbar({ open: true, message: "Error al crear el curso", type: "error" });
    }
  };

  const handleLogout = () => {
    // Desconectar Socket.IO
    socket.disconnect();

    // Limpia el estado del usuario y redirige al inicio de sesión
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  useEffect(() => {
    const ids = courses
      .flatMap((course) => course.assignedTo) // Obtener todos los IDs de assignedTo
      .filter((id) => id && id !== "All recruiters"); // Filtrar IDs válidos

    if (ids.length > 0) {
      fetchUserNames(ids);
    }
  }, [courses, fetchUserNames]);

  useEffect(() => {
    if (!courses || courses.length === 0) return;
    const nowDate = new Date();
    let nextChange = null;
    let minDelta = Infinity;
    courses.forEach(course => {
      const pub = course.publicationDate ? new Date(course.publicationDate) : null;
      const exp = course.expirationDate ? new Date(course.expirationDate) : null;
      // Cambio de 'Programado' a 'Publicado'
      if (pub && pub > nowDate) {
        const delta = pub - nowDate;
        if (delta > 0 && delta < minDelta) {
          minDelta = delta;
          nextChange = pub;
        }
      }
      // Cambio de 'Publicado' a 'Expira pronto' (3 días antes de expirar)
      if (exp && pub && pub <= nowDate) {
        const soon = new Date(exp.getTime() - 3 * 24 * 60 * 60 * 1000);
        const deltaSoon = soon - nowDate;
        if (deltaSoon > 0 && deltaSoon < minDelta) {
          minDelta = deltaSoon;
          nextChange = soon;
        }
      }
      // Forzar refresco exactamente en la fecha de expiración
      if (exp && exp > nowDate) {
        const deltaExp = exp - nowDate;
        if (deltaExp > 0 && deltaExp < minDelta) {
          minDelta = deltaExp;
          nextChange = exp;
        }
      }
      // Si acaba de expirar (hasta 1 min después), refresca inmediatamente
      if (exp) {
        const deltaExp = exp - nowDate;
        if (deltaExp <= 0 && deltaExp > -60000 && Math.abs(deltaExp) < Math.abs(minDelta)) {
          minDelta = deltaExp;
          nextChange = exp;
        }
      }
    });
    if (!nextChange) return;
    const msToNext = nextChange - nowDate;
    if (msToNext <= 0) {
      setNow(new Date());
      return;
    }
    const timeout = setTimeout(() => {
      setNow(new Date());
    }, msToNext + 100); // +100ms para asegurar que la fecha ya pasó
    return () => clearTimeout(timeout);
  }, [courses, now]);

  useEffect(() => {
    if (location.state && location.state.successMessage) {
      setSnackbar({ open: true, message: location.state.successMessage, type: "success" });
      // Limpia el mensaje del state para evitar que se repita si navega de nuevo
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  const currentBranchName = branches.find((b) => b._id === selectedBranch)?.name || "";

  // Determina si hay algún modal abierto
  const isAnyModalOpen = showCourseModal || isModalOpen || isConfirmModalOpen;

  // Estado para el modal de banco de preguntas
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  // Estado para temas (puedes poblarlo desde backend si lo deseas)
  const [questionTopics] = useState(["General", "Scrum", "Kanban", "Waterfall"]); // Ejemplo

  const branchSelectedRef = useRef(false);
  const initialBranchId = useRef(location.state?.branchId || "");
  useEffect(() => {
    const branchIdToSelect = initialBranchId.current;
    if (
      branchIdToSelect &&
      branches.length > 0 &&
      !branchSelectedRef.current
    ) {
      const found = branches.find(b => String(b._id) === String(branchIdToSelect));
      if (found) {
        setSelectedBranch(branchIdToSelect);
        branchSelectedRef.current = true;
      }
    }
  }, [branches]);

  return (
    <>
      <div className={`dashboard-container${isAnyModalOpen ? ' blurred' : ''}`}>
        <Sidebar onLogout={handleLogout} userName={user.name} userId={user.id} />
        <main className="main-content">
          <h1 className="title">Trainer Dashboard</h1>
          <p className="subtitle">Bienvenido, aquí puedes gestionar cursos y evaluaciones por sucursal.</p>

          {/* Mostrar el selector solo cuando branches y selectedBranch estén listos */}
          <section className="branch-selector">
            <label htmlFor="branch-select">Select the branch:</label>
            {loading ? (
              <p>Loading branches...</p>
            ) : branches.length > 0 ? (
              <select id="branch-select" value={selectedBranch ? String(selectedBranch) : ""} onChange={handleBranchChange}>
                <option value="">-- Selecciona una sucursal --</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={String(branch._id)}>
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : (
              <p>Selecciona una sucursal...</p>
            )}
          </section>

          {selectedBranch && (
            <>
              {/* Sección de cursos */}
              <section className="courses-section">
                <div className="section-header">
                  <h2 className="section-title">{currentBranchName} Courses</h2>
                  <button
                    className="add-button"
                    onClick={() => setShowCourseModal(true)}
                    title="Agregar curso"
                  >
                    ＋
                  </button>
                </div>

                <ul className="course-list">
                  {courses.length > 0 ? (
                    courses.map((course, index) => {
                      const isNew =
                        !course.description &&
                        (!course.resources || course.resources.length === 0);
                      const status = getCourseStatus(course.publicationDate, course.expirationDate, course.createdAt, now);
                      return (
                        <li
                          key={course._id || index}
                          className={`course-item${isNew ? " new-course-alert" : ""}`}
                        >
                          <div className="course-main-row">
                            <span className="course-name">
                              📘 {course.name}
                            </span>
                            <span className="course-status" title={status.tooltip}>
                              {status.icon} {status.text}
                            </span>
                            <div className="course-actions">
                              <button
                                className="update-button"
                                onClick={() => handleUpdate(course)}
                                title={isNew ? "Agregar información al curso" : "Actualizar curso"}
                              >
                                {isNew ? "New" : "Update"}
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => handleDeleteClick(course._id)}
                                title="Eliminar curso"
                              >
                                Delete
                              </button>
                              <button
                                className={`lock-button ${course.isLocked ? "locked" : "unlocked"}`}
                                onClick={() => handleToggleLock(course._id, course.isLocked)}
                                title={course.isLocked ? "Desbloquear curso" : "Bloquear curso"}
                              >
                                {course.isLocked ? "Unlock" : "Lock"}
                              </button>
                            </div>
                          </div>
                          {isNew && (
                            <div className="incomplete-course-row">
                              <span className="incomplete-course-text">
                                Curso incompleto: agrega descripción o recursos.
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })
                  ) : (
                    <li className="empty-message">No hay cursos registrados en esta sucursal.</li>
                  )}
                </ul>
              </section>

              {/* Sección de evaluaciones */}
              <section className="assessments-section">
                <div className="section-header">
                  <h2 className="section-title">{currentBranchName} Evaluaciones</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* Botón de banco de preguntas */}
                    <button
                      className="add-button"
                      style={{ background: 'white', border: '1px solid #ccc', padding: 4, marginRight: 4 }}
                      onClick={() => setShowQuestionBankModal(true)}
                      title="Banco de preguntas"
                    >
                      <img src={require('../../assets/bank-icon.png')} alt="Banco de preguntas" style={{ width: 24, height: 24 }} />
                    </button>
                    {/* Botón para crear evaluación */}
                    <button
                      className="add-button"
                      onClick={() => setShowAssessmentModal(true)}
                      title="Agregar evaluación"
                    >
                      ＋
                    </button>
                    <button
                      className="add-button"
                      style={{ background: '#43a047' }}
                      onClick={() => setShowComponentsConfigModal(true)}
                      title="Configurar bloques/componentes"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>
                <ul className="course-list">
                  {assessments.length > 0 ? (
                    assessments.filter(a => a && a.name).map((assessment, index) => {
                      // Considera incompleto si no tiene filtros
                      const isNewAssessment = !assessment.filters;
                      return (
                        <li
                          key={assessment._id || index}
                          className={`course-item${isNewAssessment ? " new-course-alert" : ""}`}
                        >
                          <div className="course-main-row">
                            <span className="course-name">📝 {assessment.name}</span>
                            <span className="course-status">
                              {assessment.isLocked ? '🔒 Bloqueado' : '🟢 Activo'}
                            </span>
                            <div className="course-actions">
                              <button
                                className="update-button"
                                onClick={() => {
                                  if (assessment && assessment._id) {
                                    navigate(`/tests/${assessment._id}/edit`);
                                  } else {
                                    setSnackbar({ open: true, message: "Error: la evaluación seleccionada no tiene ID", type: "error" });
                                  }
                                }}
                                title={isNewAssessment ? "Agregar preguntas a la evaluación" : "Actualizar evaluación"}
                              >
                                {isNewAssessment ? "New" : "Editar"}
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => { if (assessment && assessment._id) { setAssessmentToDelete(assessment._id); setIsAssessmentConfirmModalOpen(true); } else { setSnackbar({ open: true, message: "Error: la evaluación seleccionada no tiene ID", type: "error" }); } }}
                                title="Eliminar evaluación"
                              >
                                Eliminar
                              </button>
                              <button
                                className={`lock-button ${assessment.isLocked ? "locked" : "unlocked"}`}
                                onClick={async () => {
                                  if (!assessment || !assessment._id) {
                                    setSnackbar({ open: true, message: "Error: la evaluación seleccionada no tiene ID", type: "error" });
                                    return;
                                  }
                                  try {
                                    const token = user.token || localStorage.getItem("token");
                                    const response = await axios.patch(
                                      `${API_URL}/api/assessments/${assessment._id}/toggle-lock`,
                                      {},
                                      { headers: { Authorization: `Bearer ${token}` } }
                                    );
                                    const updatedAssessment = response.data.assessment || response.data;
                                    if (updatedAssessment && updatedAssessment._id) {
                                      setAssessments((prev) => prev.map(a => a._id === updatedAssessment._id ? updatedAssessment : a));
                                      setSnackbar({ open: true, message: updatedAssessment.isLocked ? "Evaluación bloqueada" : "Evaluación desbloqueada", type: "success" });
                                    } else {
                                      setSnackbar({ open: true, message: "Error: la evaluación bloqueada no tiene ID", type: "error" });
                                    }
                                  } catch (error) {
                                    setSnackbar({ open: true, message: "Error al bloquear/desbloquear evaluación", type: "error" });
                                  }
                                }}
                                title={assessment.isLocked ? "Desbloquear evaluación" : "Bloquear evaluación"}
                              >
                                {assessment.isLocked ? <FaLock style={{ marginRight: 6 }} /> : <FaLockOpen style={{ marginRight: 6 }} />}
                                {assessment.isLocked ? "Desbloquear" : "Bloquear"}
                              </button>
                            </div>
                          </div>
                          {isNewAssessment && (
                            <div className="incomplete-course-row">
                              <span className="incomplete-course-text">
                                Evaluación incompleta: configura los filtros y genera tests personalizados.
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })
                  ) : (
                    <li className="empty-message">No hay evaluaciones registradas en esta sucursal.</li>
                  )}
                </ul>
              </section>
            </>
          )}
        </main>
      </div>

      {/* Modales fuera del dashboard-container para evitar el blur */}
      {isConfirmModalOpen && (
        <ConfirmModal
          message="¿Estás seguro de que deseas eliminar este curso?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmModalOpen(false)}
        />
      )}

      {showCourseModal && (
        <CourseModal
          branchName={currentBranchName}
          onClose={() => setShowCourseModal(false)}
          onSubmit={async (courseData) => {
            try {
              const token = user.token;
              const response = await axios.post(
                `${API_URL}/api/courses`,
                {
                  ...courseData,
                  createdBy: {
                    id: user.id,
                    name: user.name,
                  },
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const newCourse = response.data.course;
              setCourses((prevCourses) => [newCourse, ...prevCourses]);
              setSnackbar({ open: true, message: "Curso creado con éxito", type: "success" });
            } catch (error) {
              setSnackbar({ open: true, message: "Error al crear el curso", type: "error" });
            }
          }}
          branchId={selectedBranch}
        />
      )}

      {isModalOpen && (
        <CourseEditModal
          course={selectedCourse}
          branchName={currentBranchName}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchCourses}
          userNames={userNames}
        />
      )}

      {/* Modal para configurar bloques/componentes */}
      {showComponentsConfigModal && (
        <BlocksConfigModal
          blocks={blocks}
          setBlocks={setBlocks}
          onClose={() => setShowComponentsConfigModal(false)}
          branchId={selectedBranch}
        />
      )}

      {/* Modal para crear/editar evaluación */}
      {showAssessmentModal && (
        <AssessmentModal
          branchName={currentBranchName}
          onClose={() => setShowAssessmentModal(false)}
          onSubmit={async (data) => {
            try {
              const token = user.token;
              const response = await axios.post(
                `${API_URL}/api/assessments`,
                {
                  ...data,
                  createdBy: {
                    id: user.id,
                    name: user.name,
                  }
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const newAssessment = response.data.assessment || response.data;
              if (newAssessment && newAssessment._id) {
                setAssessments((prev) => [newAssessment, ...prev]);
                setSnackbar({ open: true, message: "Evaluación creada con éxito", type: "success" });
              } else {
                setSnackbar({ open: true, message: "Error: la evaluación creada no tiene ID", type: "error" });
              }
            } catch (error) {
              setSnackbar({ open: true, message: "Error al crear la evaluación", type: "error" });
            }
          }}
          branchId={selectedBranch}
          components={blocks}
        />
      )}
      {isAssessmentConfirmModalOpen && (
        <ConfirmModal
          message="¿Estás seguro de que deseas eliminar esta evaluación?"
          onConfirm={async () => {
            try {
              const token = user.token || localStorage.getItem("token");
              await axios.delete(`${API_URL}/api/assessments/${assessmentToDelete}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setAssessments((prev) => prev.filter(a => a._id !== assessmentToDelete));
              setSnackbar({ open: true, message: "Evaluación eliminada con éxito", type: "success" });
              setIsAssessmentSuccessModalOpen(true);
            } catch (error) {
              setSnackbar({ open: true, message: "Error al eliminar la evaluación", type: "error" });
            } finally {
              setIsAssessmentConfirmModalOpen(false);
              setAssessmentToDelete(null);
            }
          }}
          onCancel={() => setIsAssessmentConfirmModalOpen(false)}
        />
      )}
      <AlertMessage
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />

      {/* Modal para crear pregunta de banco */}
      {showQuestionBankModal && (
        <QuestionBankModal
          onClose={() => setShowQuestionBankModal(false)}
          topics={questionTopics}
          onCreate={async (formData) => {
            try {
              const token = user.token || localStorage.getItem("token");
              const response = await axios.post(`${API_URL}/api/questions`, formData, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data',
                },
              });
              setSnackbar({ open: true, message: "Pregunta guardada en banco", type: "success" });
              return response; // <-- Retornar la respuesta para que el modal la use
            } catch (err) {
              setSnackbar({ open: true, message: "Error al guardar pregunta", type: "error" });
              return err?.response; // <-- Retornar el error para manejo en el modal
            }
          }}
        />
      )}
    </>
  );
};

export default TrainerDashboard;