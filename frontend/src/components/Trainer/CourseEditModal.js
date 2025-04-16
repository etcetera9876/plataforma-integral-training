import React, { useState, useEffect } from "react";
import "./TrainerDashboard.css";
import axios from "axios";

const resourceTypes = [
  { value: "image", label: "Imagen" },
  { value: "video", label: "Video" },
  { value: "link", label: "Enlace" },
  { value: "document", label: "Documento" },
];

const CourseEditModal = ({ course, branchName, onClose, onSave, userNames }) => {
  const [name, setName] = useState(course?.name || "");
  const [description, setDescription] = useState(course?.description || "");
  const [resources, setResources] = useState(course?.resources || []);
  const [publicationDate, setPublicationDate] = useState(course?.publicationDate ? new Date(course.publicationDate).toISOString().slice(0, 16) : "");
  const [expirationDate, setExpirationDate] = useState(course?.expirationDate ? new Date(course.expirationDate).toISOString().slice(0, 16) : "");
  const [newResource, setNewResource] = useState({ type: "link", url: "", name: "" });
  const [saving, setSaving] = useState(false);
  const [assignedMode, setAssignedMode] = useState(
    course?.assignedTo && course.assignedTo[0] === "All recruiters" ? "all" : "select"
  );
  const [branchUsers, setBranchUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(
    Array.isArray(course?.assignedTo) && course.assignedTo[0] !== "All recruiters"
      ? course.assignedTo
      : []
  );

  useEffect(() => {
    if (assignedMode === "select" && branchName) {
      axios
        .get(`/api/users/branch/${branchName}/users`)
        .then((response) => setBranchUsers(response.data))
        .catch((error) => console.error("Error al obtener usuarios del branch:", error));
    }
  }, [assignedMode, branchName]);

  // Lógica para mostrar correctamente la fecha de publicación
  useEffect(() => {
    // Si la fecha de publicación es muy cercana a la fecha de creación, se considera "Publicado ahora"
    if (course?.publicationDate && course?.createdAt) {
      const pub = new Date(course.publicationDate);
      const created = new Date(course.createdAt);
      const diff = Math.abs(pub.getTime() - created.getTime());
      // Si la diferencia es menor a 2 minutos, se considera "Publicado ahora"
      if (diff < 2 * 60 * 1000) {
        setPublicationDate("");
      }
    }
  }, [course]);

  const handleResourceChange = (e) => {
    setNewResource({ ...newResource, [e.target.name]: e.target.value });
  };

  const handleAddResource = () => {
    if (!newResource.url) return;
    setResources([...resources, newResource]);
    setNewResource({ type: "link", url: "", name: "" });
  };

  const handleRemoveResource = (idx) => {
    setResources(resources.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let assignedTo = assignedMode === "all" ? ["All recruiters"] : selectedUsers;
      if (assignedTo.length === 0) {
        alert("Debes asignar al menos un reclutador o seleccionar 'Todos los reclutadores'.");
        setSaving(false);
        return;
      }
      const response = await fetch(`/api/courses/${course._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          resources,
          publicationDate: publicationDate ? new Date(publicationDate) : null,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          assignedTo,
        }),
      });
      if (!response.ok) throw new Error("Error al guardar el curso");
      onSave && onSave();
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Editar curso para {branchName}</h3>
        <div className="modal-field">
          <label>Título:</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="modal-field">
          <label>Descripción:</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ width: "100%" }} />
        </div>
        <div className="modal-field">
          <label>Recursos:</label>
          <ul style={{ paddingLeft: 18 }}>
            {resources.map((res, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                <b>{res.type}:</b> <a href={res.url} target="_blank" rel="noopener noreferrer">{res.name || res.url}</a>
                <button style={{ marginLeft: 8 }} onClick={() => handleRemoveResource(idx)} title="Eliminar recurso">✕</button>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <select name="type" value={newResource.type} onChange={handleResourceChange}>
              {resourceTypes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <input name="url" type="text" placeholder="URL o enlace" value={newResource.url} onChange={handleResourceChange} style={{ flex: 1 }} />
            <input name="name" type="text" placeholder="Nombre (opcional)" value={newResource.name} onChange={handleResourceChange} style={{ width: 120 }} />
            <button className="confirm-button" onClick={handleAddResource} type="button">Agregar</button>
          </div>
        </div>
        <div className="modal-field">
          <label>Fecha de publicación:</label>
          <input
            type="datetime-local"
            value={publicationDate || ""}
            onChange={e => setPublicationDate(e.target.value)}
            placeholder={course?.publicationDate ? undefined : "Publicado ahora"}
          />
        </div>
        <div className="modal-field">
          <label>Fecha de expiración:</label>
          <input
            type="datetime-local"
            value={expirationDate || ""}
            onChange={e => setExpirationDate(e.target.value)}
          />
        </div>
        <div className="modal-field">
          <label>Reclutadores asignados:</label>
          <div style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 16 }}>
              <input
                type="radio"
                name="assignedMode"
                value="all"
                checked={assignedMode === "all"}
                onChange={() => setAssignedMode("all")}
              />
              Todos los reclutadores
            </label>
            <label>
              <input
                type="radio"
                name="assignedMode"
                value="select"
                checked={assignedMode === "select"}
                onChange={() => setAssignedMode("select")}
              />
              Seleccionar reclutadores
            </label>
          </div>
          {assignedMode === "select" && (
            <ul style={{ paddingLeft: 18, maxHeight: 120, overflowY: 'auto' }}>
              {branchUsers.map((user) => (
                <li key={user._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ flex: 1 }}>{user.name}</span>
                  <input
                    type="checkbox"
                    value={user._id}
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => {
                      setSelectedUsers((prev) =>
                        prev.includes(user._id)
                          ? prev.filter((id) => id !== user._id)
                          : [...prev, user._id]
                      );
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
          <button className="cancel-button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="confirm-button" onClick={handleSave} disabled={saving}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default CourseEditModal;
