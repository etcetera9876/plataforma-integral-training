import React, { useState, useEffect } from "react";
import axios from "axios";
import AlertMessage from "./AlertMessage";
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
      ? initialData.components[0]
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
      <div className="modal" onClick={stopPropagation}>
        <h3>Editar evaluación</h3>
        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label>Nombre de la evaluación</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>
          <div className="modal-field">
            <label>Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{ width: "100%" }}
            />
          </div>
          <div className="modal-field">
            <label>Selecciona el bloque</label>
            <select
              value={selectedComponent}
              onChange={e => setSelectedComponent(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
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
          <div className="modal-field" style={{ maxWidth: 480, margin: '0 auto', width: '100%', marginTop: 25, marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, marginBottom: 6, marginTop: 16, gap: 12, width: '100%' }}>
              <span style={{ marginBottom: 12 }}>Programado</span>
              <input type="checkbox" checked={showSchedule} onChange={e => setShowSchedule(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
            </div>
            {showSchedule && (
              <div style={{ marginTop: 8, width: '100%' }}>
                <div style={{ marginBottom: 8 }}>
                  <label>Fecha de publicación:</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate || ""}
                    onChange={e => setScheduledDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label>Fecha de expiración:</label>
                  <input
                    type="datetime-local"
                    value={expirationDate || ""}
                    onChange={e => setExpirationDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>
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
          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="cancel-button" type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className="confirm-button" type="submit" disabled={saving || !canSave}>
              Save
            </button>
          </div>
        </form>
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
