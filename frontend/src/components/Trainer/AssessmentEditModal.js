import React, { useState, useEffect } from "react";
import axios from "axios";
import AlertMessage from "./AlertMessage";
import AssessmentQuestions from "./AssessmentQuestions";
import "./TrainerDashboard.css";

function toLocalDatetimeString(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISO = new Date(date - tzOffset).toISOString().slice(0, 16);
  return localISO;
}

const AssessmentEditModal = ({
  branchName,
  onClose,
  onSubmit,
  initialData = {},
  branchId,
  components = []
}) => {
  const [name, setName] = useState(initialData.name || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "info" });
  const [selectedComponent, setSelectedComponent] = useState(
    initialData.components && initialData.components.length > 0
      ? initialData.components[0].block
      : ""
  );
  const [scheduledDate, setScheduledDate] = useState(
    initialData.publicationDate ? toLocalDatetimeString(initialData.publicationDate) : ""
  );
  const [expirationDate, setExpirationDate] = useState(
    initialData.expirationDate ? toLocalDatetimeString(initialData.expirationDate) : ""
  );
  const [showSchedule, setShowSchedule] = useState(!!(initialData.publicationDate || initialData.expirationDate));
  const [assignedMode, setAssignedMode] = useState(
    initialData.assignedTo && initialData.assignedTo[0] === "All recruiters" ? "all" : "select"
  );
  const [branchUsers, setBranchUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(
    Array.isArray(initialData.assignedTo) && initialData.assignedTo[0] !== "All recruiters"
      ? initialData.assignedTo
      : []
  );
  const [questions, setQuestions] = useState(initialData.questions || []);
  const [evaluationType, setEvaluationType] = useState(initialData.evaluationType || "multiple-choice");

  useEffect(() => {
    if (assignedMode === "select" && branchName) {
      axios
        .get(`/api/users/branch/${branchName}/users`)
        .then((response) => setBranchUsers(response.data))
        .catch(() => setBranchUsers([]));
    }
  }, [assignedMode, branchName]);

  useEffect(() => {
    if (showSchedule && !scheduledDate && initialData.publicationDate) {
      setScheduledDate(toLocalDatetimeString(initialData.publicationDate));
    }
    if (showSchedule && !expirationDate && initialData.expirationDate) {
      setExpirationDate(toLocalDatetimeString(initialData.expirationDate));
    }
    if (!showSchedule) {
      setScheduledDate("");
      setExpirationDate("");
    }
  }, [showSchedule, initialData, scheduledDate, expirationDate]);

  const canSave =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    selectedComponent &&
    (assignedMode === "all" || (assignedMode === "select" && selectedUsers.length > 0));

  const handleOverlayClick = () => {
    onClose();
  };
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const assignedTo = assignedMode === "all" ? ["All recruiters"] : selectedUsers;
      const payload = {
        name,
        description,
        branch: branchId,
        components: [selectedComponent],
        publicationDate: showSchedule && scheduledDate ? new Date(scheduledDate).toISOString() : null,
        expirationDate: showSchedule && expirationDate ? new Date(expirationDate).toISOString() : null,
        assignedTo,
        questions,
        evaluationType,
      };
      await onSubmit(payload);
      setSnackbar({ open: true, message: "Evaluación editada con éxito", type: "success" });
      onClose();
    } catch (error) {
      setSnackbar({ open: true, message: "Error al editar la evaluación", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal assessment-modal-wide" onClick={stopPropagation} style={{ minWidth: 900, maxWidth: 1100, borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,60,0.18)' }}>
        <h3 style={{ textAlign: 'center', fontWeight: 700, fontSize: 26, margin: '18px 0 24px 0', letterSpacing: 0.5 }}>Editar evaluación</h3>
        <div className="assessment-modal-content" style={{ display: 'flex', gap: 32, alignItems: 'flex-start', justifyContent: 'center', padding: 8 }}>
          {/* Columna izquierda: datos generales */}
          <div className="assessment-modal-left" style={{ flex: 1, minWidth: 420, maxWidth: 540, background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px #e0e0e0', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', maxHeight: 650, overflowY: 'auto' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <div className="modal-field">
                <label style={{ fontWeight: 600, marginBottom: 4 }}>Nombre de la evaluación</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: "100%", borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 16, marginBottom: '-10px', boxSizing: 'border-box' }}
                />
              </div>
              <div className="modal-field">
                <label style={{ fontWeight: 600, marginBottom: 4}}>Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  style={{ width: "100%", borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15, boxSizing: 'border-box', resize: 'vertical', minHeight: 60, marginRight: 0,  marginBottom: '-10px' }}
                />
              </div>
              <div className="modal-field">
                <label style={{ fontWeight: 600, marginBottom: 4 }}>Selecciona el bloque</label>
                <select
                  value={selectedComponent}
                  onChange={e => setSelectedComponent(e.target.value)}
                  style={{ width: "100%", marginBottom: '-5px', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }}
                  required
                >
                  <option value="">Selecciona un bloque</option>
                  {components.map(block => (
                    <option key={block._id} value={block._id}>
                      {block.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 5, marginTop: 2, textAlign: 'center' }}>Reclutadores asignados</div>
              <section className="checklist-section" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start', marginBottom: 10, justifyContent: 'flex-start', width: '100%' }}>
                  <label className="radio-row" style={{ fontWeight: 500, fontSize: 16, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between', padding: '8px 0', whiteSpace: 'nowrap' }}>
                    <input
                      type="radio"
                      name="assignedMode"
                      value="all"
                      checked={assignedMode === "all"}
                      onChange={() => setAssignedMode("all")}
                      style={{ marginLeft: 25, transform: 'scale(1.2)', marginBottom:'-20px' }}
                    />
                    <span className="radio-label" style={{ textAlign: 'left', whiteSpace: 'nowrap', marginBottom:'-20px'   }}>Todos los reclutadores</span>
                  </label>
                  <label className="radio-row" style={{  fontWeight: 500, fontSize: 16, display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between', padding: '8px 0', whiteSpace: 'nowrap' }}>
                    <input
            
                      type="radio"
                      name="assignedMode"
                      value="select"
                      checked={assignedMode === "select"}
                      onChange={() => setAssignedMode("select")}
                      style={{ marginLeft: 12,  transform: 'scale(1.2)' }}
                    />
                    <span className="radio-label" style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Seleccionar reclutadores</span>
                  </label>
                </div>
              </section>
              <section className="checklist-section" style={{ marginBottom: '-20px', marginTop: '-30px' }}>
                <div className="check-list" >
                  {assignedMode === "select" && (
                    <div className="modal-field" style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 6}}>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none'}}>
                        {branchUsers.map((user) => (
                          <li key={user._id} className="course-item recruiter-row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span className="recruiter-name" style={{ fontSize: 15 }}>{user.name}</span>
                            <input
                              type="checkbox"
                              value={user._id}
                              checked={selectedUsers.includes(user._id)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setSelectedUsers((prev) =>
                                  isChecked
                                    ? [...prev, user._id]
                                    : prev.filter((id) => id !== user._id)
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
              <div className="modal-field" style={{ maxWidth: 480, margin: '0 auto', width: '100%', marginTop: 8, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, marginBottom: 6, marginTop: 8, gap: 12, width: '100%' }}>
                  <span style={{ marginBottom: 12 }}>Programado</span>
                  <input type="checkbox" checked={showSchedule} onChange={e => setShowSchedule(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                </div>
                {showSchedule && (
                  <div style={{ marginTop: 8, width: '100%' }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontWeight: 500 }}>Fecha de publicación:</label>
                      <input
                        type="datetime-local"
                        value={scheduledDate || ""}
                        onChange={e => setScheduledDate(e.target.value)}
                        style={{ borderRadius: 6, border: '1.2px solid #d0d0d0', padding: 6, fontSize: 15 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 500 }}>Fecha de expiración:</label>
                      <input
                        type="datetime-local"
                        value={expirationDate || ""}
                        onChange={e => setExpirationDate(e.target.value)}
                        style={{ borderRadius: 6, border: '1.2px solid #d0d0d0', padding: 6, fontSize: 15 }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="cancel-button" type="button" onClick={onClose} disabled={saving} style={{ borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15 }}>
                  Cancelar
                </button>
                <button className="confirm-button" type="submit" disabled={saving || !canSave} style={{ borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15 }}>
                  Save
                </button>
              </div>
            </form>
          
          </div>
          {/* Columna derecha: preguntas */}
          <div className="assessment-modal-right" style={{ flex: 1.2, minWidth: 370, maxWidth: 600, borderLeft: '2px solid #e0e0e0', paddingLeft: 32, overflowY: 'auto', maxHeight: 600, background: '#f8f9fa', borderRadius: 16, boxShadow: '0 2px 8px #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: 0.2 }}>Preguntas</div>
              <div style={{ minWidth: 180, marginLeft: 16 }}>
                <label style={{ fontWeight: 600, marginBottom: 4, marginRight: 8 }}>Tipo de evaluación</label>
                <select
                  value={evaluationType}
                  onChange={e => setEvaluationType(e.target.value)}
                  style={{ borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }}
                >
                  <option value="multiple-choice">Opción múltiple</option>
                  <option value="single-choice">Opción única</option>
                  <option value="true-false">Verdadero/Falso</option>
                  <option value="open">Respuesta abierta</option>
                  <option value="case">Caso simulado</option>
                </select>
              </div>
            </div>
            <AssessmentQuestions
              questions={questions}
              setQuestions={setQuestions}
              evaluationType={evaluationType}
              customAddButtonStyle={{ display: 'none' }}
            />
          </div>
        </div>
        <AlertMessage
          open={snackbar.open}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        />
      </div>
    </div>
  );
};

export default AssessmentEditModal;
