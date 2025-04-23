import React, { useState } from "react";
import "./TrainerDashboard.css";
import AlertMessage from "./AlertMessage";

const AssessmentModal = ({ branchName, onClose, onSubmit, initialData = {}, branchId,components }) => {
  const [name, setName] = useState(initialData.name || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "info" });

  const [selectedComponent, setSelectedComponent] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        branch: branchId,
        components: [selectedComponent],
      };
  
      console.log("Datos enviados al backend:", payload); // <-- Agrega esto para depurar
      await onSubmit(payload);
      setSnackbar({ open: true, message: "Evaluación creada con éxito", type: "success" });
      onClose();
    } catch (error) {
      console.error("Error al crear la evaluación:", error); // <-- Agrega esto para depurar
      setSnackbar({ open: true, message: "Error al crear la evaluación", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{initialData._id ? "Editar evaluación" : "Nueva evaluación"}</h3>
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
            {components.length === 0 ? (
              <option value="">No hay bloques definidos</option>
            ) : (
              <>
                <option value="">Selecciona un bloque</option>
                {components.map(block => (
                  <option key={block._id} value={block._id}>
                    {block.label}
                  </option>
                ))}
              </>
            )}
          </select>
          </div>
          <div className="modal-actions">
            <button className="cancel-button" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="confirm-button" type="submit" disabled={saving || !name}>Guardar</button>
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

export default AssessmentModal;
