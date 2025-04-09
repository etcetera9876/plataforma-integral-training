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
    if (assignedMode === "select" && branchId) {
      // Llamada al backend para obtener los usuarios del branch
      axios.get(`/api/users?branchId=${branchId}`)
        .then((response) => {
          setBranchUsers(response.data.users); // Actualiza la lista de usuarios
        })
        .catch((error) => {
          console.error("Error al obtener usuarios del branch:", error);
        });
    }
  }, [assignedMode, branchId]);

const handlePublishNow = () => {
  if (!courseName.trim()) return;
  const assignedTo = assignedMode === "all" ? "All recruiters" : selectedUsers;
  onSubmit({
    name: courseName,
    assignedTo,
    branchId,
    publicationDate: null,
  });
  onClose();
};

const handleSchedule = () => {
  if (!courseName.trim() || !scheduledDate) return;
  const assignedTo = assignedMode === "all" ? "All recruiters" : selectedUsers;
  onSubmit({
    name: courseName,
    assignedTo,
    branchId,
    publicationDate: new Date(scheduledDate),
  });
  onClose();
};

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={stopPropagation}>
        <h3>Add course for {branchName}:</h3>

        <div className="modal-field">
          <label>Assign to:</label>
          <div>
            <label>
              <input
                type="radio"
                name="assignedMode"
                value="all"
                checked={assignedMode === "all"}
                onChange={() => setAssignedMode("all")}
              />
              All recruiters
            </label>
            <label>
              <input
                type="radio"
                name="assignedMode"
                value="select"
                checked={assignedMode === "select"}
                onChange={() => setAssignedMode("select")}
              />
              Select personal
            </label>
          </div>
        </div>

        {assignedMode === "select" && (
  <div className="modal-field">
    <p>Select recruiters:</p>
    <ul>
      {branchUsers.map((user) => (
        <li key={user.id}>
          <label>
            <input
              type="checkbox"
              value={user.id}
              checked={selectedUsers.includes(user.id)}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setSelectedUsers((prev) =>
                  isChecked
                    ? [...prev, user.id] // Agregar usuario seleccionado
                    : prev.filter((id) => id !== user.id) // Quitar usuario deseleccionado
                );
              }}
            />
            {user.name}
          </label>
        </li>
      ))}
    </ul>
  </div>
)}

        <div className="modal-field">
          <label>Course name:</label>
          <input
            type="text"
            placeholder="Enter course name"
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

        {isSchedule && (
          <div className="schedule-field">
            <label>Select date/time:</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
            <button onClick={handleSchedule}>Confirm schedule</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseModal;
