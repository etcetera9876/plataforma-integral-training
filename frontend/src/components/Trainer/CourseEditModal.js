import React, { useState, useEffect, useRef } from "react";
import "./TrainerDashboard.css";
import axios from "axios";
import { FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileImage, FaFileVideo, FaLink, FaFileAlt } from 'react-icons/fa';

// const resourceTypes = [
//   { value: "image", label: "Imagen" },
//   { value: "video", label: "Video" },
//   { value: "link", label: "Enlace" },
//   { value: "document", label: "Documento" },
// ];

// Utilidad para convertir UTC a local para datetime-local
function toLocalDatetimeString(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISO = new Date(date - tzOffset).toISOString().slice(0, 16);
  return localISO;
}

// Utilidad para convertir local a UTC para guardar
function toUTCDateString(localStr) {
  if (!localStr) return null;
  const localDate = new Date(localStr);
  return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
}

function getFileIcon(type) {
  // Iconos más pequeños y compactos
  if (type === 'pdf' || type === 'application/pdf') return <FaFilePdf color="#e74c3c" size={22} />;
  if (type === 'word' || type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return <FaFileWord color="#2980b9" size={22} />;
  if (type === 'excel' || type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return <FaFileExcel color="#27ae60" size={22} />;
  if (type === 'ppt' || type === 'application/vnd.ms-powerpoint' || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return <FaFilePowerpoint color="#e67e22" size={22} />;
  if (type === 'image' || (typeof type === 'string' && type.startsWith('image/'))) return <FaFileImage color="#8e44ad" size={22} />;
  if (type === 'video' || (typeof type === 'string' && type.startsWith('video/'))) return <FaFileVideo color="#16a085" size={22} />;
  if (type === 'link') return <FaLink color="#34495e" size={22} />;
  return <FaFileAlt color="#888" size={22} />;
}

const modalStyle = {
  minWidth: 480,
  width: 'auto', // El modal solo será tan ancho como su contenido
  minHeight: 400,
  maxHeight: '90vh',
  overflowY: 'auto',
  overflowX: 'hidden',
  boxSizing: 'border-box',
};

const CourseEditModal = ({ course, branchName, onClose, onSave, userNames, globalGroup = [], isGlobal = false }) => {
  const [name, setName] = useState(course?.name || "");
  const [description, setDescription] = useState(course?.description || "");
  const [resources, setResources] = useState(course?.resources || []);
  const [publicationDate, setPublicationDate] = useState(course?.publicationDate ? toLocalDatetimeString(course.publicationDate) : "");
  const [expirationDate, setExpirationDate] = useState(course?.expirationDate ? toLocalDatetimeString(course.expirationDate) : "");
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
  const [showSchedule, setShowSchedule] = useState(!!(course?.publicationDate || course?.expirationDate));
  const [showLinkInput, setShowLinkInput] = useState(false);
  const fileInputRef = useRef();
  // NUEVO: Guardar el grupo de cursos globales si existe
  const groupRef = useRef(globalGroup);

  // Determina si el botón Save debe estar habilitado
  const canSave = description.trim().length > 0 || resources.length > 0;

  useEffect(() => {
    if (assignedMode === "select" && branchName) {
      axios
        .get(`/api/users/branch/${branchName}/users`)
        .then((response) => setBranchUsers(response.data))
        .catch((error) => console.error("Error al obtener usuarios del branch:", error));
    }
  }, [assignedMode, branchName]);

  useEffect(() => {
    setPublicationDate(course?.publicationDate ? toLocalDatetimeString(course.publicationDate) : "");
    setExpirationDate(course?.expirationDate ? toLocalDatetimeString(course.expirationDate) : "");
  }, [course]);

  // Cuando el usuario activa el checkbox de programación, si no hay fecha, restaurar la original
  useEffect(() => {
    if (showSchedule && !publicationDate && course?.publicationDate) {
      setPublicationDate(toLocalDatetimeString(course.publicationDate));
    }
    if (showSchedule && !expirationDate && course?.expirationDate) {
      setExpirationDate(toLocalDatetimeString(course.expirationDate));
    }
    // Si se desactiva, limpiar fechas
    if (!showSchedule) {
      setPublicationDate("");
      setExpirationDate("");
    }
  }, [showSchedule, course, publicationDate, expirationDate]);

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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFiles = async (files) => {
    const allowedTypes = [
      "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/png", "image/jpeg", "image/gif", "video/mp4", "video/quicktime"
    ];
    for (const file of files) {
      if (allowedTypes.includes(file.type)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/courses/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        // Determinar tipo robusto para iconos
        let resourceType = 'document';
        if (file.type.startsWith('image/')) resourceType = 'image';
        else if (file.type.startsWith('video/')) resourceType = 'video';
        else if (file.type === 'application/pdf') resourceType = 'pdf';
        else if (file.type.includes('word')) resourceType = 'word';
        else if (file.type.includes('excel')) resourceType = 'excel';
        else if (file.type.includes('powerpoint')) resourceType = 'ppt';
        setResources(prev => [...prev, {
          type: resourceType,
          url: data.url,
          name: file.name
        }]);
      } else {
        alert(`Tipo de archivo no permitido: ${file.name}`);
      }
    }
  };

  const handleFileInput = (e) => {
    handleFiles(Array.from(e.target.files));
    e.target.value = null; // Limpiar el input para permitir subir el mismo archivo varias veces
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let assignedTo = assignedMode === "all" ? ["All recruiters"] : selectedUsers;
      if (isGlobal && groupRef.current && groupRef.current.length > 0) {
        // Usar el grupo local, no volver a filtrar
        const groupCourses = groupRef.current;
        let updateResults = [];
        for (let i = 0; i < groupCourses.length; i++) {
          const c = groupCourses[i];
          try {
            const res = await fetch(`/api/courses/${c._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                description,
                resources,
                publicationDate: publicationDate ? toUTCDateString(publicationDate) : null,
                expirationDate: expirationDate ? toUTCDateString(expirationDate) : null,
                assignedTo,
              }),
            });
            let data = null;
            try { data = await res.json(); } catch {}
            updateResults.push({id: c._id, branchId: c.branchId, ok: res.ok, status: res.status, data});
          } catch (err) {
            // Puedes agregar manejo de error si lo deseas
          }
        }
        if (window.fetchAllCoursesGlobal) {
          await window.fetchAllCoursesGlobal();
        }
        onSave && onSave();
        onClose();
      } else {
        // Modo sucursal: solo uno
        const response = await fetch(`/api/courses/${course._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            resources,
            publicationDate: publicationDate ? toUTCDateString(publicationDate) : null,
            expirationDate: expirationDate ? toUTCDateString(expirationDate) : null,
            assignedTo,
          }),
        });
        let data = null;
        try { data = await response.json(); } catch {}
        console.log('Respuesta actualización (sucursal)', course._id, data);
        if (!response.ok) throw new Error("Error al guardar el curso");
        onSave && onSave();
        onClose();
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={modalStyle}>
        {/* Eliminado log visual de branches globales */}
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Editar curso para {branchName}</h3>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
          <div className="modal-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label>Título:</label>
            <span style={{ fontSize: 13, color: '#888', fontWeight: 400, marginLeft: 12 }}>
              Última actualización: {course?.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : course?.createdAt ? new Date(course.createdAt).toLocaleDateString() : ''}
            </span>
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
          <div className="modal-field">
            <label>Descripción:</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ width: '100%' }} />
          </div>
        </div>
        <div className="modal-field">
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}>Recursos</div>
          <div
            className={`resource-drop-area${resources.length === 0 ? ' empty' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={e => {
              handleDrop(e);
            }}
            tabIndex={0}
          >
            {resources.length === 0 && (
              <span>No hay archivos subidos aún</span>
            )}
            {resources.map((res, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 8, maxWidth: 110, minWidth: 0, wordBreak: 'break-word' }}>
                {getFileIcon(res.type)}
                <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 4, fontSize: 13, color: '#333', wordBreak: 'break-all', maxWidth: 100, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}>{res.name || res.url}</a>
                <button style={{ marginTop: 2, fontSize: 11, width: 20, height: 20, lineHeight: '16px', padding: 0, borderRadius: '50%', border: 'none', background: '#eee', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleRemoveResource(idx)} title="Eliminar recurso">✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
            <button className="confirm-button" type="button" onClick={() => fileInputRef.current.click()}>Subir archivo</button>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileInput} />
            <button className="confirm-button" type="button" onClick={() => { setShowLinkInput(true); setNewResource({ ...newResource, type: 'link' }); }}>Adjuntar link</button>
          </div>
          {showLinkInput && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input name="url" type="text" placeholder="URL o enlace" value={newResource.url} onChange={handleResourceChange} style={{ flex: 1 }} />
              <input name="name" type="text" placeholder="Nombre (opcional)" value={newResource.name} onChange={handleResourceChange} style={{ width: 120 }} />
              <button className="confirm-button" onClick={() => { handleAddResource(); setShowLinkInput(false); }} type="button">Agregar</button>
              <button className="cancel-button" onClick={() => setShowLinkInput(false)} type="button">Cancelar</button>
            </div>
          )}
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
                  value={publicationDate || ""}
                  onChange={e => setPublicationDate(e.target.value)}
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
        <div className="modal-field">
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 12, marginTop: 16, textAlign: 'center' }}>Reclutadores asignados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
            <label style={{ fontWeight: 400, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span>Todos los reclutadores</span>
              <input
                type="radio"
                name="assignedMode"
                value="all"
                checked={assignedMode === "all"}
                onChange={() => setAssignedMode("all")}
                style={{ marginLeft: 8 }}
              />
            </label>
            <label style={{ fontWeight: 400, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span>Seleccionar reclutadores</span>
              <input
                type="radio"
                name="assignedMode"
                value="select"
                checked={assignedMode === "select"}
                onChange={() => setAssignedMode("select")}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>
          {assignedMode === "select" && (
            <ul style={{ paddingLeft: 18, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', width: '100%', maxHeight: 120, overflowY: 'auto' }}>
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
          <button className="confirm-button" onClick={handleSave} disabled={saving || !canSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default CourseEditModal;
