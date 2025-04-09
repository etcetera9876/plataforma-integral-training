import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_URL from "../../config";
import Sidebar from "../Sidebar";
import useBranches from "../../hooks/useBranches";
import CourseModal from "./CourseModal"; // Asegúrate de importar CourseModal
import "./TrainerDashboard.css";

const TrainerDashboard = ({ setUser, user }) => {
  const { branches, loading } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [courses, setCourses] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [showCourseModal, setShowCourseModal] = useState(false); // Estado para manejar el modal

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
      setCourses(sortedCourses);
      console.log("Cursos obtenidos:", sortedCourses);
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
      // Filtra cualquier valor que no sea un ObjectId válido (como "All recruiters")
      const validUserIds = userIds.filter((id) => id !== "All recruiters");
  
      if (validUserIds.length === 0) return; // Si no hay IDs válidos, no hagas la solicitud
  
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
      const token = user.token; // Asegúrate de tener el token
      const response = await axios.post(
        `${API_URL}/api/courses`, // Asegúrate de que esta ruta sea correcta en tu backend
        {
          ...courseData,
          createdBy: {
            id: user.id, // ID del usuario que está creando el curso
            name: user.name, // Nombre del usuario que está creando el curso
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` }, // Incluye el token en la solicitud
        }
      );
      // Actualiza la lista de cursos con el nuevo curso
      setCourses((prevCourses) => [response.data, ...prevCourses]);
      console.log("Curso agregado exitosamente:", response.data);
    } catch (error) {
      console.error("Error al agregar el curso:", error.response?.data || error.message);
    }
  };


  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    const ids = courses
      .filter((course) => course.assignedTo !== "All recruiters")
      .flatMap((course) => course.assignedTo);

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
      <Sidebar onLogout={() => setUser(null)} userName={user.name} userId={user.id} />
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
                  onClick={() => setShowCourseModal(true)} // Abrir el modal
                  title="Agregar curso"
                >
                  ＋
                </button>
              </div>


              <ul className="course-list">
  {courses.length > 0 ? (
    courses.map((course, index) => {
      const { text: statusText, icon: statusIcon } = getCourseStatus(course.publicationDate);

      return (
        <li key={course._id || index} className="course-item">
          <span className="course-name">📘 {course.name}</span>
          <div className="course-details">
            <span className="course-detail">
              Created Date: {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : "Fecha inválida"}
            </span>
            <span className="course-detail">
              Assign to:{" "}
              {course.assignedTo.includes("All recruiters")
                ? "All recruiters" // Mostrar directamente "All recruiters" si es el caso
                : course.assignedTo
                    .map((id) => userNames[id] || "Loading...") // Mostrar los nombres de usuarios o "Loading..."
                    .join(", ")}
            </span>
            <span className="course-detail">
              Creado por: {course.createdBy?.name || "Desconocido"}{" "}
              <span title={statusText}>{statusIcon}</span>
            </span>
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

      {showCourseModal && (
        <CourseModal
          branchName={currentBranchName}
          onClose={() => setShowCourseModal(false)} // Cerrar el modal
          onSubmit={handleAddCourse} // Manejar el nuevo curso
          branchId={selectedBranch}
        />
      )}
    </div>
  );
};

export default TrainerDashboard;