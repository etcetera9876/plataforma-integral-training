import React, { useState, useEffect } from "react";
import axios from "axios";
import "./TrainerDashboard.css";

const CourseModal = ({
  branchName = "",
  onClose,
  onSubmit,
  branchId,
}) => {
  const [courseName, setCourseName] = useState("");
  const [assignedMode, setAssignedMode] = useState("all");
  const [branchUsers, setBranchUsers] = useState([]); // Lista de usuarios del branch
  const [selectedUsers, setSelectedUsers] = useState([]); // Usuarios seleccionados
  
  const [isSchedule, setIsSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

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

  const handlePublishNow = () => {
    if (!courseName.trim()) return; // Asegúrate de que haya un nombre
    const assignedTo = assignedMode === "all" ? "All recruiters" : selectedUsers; // Determina a quién se asigna
    console.log("Enviando datos para publicar ahora:", {
      name: courseName,
      assignedTo,
      branchId,
      publicationDate: null,
    }); // Agrega un log para depuración
    onSubmit({
      name: courseName,
      assignedTo,
      branchId,
      publicationDate: null, // Publicado ahora
    });
    onClose(); // Cierra el modal
  };
  
  const handleSchedule = () => {
    if (!courseName.trim() || !scheduledDate) {
      alert("Por favor, ingresa un nombre de curso y selecciona una fecha válida.");
      return;
    }
  
    const assignedTo = assignedMode === "all" ? "All recruiters" : selectedUsers;
  
    console.log("Enviando datos para programar publicación:", {
      name: courseName,
      assignedTo,
      branchId,
      publicationDate: new Date(scheduledDate), // Configurando correctamente la fecha programada
    });
  
    onSubmit({
      name: courseName,
      assignedTo,
      branchId,
      publicationDate: new Date(scheduledDate), // Incluye la fecha programada
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
            <button onClick={handlePublishNow}>
              Publish now
            </button>
          )}
          <button
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
            
            <div className="modal-actions-button2">
            <button onClick={handleSchedule}>Confirm schedule</button>
            </div>

          </div>
        )}

          </div>
        
      </div>
    </div>
  );
};

export default CourseModal;
