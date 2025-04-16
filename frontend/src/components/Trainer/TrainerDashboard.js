import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_URL from "../../config";
import Sidebar from "../Sidebar";
import useBranches from "../../hooks/useBranches";
import CourseModal from "./CourseModal"; // Asegúrate de importar CourseModal
import "./TrainerDashboard.css";
import io from "socket.io-client"; // Importación de Socket.IO
import { useNavigate } from "react-router-dom";
import { ConfirmModal, SuccessModal } from "./ConfirmModal"; // Importa el modal de confirmación
import CourseEditModal from "./CourseEditModal"; // Importa el nuevo modal de edición


// Configuración de Socket.IO
const socket = io(API_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const TrainerDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const { branches, loading } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [courses, setCourses] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [showCourseModal, setShowCourseModal] = useState(false); // Estado para manejar el modal
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  

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
      const response = await fetch(`http://localhost:3000/api/courses/${courseToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`, // Asegúrate de enviar el token si es necesario
        },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar el curso");
      }
  
      setSuccessMessage("Curso eliminado correctamente");
      setIsSuccessModalOpen(true); // Abre el modal de éxito
      fetchCourses(); // Actualizar la lista de cursos
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


  const handleSubmitUpdate = async (updatedCourse) => {
    try {
      const response = await fetch(`/api/courses/${selectedCourse._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCourse),
      });
      const data = await response.json();
      alert("Curso actualizado correctamente");
      setShowCourseModal(false);
      fetchCourses(); // Actualizar la lista de cursos
    } catch (error) {
      console.error("Error al actualizar el curso:", error);
      alert("Hubo un error al actualizar el curso");
    }
  };


  useEffect(() => {
    if (!user) {
      navigate("/"); // Redirige al login si el usuario no está definido
    }
  }, [user, navigate]);


  const fetchCourses = useCallback(async () => {
    if (!selectedBranch) return;
    try {
      const token = user.token;
      const response = await axios.get(`${API_URL}/api/courses/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedCourses = response.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      console.log("Cursos obtenidos desde el backend:", sortedCourses); // Log para depuración
      setCourses(sortedCourses);
    } catch (error) {
      console.error("Error al obtener cursos:", error.response?.data || error.message);
    }
  }, [selectedBranch, user.token]);



  const getCourseStatus = (publicationDate) => {
    if (!publicationDate) {
      return { text: "Publicado ahora", icon: "✅" }; // Publicado ahora
    }

    const now = new Date();
    const publication = new Date(publicationDate);

    if (publication > now) {
      return { text: "Programado", icon: "🕒" }; // Programado
    }

    return { text: "Publicado ahora", icon: "✅" }; // Publicado ahora
  };



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
      console.log("Nuevo curso creado:", newCourse); // Log para depuración

      // Actualizar el estado con el nuevo curso
      setCourses((prevCourses) => [newCourse, ...prevCourses]);
    } catch (error) {
      console.error("Error al agregar el curso:", error.response?.data || error.message);
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
    const ids = courses
      .flatMap((course) => course.assignedTo) // Obtener todos los IDs de assignedTo
      .filter((id) => id && id !== "All recruiters"); // Filtrar IDs válidos

    if (ids.length > 0) {
      fetchUserNames(ids);
    }
  }, [courses, fetchUserNames]);

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
  };


  const currentBranchName = branches.find((b) => b._id === selectedBranch)?.name || "";

  return (
    <div className="dashboard-container">
      <Sidebar onLogout={handleLogout} userName={user.name} userId={user.id} />
      <main className="main-content">
        <h1 className="title">Trainer Dashboard</h1>
        <p className="subtitle">Bienvenido, aquí puedes gestionar cursos y evaluaciones por sucursal.</p>

        <section className="branch-selector">
          <label htmlFor="branch-select">Select the branch:</label>
          {loading ? (
            <p>Loading branches...</p>
          ) : (
            <select id="branch-select" value={selectedBranch} onChange={handleBranchChange}>
              <option value="">-- Selecciona una sucursal --</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </section>

        {selectedBranch && (
          <>
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
                    const isNew = !course.description && (!course.resources || course.resources.length === 0);
                    return (
                      <li
                        key={course._id || index}
                        className={`course-item${isNew ? " new-course-alert" : ""}`}
                        style={isNew ? {
                          boxShadow: '0 0 0 4px rgba(255,0,0,0.15)',
                          borderRadius: '12px',
                          transition: 'box-shadow 0.3s',
                        } : {}}
                      >
                        <span className="course-name">📘 {course.name}</span>
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
                      </li>
                    );
                  })
                ) : (
                  <li className="empty-message">No hay cursos registrados en esta sucursal.</li>
                )}
              </ul>
            </section>
          </>
        )}
      </main>

      {/* Modal de éxito */}
      {isSuccessModalOpen && (
        <SuccessModal
          message={successMessage}
          onClose={() => setIsSuccessModalOpen(false)}
        />
      )}

       {/* Modal de confirmación */}
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
          onSubmit={handleAddCourse}
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
      
    </div>
  );
};

export default TrainerDashboard;