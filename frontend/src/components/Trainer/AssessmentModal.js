import React, { useState, useEffect } from "react";
import axios from "axios";
import AlertMessage from "./AlertMessage";
import AssessmentQuestions from "./AssessmentQuestions";
import "./TrainerDashboard.css";

// Utilidad para convertir UTC a local para datetime-local
function toLocalDatetimeString(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISO = new Date(date - tzOffset).toISOString().slice(0, 16);
  return localISO;
}

const AssessmentModal = ({
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
      ? initialData.components[0]
      : ""
  );

  const [assignedMode, setAssignedMode] = useState(
    initialData.assignedTo && initialData.assignedTo[0] === "All recruiters" ? "all" : "all"
  );
  const [branchUsers, setBranchUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(
    Array.isArray(initialData.assignedTo) && initialData.assignedTo[0] !== "All recruiters"
      ? initialData.assignedTo
      : []
  );

  const [courses, setCourses] = useState([]);
  const [relatedCourses, setRelatedCourses] = useState([]);

  useEffect(() => {
    if (assignedMode === "select" && branchName) {
      axios
        .get(`/api/users/branch/${branchName}/users`)
        .then((response) => setBranchUsers(response.data))
        .catch(() => setBranchUsers([]));
    }
  }, [assignedMode, branchName]);

  useEffect(() => {
    // Obtener todos los cursos para el multiselect
    axios.get('/api/courses', { params: { recruiterId: '', branchId: '' } })
      .then(res => setCourses(res.data))
      .catch(() => setCourses([]));
  }, []);

  const [evaluationType, setEvaluationType] = useState(initialData.evaluationType || "multiple-choice");
  const [questions, setQuestions] = useState(initialData.questions || []);

  const canPublishNow =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    selectedComponent &&
    (assignedMode === "all" || (assignedMode === "select" && selectedUsers.length > 0));

  const [isSchedule, setIsSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  const handlePublishNow = (e) => {
    e.preventDefault();
    if (!canPublishNow) {
      setSnackbar({ open: true, message: "Completa todos los campos obligatorios para publicar.", type: "error" });
      return;
    }
    handleSubmit(e, { publishNow: true });
  };

  const handleSchedule = (e) => {
    e.preventDefault();
    if (!canPublishNow || !scheduledDate) {
      setSnackbar({ open: true, message: "Completa todos los campos y selecciona una fecha de publicación.", type: "error" });
      return;
    }
    handleSubmit(e, { schedule: true });
  };

  const handleOverlayClick = () => {
    onClose();
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const handleSubmit = async (e, options = {}) => {
    e.preventDefault();
    setSaving(true);
    try {
      const assignedTo = assignedMode === "all" ? ["All recruiters"] : selectedUsers;
      const payload = {
        name,
        description,
        branch: branchId,
        components: [selectedComponent],
        assignedTo,
        evaluationType,
        questions,
        relatedCourses,
        publicationDate: options.publishNow
          ? null
          : isSchedule && scheduledDate
          ? new Date(scheduledDate).toISOString()
          : null,
        expirationDate: isSchedule && expirationDate ? new Date(expirationDate).toISOString() : null,
      };
      await onSubmit(payload);
      setSnackbar({ open: true, message: "Evaluación guardada con éxito", type: "success" });
      onClose();
    } catch (error) {
      setSnackbar({ open: true, message: "Error al guardar la evaluación", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal assessment-modal-wide" onClick={stopPropagation} style={{ minWidth: 420, maxWidth: 520, borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,60,0.18)' }}>
        <h3 style={{ textAlign: 'center', fontWeight: 700, fontSize: 26, margin: '18px 0 24px 0', letterSpacing: 0.5 }}>Nueva evaluación</h3>
        <div className="assessment-modal-content" style={{ padding: 8 }}>
          <div className="assessment-modal-left" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px #e0e0e0', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="modal-field">
                <label style={{ fontWeight: 600, marginBottom: 4 }}>Nombre de la evaluación</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: "100%", borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 16 }}
                />
              </div>
              <div className="modal-field">
                <label style={{ fontWeight: 600, marginBottom: 4 }}>Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  style={{ width: "100%", borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }}
                />
              </div>
              <div className="modal-field">
                <label style={{ fontWeight: 600, marginBottom: 4 }}>Selecciona el bloque</label>
                <select
                  value={selectedComponent}
                  onChange={e => setSelectedComponent(e.target.value)}
                  style={{ width: "100%", marginBottom: 10, borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }}
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
              <div className="modal-field">
                <label>Cursos relacionados (opcional)</label>
                <select
                  multiple
                  value={relatedCourses}
                  onChange={e => {
                    const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                    setRelatedCourses(selected);
                  }}
                  style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15, minHeight: 80 }}
                >
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <section className="checklist-section" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 6 }}>
                  <label className="radio-row" style={{ fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="radio-label">All recruiters</span>
                    <input
                      type="radio"
                      name="assignedMode"
                      value="all"
                      checked={assignedMode === "all"}
                      onChange={() => setAssignedMode("all")}
                    />
                  </label>
                  <label className="radio-row" style={{ fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    <div className="modal-field" style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 6 }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
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
              <div className="modal-actions" style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                {!isSchedule && (
                  <>
                    <button
                      className="schedule-buttons"
                      type="button"
                      onClick={handlePublishNow}
                      disabled={saving}
                      style={{ background: '#e53935', color: '#fff', fontWeight: 600, borderRadius: 8, padding: '8px 18px', fontSize: 16, border: 'none', boxShadow: '0 1px 4px #e0e0e0', transition: 'background 0.2s' }}
                    >
                      Publish now
                    </button>
                    <button
                      className="schedule-buttons"
                      type="button"
                      onClick={() => setIsSchedule(true)}
                      disabled={isSchedule}
                      style={{ background: '#e53935', color: '#fff', fontWeight: 600, borderRadius: 8, padding: '8px 18px', fontSize: 16, border: 'none', boxShadow: '0 1px 4px #e0e0e0', transition: 'background 0.2s' }}
                    >
                      Schedule publication
                    </button>
                  </>
                )}
              </div>
              {isSchedule && (
                <div className="schedule-field" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8, background: '#f5f5f5', borderRadius: 8, padding: 12 }}>
                  <label style={{ fontWeight: 500 }}>Fecha de publicación:</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    style={{ borderRadius: 6, border: '1.2px solid #d0d0d0', padding: 6, fontSize: 15 }}
                  />
                  <label style={{ fontWeight: 500 }}>Fecha de expiración:</label>
                  <input
                    type="datetime-local"
                    value={expirationDate}
                    onChange={e => setExpirationDate(e.target.value)}
                    style={{ borderRadius: 6, border: '1.2px solid #d0d0d0', padding: 6, fontSize: 15 }}
                  />
                  <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button className="cancel-button" type="button" onClick={() => setIsSchedule(false)} disabled={saving} style={{ borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15 }}>
                      Cancelar
                    </button>
                    <button className="confirm-button" type="button" onClick={handleSchedule} disabled={saving} style={{ borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15 }}>
                      Save
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
        <AlertMessage
          open={snackbar.open}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar({ open: false, message: '', type: snackbar.type })}
        />
      </div>
    </div>
  );
};

export default AssessmentModal;