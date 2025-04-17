import React, { useState, useEffect } from "react";
import axios from "axios";
import "./TrainerDashboard.css";

// Utilidad para convertir UTC a local para datetime-local
function toLocalDatetimeString(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISO = new Date(date - tzOffset).toISOString().slice(0, 16);
  return localISO;
}

const CourseModal = ({
  branchName = "",
  onClose,
  onSubmit,
  branchId,
  course = null, // Nuevo: curso existente para editar
}) => {
  const [courseName, setCourseName] = useState(course?.name || ""); // Nuevo: carga el nombre del curso si existe
  const [assignedMode, setAssignedMode] = useState(
    course?.assignedTo ? (course.assignedTo === "All recruiters" ? "all" : "select") : "all"); // Nuevo: carga el modo de asignación
  const [branchUsers, setBranchUsers] = useState([]); // Lista de usuarios del branch
  const [selectedUsers, setSelectedUsers] = useState(
    Array.isArray(course?.assignedTo) ? course.assignedTo : []); // Nuevo: usuarios seleccionados si el curso ya tiene asignados
  const [expirationDate, setExpirationDate] = useState(
    course?.expirationDate ? toLocalDatetimeString(course.expirationDate) : ""); // Nuevo: carga la fecha de expiración si existe
  
  const [isSchedule, setIsSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(
    course?.publicationDate ? toLocalDatetimeString(course.publicationDate) : ""); // Nuevo: carga la fecha de publicación si existe

  

  // Cerrar al hacer clic en ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);



  // Cerrar si clic en overlay
  const handleOverlayClick = () => {
    onClose();
  };
  // Evitar cerrar si clic dentro del modal
  const stopPropagation = (e) => {
    e.stopPropagation();
  };



  useEffect(() => {
    if (assignedMode === "select" && branchName) { // Usa branchName como parámetro
      console.log("Solicitando usuarios del branchName:", branchName); // Log para depuración
      axios
        .get(`/api/users/branch/${branchName}/users`)
        .then((response) => {
          console.log("Usuarios obtenidos:", response.data); // Log para verificar los datos recibidos
          setBranchUsers(response.data); // Actualiza la lista de usuarios
        })
        .catch((error) => {
          console.error("Error al obtener usuarios del branch:", error);
        });
    }
  }, [assignedMode, branchName]);


  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "courseName") setCourseName(value);
    if (name === "scheduledDate") setScheduledDate(value);
    if (name === "expirationDate") setExpirationDate(value);
  };

    // Manejar selección de usuarios
  const handleCheckboxChange = (userId) => {
      setSelectedUsers((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId) // Quitar usuario
          : [...prev, userId] // Agregar usuario
      );
    };


  //para el boton de publicar ahora
  const handlePublishNow = () => {
    if (!courseName.trim()) {
      alert("Por favor, ingresa un nombre de curso.");
      return;
    }

    // Validar si no se seleccionaron reclutadores en modo "select"
    if (assignedMode === "select" && selectedUsers.length === 0) {
      alert("Por favor, selecciona al menos un reclutador.");
      return;
    }

    const assignedTo = assignedMode === "all" ? ["All recruiters"] : selectedUsers;

    onSubmit({
      name: courseName,
      assignedTo,
      branchId,
      publicationDate: null, // No se asigna fecha de publicación
      expirationDate: null, // Sin fecha de expiración
    });

    onClose(); // Cierra el modal
  };

  //para el boton de programar
  const handleSchedule = () => {
    if (!courseName.trim() || !scheduledDate) {
      alert("Por favor, ingresa un nombre de curso y selecciona una fecha de publicación.");
      return;
    }

    // Validar si no se seleccionaron reclutadores en modo "select"
    if (assignedMode === "select" && selectedUsers.length === 0) {
      alert("Por favor, selecciona al menos un reclutador.");
      return;
    }

    const assignedTo = assignedMode === "all" ? ["All recruiters"] : selectedUsers;

    onSubmit({
      name: courseName,
      assignedTo,
      branchId,
      publicationDate: scheduledDate ? new Date(scheduledDate).toISOString() : null, // Solo convertir a ISO
      expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null, // Solo convertir a ISO
    });

    onClose(); // Cierra el modal
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={stopPropagation}>
        <h3>Add course for {branchName}:</h3>


        <section className="checklist-section">  
        <div>
  <label className="radio-row">
    <span className="radio-label">All recruiters</span>
    <input
      type="radio"
     
      name="assignedMode"
      value="all"
      checked={assignedMode === "all"}
      onChange={() => setAssignedMode("all")}
    />
  </label>
  <label className="radio-row">
    <span className="radio-label">Select recruiters</span>
    <input
      type="radio"
      name="assignedMode"
      value="select"
      checked={assignedMode === "select"}
      onChange={() => setAssignedMode("select")}
    />
  </label>
</div>
</section>


        <section className="checklist-section">
  <div className="check-list">
    {assignedMode === "select" && (
      <div className="modal-field">
        <ul>
          {branchUsers.map((user) => (
            <li key={user._id} className="course-item recruiter-row">
              <span className="recruiter-name">{user.name}</span>
              <input
                type="checkbox"
                value={user._id}
                checked={selectedUsers.includes(user._id)}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setSelectedUsers((prev) =>
                    isChecked
                      ? [...prev, user._id] // Agregar usuario seleccionado
                      : prev.filter((id) => id !== user._id) // Quitar usuario deseleccionado
                  );
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
</section>

        <div className="modal-field">
          <label>Course name:</label>
          <input
            type="text"
            placeholder="Enter course name"
            required
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          {!isSchedule && (
            <button  className="schedule-buttons" onClick={handlePublishNow}>
              Publish now
            </button>
          )}
          <button className="schedule-buttons"
            onClick={() => setIsSchedule(!isSchedule)}
            disabled={isSchedule}
          >
            Schedule publication
          </button>
        </div>

        <div className="modal-actions">
        {isSchedule && (
          <div className="schedule-field">
            <label>Select date/time:</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />

              <div className="schedule-field1">
                    <label>Expiration date:</label>
                    <input
                      type="datetime-local"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>
            
            
            <div >
            <button className="confirm-button" onClick={handleSchedule}>Confirm schedule</button>
            </div>

          </div>
        )}

          </div>
        
      </div>
    </div>
  );
};

export default CourseModal;
