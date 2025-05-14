import React, { useState, useEffect } from "react";
import axios from "axios";
import "./TrainerDashboard.css";
import { useDashboard } from '../DashboardContext';
import { v4 as uuidv4 } from 'uuid'; // Para generar globalGroupId

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
  course = null,
  isGlobal = false, // NUEVO: prop para modo global
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

  const { branches } = useDashboard(); // Obtener branches del contexto
  const [selectedBranches, setSelectedBranches] = useState([]); // Para modo global

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
   
      axios
        .get(`/api/users/branch/${branchName}/users`)
        .then((response) => {
          
          setBranchUsers(response.data); // Actualiza la lista de usuarios
        })
        .catch((error) => {
          console.error("Error al obtener usuarios del branch:", error);
        });
    }
  }, [assignedMode, branchName]);


  // NUEVO: Manejar selección de branches en modo global
  const handleBranchCheckbox = (id) => {
    setSelectedBranches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  // NUEVO: Obtener usuarios de varios branches
  const fetchUsersFromBranches = async (branchIds) => {
    const allUsers = [];
    for (const bId of branchIds) {
      try {
        const res = await axios.get(`/api/users/branch/${bId}/users`);
        allUsers.push(...res.data);
      } catch (e) { /* ignorar errores individuales */ }
    }
    // Quitar duplicados por _id
    const unique = Array.from(new Map(allUsers.map(u => [u._id, u])).values());
    return unique.map(u => u._id);
  };

  //para el boton de publicar ahora
  const handlePublishNow = async () => {
    if (!courseName.trim()) {
      alert("Por favor, ingresa un nombre de curso.");
      return;
    }
    if (isGlobal && selectedBranches.length === 0) {
      alert("Selecciona al menos una sucursal.");
      return;
    }
    if (assignedMode === "select" && !isGlobal && selectedUsers.length === 0) {
      alert("Por favor, selecciona al menos un reclutador.");
      return;
    }
    let assignedTo;
    let finalBranchId = branchId;
    let globalGroupId = null;
    if (isGlobal) {
      assignedTo = assignedMode === "all"
        ? ["All recruiters"]
        : await fetchUsersFromBranches(selectedBranches);
      finalBranchId = selectedBranches; // Puede ser array
      // Validación extra: si selectedBranches está vacío, no continuar
      if (!Array.isArray(finalBranchId) || finalBranchId.length === 0) {
        alert("Selecciona al menos una sucursal válida.");
        return;
      }
      globalGroupId = uuidv4();
    } else {
      assignedTo = assignedMode === "all" ? ["All recruiters"] : selectedUsers;
    }
   
    onSubmit({
      name: courseName,
      assignedTo,
      branchId: finalBranchId,
      publicationDate: null,
      expirationDate: null,
      globalGroupId,
    });
    onClose();
  };

  //para el boton de programar
  const handleSchedule = async () => {
    if (!courseName.trim() || !scheduledDate) {
      alert("Por favor, ingresa un nombre de curso y selecciona una fecha de publicación.");
      return;
    }
    if (isGlobal && selectedBranches.length === 0) {
      alert("Selecciona al menos una sucursal.");
      return;
    }
    if (assignedMode === "select" && !isGlobal && selectedUsers.length === 0) {
      alert("Por favor, selecciona al menos un reclutador.");
      return;
    }
    let assignedTo;
    let finalBranchId = branchId;
    let globalGroupId = null;
    if (isGlobal) {
      assignedTo = assignedMode === "all"
        ? ["All recruiters"]
        : await fetchUsersFromBranches(selectedBranches);
      finalBranchId = selectedBranches;
      globalGroupId = uuidv4();
    } else {
      assignedTo = assignedMode === "all" ? ["All recruiters"] : selectedUsers;
    }
    onSubmit({
      name: courseName,
      assignedTo,
      branchId: finalBranchId,
      publicationDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
      globalGroupId,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal"
        onClick={stopPropagation}>
        <h3>Add course {isGlobal ? 'for selected branches' : `for ${branchName}`}</h3>
        {isGlobal && (
          <section className="checklist-section"> <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Selecciona sucursales:</div> 
          <div className="check-list" style={{ maxHeight: 320, overflowY: 'auto', padding: 0 }}> {branches.map((b) => ( 
            <div key={b._id} className="recruiter-row" style={{ padding: '6px 0', borderBottom: '1px solid #eee', background: '#fff', borderRadius: 0, margin: 0, alignItems: 'center', gap: 0, justifyContent: 'flex-start' }}>
               <input type="checkbox" checked={selectedBranches.includes(b._id)} onChange={() => handleBranchCheckbox(b._id)} style={{ marginRight: -120, marginLeft: -120, flexShrink: 0 }} />
           <span className="recruiter-name" style={{ fontSize: 15, textAlign: 'left', margin: 0, padding: 0, minWidth: 0, flex: 1 }}>{b.name}</span> </div> ))} </div> </section>
        )}
        {!isGlobal && (
          <section className="checklist-section">  
            <div>
              <h4>Assign to: {branchName}:</h4>
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
        )}

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
