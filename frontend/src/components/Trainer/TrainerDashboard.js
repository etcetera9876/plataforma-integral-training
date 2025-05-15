import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import API_URL from "../../config";
import Sidebar from "../Sidebar";
import useBranches from "../../hooks/useBranches";
import CourseModal from "./CourseModal"; // Asegúrate de importar CourseModal
import "./TrainerDashboard.css";
import socket from '../../socket';
import { useNavigate, useLocation } from "react-router-dom";
import { ConfirmModal } from "./ConfirmModal"; // Importa el modal de confirmación
import CourseEditModal from "./CourseEditModal"; // Importa el nuevo modal de edición
import { getCourseStatus } from '../../utils/courseStatus'; // Importa la función centralizada
import AssessmentModal from "./AssessmentModal"; // Importa el modal de evaluación
import BlocksConfigModal from "./ComponentsConfigModal"; // Importación corregida
import AlertMessage from "./AlertMessage"; // Importa el componente AlertMessage
import QuestionBankModal from './QuestionBankModal';
import { FaLock, FaLockOpen } from "react-icons/fa";
import EvaluationResultsPage from "./EvaluationResultsPage";
import TrainerCertificates from "./TrainerCertificates";
import { useDashboard } from '../DashboardContext';

const TrainerDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { branches, loading } = useBranches();
  const { fetchCertificates } = useDashboard();
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

  // Estado para subtests de cada assessment
  const [assessmentSubtests, setAssessmentSubtests] = useState({});

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

  // Cargar subtests de todos los assessments al cargar la lista
  useEffect(() => {
    if (!assessments || assessments.length === 0) return;
    const token = getValidToken();
    assessments.forEach(assessment => {
      if (!assessment || !assessment._id) return;
      axios.get(`${API_URL}/api/assessments/${assessment._id}/subtests`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => {
        setAssessmentSubtests(prev => ({ ...prev, [assessment._id]: res.data }));
      });
    });
  }, [assessments]);

  const handleUpdate = (course, group) => {
    if (isGlobal && group) {
      window.coursesForGlobalEdit = group;
    } else if (isGlobal) {
      if (course.globalGroupId) {
        window.coursesForGlobalEdit = courses.filter(c => c.globalGroupId === course.globalGroupId);
      } else {
        window.coursesForGlobalEdit = courses.filter(c => c.name === course.name);
      }
    }
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (courseId) => {
    setCourseToDelete(courseId); // Guarda el ID del curso a eliminar
    setIsConfirmModalOpen(true); // Abre el modal de confirmación
  };

  const handleConfirmDelete = async () => {
    try {
      if (isGlobal && courseToDelete) {
        // Buscar el curso a eliminar
        const courseObj = courses.find(c => c._id === courseToDelete);
        if (courseObj) {
          // Buscar todos los cursos con el mismo globalGroupId (o por nombre si no existe)
          let groupCourses = [];
          if (courseObj.globalGroupId) {
            groupCourses = courses.filter(c => c.globalGroupId === courseObj.globalGroupId);
          } else {
            groupCourses = courses.filter(c => c.name === courseObj.name);
          }
          // Eliminar todos los cursos en paralelo
          await Promise.all(groupCourses.map(async (c) => {
            await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courses/${c._id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${user.token}`,
              },
            });
          }));
        }
      } else {
        // Modo sucursal: eliminar solo uno
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courses/${courseToDelete}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
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

  const handleToggleLock = async (courseId, isLocked, groupOverride) => {
    try {
      const group = groupOverride || (isGlobal && window.coursesForGlobalEdit && window.coursesForGlobalEdit.length > 0 ? window.coursesForGlobalEdit : null);
      if (isGlobal && group && group.length > 0) {
        let lockResults = [];
        await Promise.all(group.map(async (c) => {
          try {
            const response = await fetch(`http://localhost:5000/api/courses/${c._id}/set-lock`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isLocked: !isLocked })
            });
            let data = null;
            try { data = await response.json(); } catch {}
            lockResults.push({ id: c._id, branchId: c.branchId, ok: response.ok, status: response.status, data });
          } catch (err) {
            lockResults.push({ id: c._id, branchId: c.branchId, ok: false, error: err.message });
          }
        }));
      
        fetchCourses();
        setSnackbar({ open: true, message: !isLocked ? "Curso bloqueado en todas las sucursales" : "Curso desbloqueado en todas las sucursales", type: "success" });
      } else {
        // Modo sucursal: solo uno
        const response = await fetch(`http://localhost:5000/api/courses/${courseId}/toggle-lock`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });
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
        setSnackbar({ open: true, message: isLocked ? "Curso desbloqueado" : "Curso bloqueado", type: "success" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.message || "Hubo un error al cambiar el estado de bloqueo", type: "error" });
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

      // Soporta ambos casos: course (sucursal) o courses (global)
      if (response.data.course) {
        setCourses((prevCourses) => [response.data.course, ...prevCourses]);
      } else if (response.data.courses && Array.isArray(response.data.courses)) {
        setCourses((prevCourses) => [
          ...response.data.courses,
          ...prevCourses
        ]);
      }
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

  // Opción Global: solo para Trainer o Admin
  const showGlobalOption = user && (user.role === 'Trainer' || user.role === 'Admin');

  // Nuevo estado para modo global
  const [isGlobal, setIsGlobal] = useState(false);

  // Modifica el handler del selector de branch
  const handleBranchChange = (e) => {
    const value = e.target.value;
    if (value === 'GLOBAL') {
      setIsGlobal(true);
      setSelectedBranch('');
    } else {
      setIsGlobal(false);
      setSelectedBranch(value);
    }
  };

  // Fetch global data si está en modo global
  useEffect(() => {
    if (!isGlobal) return;
    const fetchAllCourses = async () => {
      try {
        const token = getValidToken();
        // Cambia endpoint a /all para modo global
        const response = await axios.get(`${API_URL}/api/courses/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(response.data);
      } catch (error) {
        setCourses([]);
      }
    };
    const fetchAllAssessments = async () => {
      try {
        const token = getValidToken();
        const response = await axios.get(`${API_URL}/api/assessments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssessments(response.data);
      } catch (error) {
        setAssessments([]);
      }
    };
    fetchAllCourses();
    fetchAllAssessments();
  }, [isGlobal, user]);

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

  // Escuchar evento dbChange de socket.io para recargar subtests y assessments en tiempo real
  useEffect(() => {
    if (!user) return;
    const handleDbChange = () => {
      fetchAssessments(); // Recarga la lista de tests
      // Recarga subtests de todos los tests después de actualizar assessments
      setTimeout(() => {
        if (assessments && assessments.length > 0) {
          const token = getValidToken();
          assessments.forEach(assessment => {
            if (!assessment || !assessment._id) return;
            axios.get(`${API_URL}/api/assessments/${assessment._id}/subtests`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then(res => {
              setAssessmentSubtests(prev => ({ ...prev, [assessment._id]: res.data }));
            });
          });
        }
      }, 500); // Pequeño delay para asegurar que los datos estén actualizados
      // --- CAMBIO: recargar cursos también en modo global ---
      if (isGlobal) {
        const fetchAllCourses = async () => {
          try {
            const token = getValidToken();
            const response = await axios.get(`${API_URL}/api/courses/all`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setCourses(response.data);
          } catch (error) {
            setCourses([]);
          }
        };
        fetchAllCourses();
      } else {
        fetchCourses();
      }
    };
    socket.on('dbChange', handleDbChange);
    return () => {
      socket.off('dbChange', handleDbChange);
    };
  }, [user, assessments, fetchAssessments, isGlobal, fetchCourses]);

  // Obtén la sección activa del dashboard según la ruta actual
  const getActiveSection = () => {
    if (location.pathname === '/results') return 'results';
    if (location.pathname === '/certificates') return 'certificates';
    // Por defecto, cursos
    return 'courses';
  };
  const activeSection = getActiveSection();

  const handleUpdateAssessment = (assessment) => {
    navigate(`/tests/${assessment._id}/edit`, {
      state: {
        branchId: assessment.branch,
        branchName: (branches.find(b => String(b._id) === String(assessment.branch))?.name) || '',
      },
    });
  };

  // Determina el estado global de bloqueo para un grupo de cursos
  const getGlobalLockState = (group) => {
    if (!group || group.length === 0) return null;
    const lockedCount = group.filter(c => c.isLocked).length;
    if (lockedCount === group.length) return 'locked';
    if (lockedCount === 0) return 'unlocked';
    return 'partial'; // Estado mixto
  };

  // Estado para el modal de confirmación de bloqueo global
  const [showGlobalLockModal, setShowGlobalLockModal] = useState(false);
  const [pendingLockAction, setPendingLockAction] = useState(null); // 'lock' o 'unlock'
  const [pendingLockGroup, setPendingLockGroup] = useState(null); // grupo de cursos globales

  return (
    <>
      <div className={`dashboard-container${isAnyModalOpen ? ' blurred' : ''}`}>
        <Sidebar 
          onLogout={handleLogout} 
          userName={user.name} 
          userId={user.id}
        />
        <main className="main-content">
          <h1 className="title" style={{ marginBottom: 32 }}>Trainer Dashboard</h1>
          <p className="subtitle">Welcome! Here you can create courses and assessments. You can also review assessments completed by recruiters and managers, as well as signed training receipts. All of this management is done by branch.</p>

          {/* Selector de branch global, siempre visible */}
          <section className="branch-selector" style={{marginBottom: 32}}>
            <label htmlFor="branch-select">Select the branch:</label>
            {loading ? (
              <p>Loading branches...</p>
            ) : branches.length > 0 ? (
              <select id="branch-select" value={isGlobal ? 'GLOBAL' : (selectedBranch ? String(selectedBranch) : "")} onChange={handleBranchChange}>
                <option value="">-- Selecciona una sucursal --</option>
                {showGlobalOption && <option value="GLOBAL">🌐 Global (todas las sucursales)</option>}
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

          {/* Contenido según sección activa */}
          {activeSection === 'courses' && (
            (isGlobal || selectedBranch) && (
              <>
                {/* Sección de cursos */}
                <section className="courses-section">
                  <div className="section-header">
                    <h2 className="section-title">{isGlobal ? 'Todos los cursos' : currentBranchName + ' Courses'}</h2>
                    <button
                      className="add-button"
                      onClick={() => setShowCourseModal(true)}
                      title="Agregar curso"
                      style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', boxShadow: '0 2px 8px #e0e0e0', fontSize: 28 }}
                    >
                      <span role="img" aria-label="Crear curso" style={{ fontSize: 26 }}>➕</span>
                    </button>
                  </div>

                  {isGlobal ? (
                    <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #ddd', padding: 0, marginTop: 8 }}>
                      <div style={{ display: 'flex', fontWeight: 600, padding: '16px 32px 8px 32px', color: '#222', fontSize: 16, alignItems: 'center', minHeight: 40 }}>
                        <div style={{ flex: 2, textAlign: 'left' }}>Sucursales</div>
                        <div style={{ flex: 3, textAlign: 'left' }}>Nombre</div>
                        <div style={{ flex: 1, textAlign: 'left' }}>Estado</div>
                        <div style={{ flex: 1, textAlign: 'center' }}>Acciones</div>
                      </div>
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {(() => {
                          // Agrupar cursos por globalGroupId si existe, si no por nombre
                          const grouped = {};
                          courses.forEach(course => {
                            const groupKey = course.globalGroupId || `name:${course.name}`;
                            if (!grouped[groupKey]) grouped[groupKey] = [];
                            grouped[groupKey].push(course);
                          });
                          const groupedCourses = Object.values(grouped);
                          if (groupedCourses.length === 0) {
                            return (
                              <li className="empty-message" style={{ padding: '18px 32px' }}>No hay cursos registrados en ninguna sucursal.</li>
                            );
                          }
                          return groupedCourses.map((group, idx) => {
                            // Obtener nombres de sucursales de forma robusta
                            const branchNames = group.map(c => {
                              const branch = branches.find(b => String(b._id) === String(c.branchId));
                              if (!branch) {
                                console.warn('[WARN][TrainerDashboard] No se encontró branch para branchId:', c.branchId, 'en curso:', c);
                              }
                              return branch ? branch.name : `Sucursal desconocida (${c.branchId || 'sin ID'})`;
                            });
                            // Mostrar estado del primer curso del grupo (puedes ajustar lógica si quieres un estado combinado)
                            const firstCourse = group[0];
                            const status = getCourseStatus(firstCourse.publicationDate, firstCourse.expirationDate, firstCourse.createdAt, now);
                            const isNew = !firstCourse.description && (!firstCourse.resources || firstCourse.resources.length === 0);
                            const lockState = getGlobalLockState(group);
                            return (
                              <li key={firstCourse.globalGroupId || firstCourse.name} style={{ display: 'flex', alignItems: 'center', padding: '18px 32px', minHeight: 48, borderBottom: idx === groupedCourses.length - 1 ? 'none' : '1px solid #eee', background: '#fff', borderRadius: idx === 0 ? '12px 12px 0 0' : idx === groupedCourses.length - 1 ? '0 0 12px 12px' : '0' }}>
                                <div style={{ flex: 2, color: '#1976d2', fontWeight: 500, fontSize: 15 }}>
                                  {branchNames.join(', ')}
                                </div>
                                <div style={{ flex: 3, color: '#222', fontWeight: 500, fontSize: 15, textAlign: 'left' }}>
                                  <span className="course-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    <span role="img" aria-label="libro">📘</span> {firstCourse.name}
                                  </span>
                                  {isNew && (
                                    <div className="incomplete-course-row">
                                      <span className="incomplete-course-text">
                                        Curso incompleto: agrega descripción o recursos.
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ flex: 1, color: '#1a237e', fontWeight: 500, fontSize: 15 }} title={status.tooltip}>{status.text}</div>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                  <div className="course-actions" style={{ justifyContent: 'center' }}>
                                    <button
                                      className="update-button"
                                      onClick={() => handleUpdate(firstCourse, group)}
                                      title={isNew ? "Agregar información al curso" : "Actualizar curso"}
                                      style={{ marginRight: 8 }}
                                    >
                                      {isNew ? "New" : "Update"}
                                    </button>
                                    <button
                                      className="delete-button"
                                      onClick={() => handleDeleteClick(firstCourse._id)}
                                      title="Eliminar curso"
                                      style={{ marginRight: 8 }}
                                    >
                                      Delete
                                    </button>
                                    <button
                                      className={`lock-button ${lockState === 'locked' ? 'locked' : lockState === 'unlocked' ? 'unlocked' : 'partial'}`}
                                      onClick={() => {
                                        if (lockState === 'partial') {
                                          setShowGlobalLockModal(true);
                                          setPendingLockGroup(group);
                                        } else {
                                          handleToggleLock(firstCourse._id, lockState === 'locked' || lockState === 'partial', group);
                                        }
                                      }}
                                      title={lockState === 'locked' ? "Desbloquear todos los cursos" : lockState === 'unlocked' ? "Bloquear todos los cursos" : "Sincronizar estado de bloqueo"}
                                      style={{
                                        marginRight: 8,
                                        background: lockState === 'locked' ? '#e65100' : lockState === 'unlocked' ? '#e3f2fd' : '#ffe082',
                                        color: lockState === 'locked' ? '#fff' : lockState === 'unlocked' ? '#1976d2' : '#333',
                                        border: '2px solid #bdbdbd',
                                        borderRadius: 5,
                                        minWidth: 44,
                                        minHeight: 38,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 20,
                                        fontWeight: 600,
                                        boxShadow: '0 2px 6px #bbb',
                                        transition: 'background 0.18s, color 0.18s'
                                      }}
                                    >
                                      {lockState === 'locked' ? (
                                        <span role="img" aria-label="Candado cerrado" style={{ fontSize: 20, color: '#fff', verticalAlign: 'middle' }}>🔒</span>
                                      ) : lockState === 'unlocked' ? (
                                        <span role="img" aria-label="Candado abierto" style={{ fontSize: 20, color: '#1976d2', verticalAlign: 'middle' }}>🔓</span>
                                      ) : (
                                        <span role="img" aria-label="Candado parcial" style={{ fontSize: 20, color: '#ff9800', verticalAlign: 'middle' }}>🟡</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          });
                        })()}
                      </ul>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', fontWeight: 600, padding: '10px 24px 10px 24px', borderBottom: '1px solid #eee', color: '#333', fontSize: 15, alignItems: 'center', minHeight: 40 }}>
                        <div style={{ flex: 2, textAlign: 'left' }}>Nombre</div>
                        <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>Estado</div>
                        <div style={{ flex: 1, textAlign: 'center' }}>Acciones</div>
                      </div>
                      <ul className="course-list" style={{ padding: 0, margin: 0 }}>
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
                                style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', minHeight: 48, borderBottom: '1px solid #f3f3f3', background: '#fff' }}
                              >
                                <div style={{ flex: 2, textAlign: 'left' }}>
                                  <span className="course-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    <span role="img" aria-label="libro">📘</span> {course.name}
                                  </span>
                                  {isNew && (
                                    <div className="incomplete-course-row">
                                      <span className="incomplete-course-text">
                                        Curso incompleto: agrega descripción o recursos.
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', fontWeight: 500 }} title={status.tooltip}>
                                  {status.text}
                                </div>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                  <div className="course-actions" style={{ justifyContent: 'center' }}>
                                    <button
                                      className="update-button"
                                      onClick={() => handleUpdate(course)}
                                      title={isNew ? "Agregar información al curso" : "Actualizar curso"}
                                      style={{ marginRight: 8 }}
                                    >
                                      {isNew ? "New" : "Update"}
                                    </button>
                                    <button
                                      className="delete-button"
                                      onClick={() => handleDeleteClick(course._id)}
                                      title="Eliminar curso"
                                      style={{ marginRight: 8 }}
                                    >
                                      Delete
                                    </button>
                                    <button
                                      className={`lock-button ${course.isLocked ? "locked" : "unlocked"}`}
                                      onClick={() => handleToggleLock(course._id, course.isLocked)}
                                      title={course.isLocked ? "Desbloquear curso" : "Bloquear curso"}
                                      style={{
                                        marginRight: 8,
                                        background: course.isLocked ? '#e65100' : '#e3f2fd',
                                        color: course.isLocked ? '#fff' : '#1976d2',
                                        border: '2px solid #bdbdbd',
                                        borderRadius: 5,
                                        minWidth: 44,
                                        minHeight: 38,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 20,
                                        fontWeight: 600,
                                        boxShadow: '0 2px 6px #bbb',
                                        transition: 'background 0.18s, color 0.18s'
                                      }}
                                    >
                                      {course.isLocked ? (
                                        <span role="img" aria-label="Candado cerrado" style={{ fontSize: 20, color: '#fff', verticalAlign: 'middle' }}>🔒</span>
                                      ) : (
                                        <span role="img" aria-label="Candado abierto" style={{ fontSize: 20, color: '#1976d2', verticalAlign: 'middle' }}>🔓</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })
                        ) : (
                          <li className="empty-message">No hay cursos registrados en esta sucursal.</li>
                        )}
                      </ul>
                    </>
                  )}
                </section>

                {/* Sección de evaluaciones */}
                <section className="assessments-section" style={{ marginTop: 32 }}>
                  <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h2 className="section-title" style={{ marginBottom: 0 }}>{isGlobal ? 'Todas las evaluaciones' : currentBranchName + ' Evaluaciones'}</h2>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        className="icon-button"
                        title="Crear evaluación"
                        onClick={() => setShowAssessmentModal(true)}
                        style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', boxShadow: '0 2px 8px #e0e0e0', fontSize: 28 }}
                      >
                        <span role="img" aria-label="Crear evaluación" style={{ fontSize: 26 }}>➕</span>
                      </button>
                      <button
                        className="icon-button"
                        title="Crear pregunta en banco"
                        onClick={() => setShowQuestionBankModal(true)}
                        style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', boxShadow: '0 2px 8px #e0e0e0' }}
                      >
                        <img src={require('../../assets/bank-icon.png')} alt="Banco de preguntas" style={{ width: 26, height: 26, display: 'block' }} />
                      </button>
                      <button
                        className="icon-button"
                        title="Crear bloque"
                        onClick={() => setShowComponentsConfigModal(true)}
                        style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', boxShadow: '0 2px 8px #e0e0e0', fontSize: 28 }}
                      >
                        <span role="img" aria-label="Bloques" style={{ fontSize: 26 }}>🧩</span>
                      </button>
                    </div>
                  </div>
                  {isGlobal ? (
                    <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #ddd', padding: 0, marginTop: 8 }}>
                      <div style={{ display: 'flex', fontWeight: 600, padding: '16px 32px 8px 32px', color: '#222', fontSize: 16, alignItems: 'center', minHeight: 40 }}>
                        <div style={{ flex: 2, textAlign: 'left' }}>Sucursal</div>
                        <div style={{ flex: 3, textAlign: 'left' }}>Nombre</div>
                        <div style={{ flex: 1, textAlign: 'left' }}>Progreso</div>
                      </div>
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {assessments.length > 0 ? (
                          assessments.filter(a => a && a.name).map((assessment, index) => {
                            const subtests = assessmentSubtests[assessment._id] || [];
                            const totalAssigned = Array.isArray(assessment.assignedTo) ? assessment.assignedTo.length : 0;
                            const respondedCount = subtests.filter(st => st.submittedAt || (st.submittedAnswers && Object.keys(st.submittedAnswers).length > 0)).length;
                            // Buscar nombre del branch de forma robusta
                            let branchName = '';
                            let branchError = false;
                            let branchObj = null;
                            if (assessment.branch) {
                              branchObj = branches.find(b => String(b._id) === String(assessment.branch))
                                || branches.find(b => b.name === assessment.branch);
                            }
                            if (branchObj && branchObj.name) {
                              branchName = branchObj.name;
                            } else if (assessment.branch) {
                              branchName = `ID no encontrado: ${assessment.branch}`;
                              branchError = true;
                            } else {
                              branchName = 'Sucursal no asignada';
                              branchError = true;
                            }
                            return (
                              <li key={assessment._id || index} style={{ display: 'flex', alignItems: 'center', padding: '18px 32px', minHeight: 48, borderBottom: index === assessments.length - 1 ? 'none' : '1px solid #eee', background: '#fff', borderRadius: index === 0 ? '12px 12px 0 0' : index === assessments.length - 1 ? '0 0 12px 12px' : '0' }}>
                                <div style={{ flex: 2, color: branchError ? '#d32f2f' : '#1976d2', fontWeight: 500, fontSize: 15 }}>
                                  {branchName}
                                  {branchError && (
                                    <span style={{ color: '#d32f2f', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>(Error: ID de sucursal no válido o no existe)</span>
                                  )}
                                </div>
                                <div style={{ flex: 3, color: '#222', fontWeight: 500, fontSize: 15, textAlign: 'left' }}>
                                  <span className="course-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    <span role="img" aria-label="document">📝</span> {assessment.name}
                                  </span>
                                </div>
                                <div style={{ flex: 1, color: '#1a237e', fontWeight: 500, fontSize: 15, textAlign: 'left' }}>{respondedCount}/{totalAssigned}</div>
                              </li>
                            );
                          })
                        ) : (
                          <li className="empty-message" style={{ padding: '18px 32px' }}>No hay evaluaciones registradas en ninguna sucursal.</li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', fontWeight: 600, padding: '10px 24px 10px 24px', borderBottom: '1px solid #eee', color: '#333', fontSize: 15, alignItems: 'center', minHeight: 40 }}>
                        <div style={{ flex: 2, textAlign: 'left' }}>Nombre</div>
                        <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>Progreso</div>
                        <div style={{ flex: 1, textAlign: 'center' }}>Acciones</div>
                      </div>
                      <ul className="course-list" style={{ padding: 0, margin: 0 }}>
                        {assessments.length > 0 ? (
                          assessments.filter(a => a && a.name).map((assessment, index) => {
                            const isNewAssessment = !assessment.filters;
                            const subtests = assessmentSubtests[assessment._id] || [];
                            const totalAssigned = Array.isArray(assessment.assignedTo) ? assessment.assignedTo.length : 0;
                            const respondedSubtest = subtests.find(st => st.submittedAt || (st.submittedAnswers && Object.keys(st.submittedAnswers).length > 0));
                            const respondedCount = subtests.filter(st => st.submittedAt || (st.submittedAnswers && Object.keys(st.submittedAnswers).length > 0)).length;
                            // Nuevo: Si hay algún subtest resuelto, bloquear Update
                            const updateDisabled = Boolean(respondedSubtest);
                            // Obtener nombre del usuario que ya resolvió (si existe)
                            let resolvedUserName = '';
                            if (respondedSubtest && respondedSubtest.userId) {
                              const userId = typeof respondedSubtest.userId === 'object' ? respondedSubtest.userId._id : respondedSubtest.userId;
                              resolvedUserName = userNames[userId] || userId;
                            }
                            return (
                              <li
                                key={assessment._id || index}
                                className={`course-item${isNewAssessment ? " new-course-alert" : ""}`}
                                style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', minHeight: 48, borderBottom: '1px solid #f3f3f3', background: '#fff' }}
                              >
                                <div style={{ flex: 2, textAlign: 'left' }}>
                                  <span className="course-name">📝 {assessment.name}</span>
                                  {isNewAssessment && (
                                    <div className="incomplete-course-row">
                                      <span className="incomplete-course-text">
                                        Evaluación incompleta: configura los filtros y genera tests personalizados.
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', fontWeight: 500 }}>
                                  {respondedCount}/{totalAssigned}
                                </div>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                  <div className="course-actions" style={{ justifyContent: 'center' }}>
                                    <button
                                      className="update-button"
                                      onClick={e => {
                                        if (updateDisabled) {
                                          e.preventDefault();
                                          // Mostrar nombre si existe, si no, 'Un usuario'
                                          const userIdKey = respondedSubtest && respondedSubtest.userId ? (typeof respondedSubtest.userId === 'object' ? respondedSubtest.userId._id : respondedSubtest.userId) : undefined;
                                       
                                          const name = (userIdKey && userNames[userIdKey]) || 'Un usuario';
                                          setSnackbar({ open: true, message: `${name} ya ha realizado el examen, lo puedes revisar.`, type: 'info', duration: 4000 });
                                        } else {
                                          handleUpdateAssessment(assessment);
                                        }
                                      }}
                                      title={isNewAssessment ? "Agregar información a la evaluación" : updateDisabled ? "Ya hay respuestas, no se puede editar" : "Actualizar evaluación"}
                                      style={{ marginRight: 8, opacity: updateDisabled ? 0.5 : 1, cursor: updateDisabled ? 'not-allowed' : 'pointer', pointerEvents: 'auto' }}
                                    >
                                      {isNewAssessment ? "New" : "Update"}
                                    </button>
                                    <button
                                      className="delete-button"
                                      onClick={() => setAssessmentToDelete(assessment._id) || setIsAssessmentConfirmModalOpen(true)}
                                      title="Eliminar evaluación"
                                      style={{ marginRight: 8 }}
                                    >
                                      Delete
                                    </button>
                                    <button
                                      className={`lock-button ${assessment.isLocked ? "locked" : "unlocked"}`}
                                      onClick={async () => {
                                        try {
                                          const token = getValidToken();
                                          await axios.patch(`${API_URL}/api/assessments/${assessment._id}/toggle-lock`, {}, {
                                            headers: { Authorization: `Bearer ${token}` },
                                          });
                                          fetchAssessments();
                                        } catch (err) {
                                          setSnackbar({ open: true, message: 'Error al bloquear/desbloquear la evaluación', type: 'error' });
                                        }
                                      }}
                                      title={assessment.isLocked ? "Desbloquear evaluación" : "Bloquear evaluación"}
                                      style={{
                                        marginRight: 8,
                                        background: assessment.isLocked ? '#e65100' : '#e3f2fd', // más oscuro cuando está lock, suave cuando unlock
                                        color: assessment.isLocked ? '#fff' : '#1976d2',
                                        border: '2px solid #bdbdbd',
                                        borderRadius: 5,
                                        minWidth: 44,
                                        minHeight: 38,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 20,
                                        fontWeight: 600,
                                        boxShadow: '0 2px 6px #bbb',
                                        transition: 'background 0.18s, color 0.18s'
                                      }}
                                    >
                                      {assessment.isLocked ? (
                                        <span role="img" aria-label="Candado cerrado" style={{ fontSize: 20, color: '#fff', verticalAlign: 'middle' }}>🔒</span>
                                      ) : (
                                        <span role="img" aria-label="Candado abierto" style={{ fontSize: 20, color: '#1976d2', verticalAlign: 'middle' }}>🔓</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })
                        ) : (
                          <li className="empty-message">No hay evaluaciones registradas en esta sucursal.</li>
                        )}
                      </ul>
                    </>
                  )}
                </section>
              </>
            )
          )}
          {activeSection === 'results' && (
            <div className="dashboard-section-container">
              <EvaluationResultsPage user={user} branchId={selectedBranch} />
            </div>
          )}
          {activeSection === 'certificates' && (
            <div className="dashboard-section-container">
              <TrainerCertificates setUser={setUser} user={user} branchId={selectedBranch} />
            </div>
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
              // Soporta ambos casos: course (sucursal) o courses (global)
              if (response.data.course) {
                setCourses((prevCourses) => [response.data.course, ...prevCourses]);
              } else if (response.data.courses && Array.isArray(response.data.courses)) {
                setCourses((prevCourses) => [
                  ...response.data.courses,
                  ...prevCourses
                ]);
              }
              setSnackbar({ open: true, message: "Curso creado con éxito", type: "success" });
            } catch (error) {
              setSnackbar({ open: true, message: "Error al crear el curso", type: "error" });
            }
          }}
          branchId={selectedBranch}
          isGlobal={isGlobal} // <-- PASA LA PROP PARA MODO GLOBAL
        />
      )}

      {isModalOpen && (
        <CourseEditModal
          course={selectedCourse}
          branchName={currentBranchName}
          onClose={() => setIsModalOpen(false)}
          onSave={async () => {
            await fetchCourses();
            if (activeSection === 'certificates') {
              await fetchCertificates(selectedBranch, user.token);
            }
            setSnackbar({ open: true, message: "Curso actualizado con éxito", type: "success" });
          }}
          userNames={userNames}
          globalGroup={window.coursesForGlobalEdit || []}
          isGlobal={isGlobal}
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
        duration={snackbar.duration || 4000}
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

      {/* Modal de confirmación para bloqueo global parcial */}
      {showGlobalLockModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ minWidth: 340, maxWidth: 420, padding: 32, borderRadius: 12, background: '#fff', boxShadow: '0 4px 24px #2224', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>Confirmación</h3>
            <p>El estado de bloqueo es mixto.<br />¿Qué acción deseas realizar?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 24 }}>
              <button className="confirm-button" style={{ background: '#e65100', color: '#fff', minWidth: 120 }} onClick={() => {
                handleToggleLock(pendingLockGroup[0]._id, false, pendingLockGroup);
                setShowGlobalLockModal(false);
                setPendingLockAction(null);
                setPendingLockGroup(null);
              }}>Bloquear todos</button>
              <button className="confirm-button" style={{ background: '#1976d2', color: '#fff', minWidth: 120 }} onClick={() => {
                handleToggleLock(pendingLockGroup[0]._id, true, pendingLockGroup);
                setShowGlobalLockModal(false);
                setPendingLockAction(null);
                setPendingLockGroup(null);
              }}>Desbloquear todos</button>
              <button className="cancel-button" style={{ minWidth: 100 }} onClick={() => {
                setShowGlobalLockModal(false);
                setPendingLockAction(null);
                setPendingLockGroup(null);
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrainerDashboard;