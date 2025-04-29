import { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../../config";
import AlertMessage from "./AlertMessage";
import "./TrainerDashboard.css";

const BlocksConfigModal = ({ blocks = [], setBlocks, onClose, branchId }) => {
  const [localBlocks, setLocalBlocks] = useState(blocks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);

  // Cargar bloques actualizados al abrir el modal o tras cambios
  useEffect(() => {
    if (branchId) {
      const token = localStorage.getItem("token");
      axios.get(`${API_URL}/api/assessments/blocks/branch/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setLocalBlocks(res.data))
        .catch(() => setLocalBlocks([]));
    }
  }, [branchId, alertOpen]);

  const handleAddBlock = () => {
    setLocalBlocks([...localBlocks, { label: '', weight: 0 }]);
  };
  const handleRemoveBlock = async (idx) => {
    const block = localBlocks[idx];
    if (block._id) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_URL}/api/assessments/blocks/${block._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess("Bloque eliminado con éxito");
        setAlertOpen(true);
      } catch (err) {
        // Mostrar los tests donde se usa el bloque si el backend lo informa
        if (err.response && err.response.data && err.response.data.usedIn) {
          setError(
            `${err.response.data.message}\n\nUsado en: ${err.response.data.usedIn.join(', ')}`
          );
        } else if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError("Error al eliminar el bloque");
        }
        setAlertOpen(true);
        // Evita que axios imprima el error en consola
        return false;
      }
    }
    setLocalBlocks(localBlocks.filter((_, i) => i !== idx));
  };
  const handleBlockChange = (idx, field, value) => {
    setLocalBlocks(localBlocks.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };
  const totalWeight = localBlocks.reduce((sum, b) => sum + Number(b.weight || 0), 0);
  const canSave = totalWeight === 100 && localBlocks.every(b => b.label && b.weight > 0);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    // Validación extra antes de enviar
    for (const block of localBlocks) {
      if (!block.label || block.label.trim() === "") {
        setError("El nombre del bloque no puede estar vacío.");
        setAlertOpen(true);
        setSaving(false);
        return;
      }
      if (!block.weight || isNaN(Number(block.weight)) || Number(block.weight) <= 0) {
        setError("El peso debe ser un número mayor a 0.");
        setAlertOpen(true);
        setSaving(false);
        return;
      }
      if (!branchId) {
        setError("No se ha seleccionado una sucursal válida.");
        setAlertOpen(true);
        setSaving(false);
        return;
      }
    }
    let created = false;
    let updated = false;
    try {
      const blocksToSave = localBlocks.map(b => ({
        label: b.label,
        weight: Number(b.weight),
        branch: branchId,
        _id: b._id,
        type: b.type || (b.label ? b.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : undefined)
      }));
      const token = localStorage.getItem("token");
      const results = [];
      for (const block of blocksToSave) {
        if (block._id) {
          const res = await axios.put(
            `${API_URL}/api/assessments/blocks/${block._id}`,
            { label: block.label, weight: block.weight, type: block.type },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          results.push(res.data.updated);
          updated = true;
        } else {
          try {
            const res = await axios.post(
              `${API_URL}/api/assessments/blocks`,
              { label: block.label, weight: block.weight, branch: block.branch },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            results.push(res.data.block || res.data);
            created = true;
          } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
              setError(err.response.data.message);
            } else {
              setError("Error al guardar los bloques. Intenta de nuevo.");
            }
            setAlertOpen(true);
            setSaving(false);
            return;
          }
        }
      }
      setBlocks(results);
      if (created) {
        setSuccess("Bloque creado con éxito");
        setAlertOpen(true);
        setTimeout(() => {
          setAlertOpen(false);
          setSuccess("");
          onClose();
        }, 1500);
      } else if (updated) {
        setSuccess("Bloque(s) actualizado(s) con éxito");
        setAlertOpen(true);
        setTimeout(() => {
          setAlertOpen(false);
          setSuccess("");
          onClose();
        }, 1500);
      } else {
        onClose();
      }
    } catch (err) {
      console.error("[BlocksConfigModal] handleSave error:", err.response ? err.response.data : err); // LOG
      setError("Error al guardar los bloques. Intenta de nuevo.");
      setAlertOpen(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setAlertOpen(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleAlertClose = () => {
    setAlertOpen(false);
    setError("");
    setSuccess("");
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Configurar bloques de evaluación</h3>
        <div className="modal-field">
          <div style={{ marginBottom: 8, color: totalWeight !== 100 ? '#d32f2f' : '#388e3c', fontWeight: 500 }}>
            Peso total: {totalWeight}% {totalWeight !== 100 && '(debe sumar 100%)'}
          </div>
          <div style={{ display: 'flex', fontWeight: 600, marginBottom: 4, gap: 8, alignItems: 'center' }}>
            <span style={{ width: 180 }}>Nombre del bloque</span>
            <span style={{ width: 90 }}>Peso (%)</span>
            <button
              type="button"
              className="add-button"
              onClick={handleAddBlock}
              style={{ minWidth: 28, minHeight: 28, borderRadius: '50%', background: '#f1f3f4', color: '#1976d2', border: '1px solid #cfd8dc', fontSize: 20, marginLeft: 8, boxShadow: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Agregar bloque"
            >
              ＋
            </button>
          </div>
          {localBlocks.map((block, idx) => (
            <div key={idx} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 6, background: '#fafbfc', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="ej: Examen Teórico"
                value={block.label}
                onChange={e => handleBlockChange(idx, 'label', e.target.value)}
                style={{ width: 180 }}
              />
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Peso (%)"
                value={block.weight}
                onChange={e => handleBlockChange(idx, 'weight', e.target.value)}
                style={{ width: 90 }}
              />
              <button type="button" className="delete-button" onClick={() => handleRemoveBlock(idx)} title="Eliminar bloque" style={{ marginLeft: 8 }}>✕</button>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="cancel-button" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="confirm-button" type="button" onClick={handleSave} disabled={!canSave || saving}>Guardar</button>
        </div>
        <AlertMessage
          open={alertOpen}
          message={error || success}
          type={error ? 'error' : 'success'}
          onClose={handleAlertClose}
        />
      </div>
    </div>
  );
};

export default BlocksConfigModal;