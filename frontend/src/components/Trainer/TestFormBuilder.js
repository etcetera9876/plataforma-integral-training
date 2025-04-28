import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../../config";
import "./TestFormBuilder.css";

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "select", label: "Selección" },
];

const TestFormBuilder = ({ forms, setForms, showPreviewPanel, setShowPreviewPanel, previewFormIdx, setPreviewFormIdx }) => {
  const navigate = useNavigate();
  const [bgImage, setBgImage] = useState(null);
  const [fields, setFields] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfImage, setPdfImage] = useState(null);
  const containerRef = useRef();
  const imageRef = useRef();

  // Drag & drop para campos sobre la imagen
  const [dragInfo, setDragInfo] = useState({ idx: null, offsetX: 0, offsetY: 0 });

  const handleFieldMouseDown = (formIdx, fieldIdx, e) => {
    const form = localForms[formIdx];
    if (!form || !form.fields || !form.fields[fieldIdx]) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setDragInfo({
      idx: fieldIdx,
      formIdx,
      offsetX: e.clientX - form.fields[fieldIdx].x - containerRect.left,
      offsetY: e.clientY - form.fields[fieldIdx].y - containerRect.top,
    });
    document.addEventListener("mousemove", handleFieldMouseMove);
    document.addEventListener("mouseup", handleFieldMouseUp);
  };

  const handleFieldMouseMove = (e) => {
    if (dragInfo.idx === null) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragInfo.offsetX;
    const y = e.clientY - containerRect.top - dragInfo.offsetY;
    setFields(fields => fields.map((f, i) => i === dragInfo.idx ? { ...f, x: Math.max(0, Math.min(x, 700 - 120)), y: Math.max(0, Math.min(y, 700 - 30)) } : f));
  };

  const handleFieldMouseUp = () => {
    setDragInfo({ idx: null, offsetX: 0, offsetY: 0 });
    document.removeEventListener("mousemove", handleFieldMouseMove);
    document.removeEventListener("mouseup", handleFieldMouseUp);
  };

  // Estado local para cada formulario
  const [localForms, setLocalForms] = useState(forms.length > 0 ? forms : [{ bgImage: null, fields: [] }]);

  // Solo sincroniza localForms cuando forms cambia externamente
  React.useEffect(() => {
    setLocalForms(forms);
    // eslint-disable-next-line
  }, [forms]);

  // Handler para actualizar ambos estados
  const handleLocalFormsChange = (newLocalForms) => {
    setLocalForms(newLocalForms);
    setForms(newLocalForms);
  };

  // Handlers para cada formulario (usan handleLocalFormsChange)
  const handleBgFileChange = (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    // Guardar el archivo en el estado local, sin subirlo ni convertirlo aún
    handleLocalFormsChange(localForms.map((f, i) => i === idx ? { ...f, bgImage: file } : f));
  };
  const handleAddField = (idx) => {
    handleLocalFormsChange(localForms.map((f, i) => i === idx ? { ...f, fields: [...(f.fields || []), { type: "text", label: "", x: 20, y: 20, width: 120, value: "" }] } : f));
  };
  const handleFieldChange = (idx, fidx, field, value) => {
    handleLocalFormsChange(localForms.map((f, i) => i === idx ? { ...f, fields: f.fields.map((fld, j) => j === fidx ? { ...fld, [field]: value } : fld) } : f));
  };
  const handleRemoveField = (idx, fidx) => {
    handleLocalFormsChange(localForms.map((f, i) => i === idx ? { ...f, fields: f.fields.filter((_, j) => j !== fidx) } : f));
  };
  const handleFieldPositionChange = (idx, fidx, axis, value) => {
    handleLocalFormsChange(localForms.map((f, i) => i === idx ? { ...f, fields: f.fields.map((fld, j) => j === fidx ? { ...fld, [axis]: Number(value) } : fld) } : f));
  };
  const handleAddForm = () => {
    handleLocalFormsChange([...localForms, { bgImage: null, fields: [] }]);
  };
  const handleRemoveForm = (idx) => {
    handleLocalFormsChange(localForms.filter((_, i) => i !== idx));
  };

  return (
    <>
      <h3>Formularios replicados</h3>
      {localForms.map((form, idx) => (
        <div key={idx} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <strong>Formulario #{idx + 1}</strong>
            <button
              type="button"
              title="Ver formulario"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#1976d2' }}
              onClick={() => { setPreviewFormIdx(idx); setShowPreviewPanel(true); }}
            >
              👁️
            </button>
            {localForms.length > 1 && (
              <button style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleRemoveForm(idx)}>Eliminar</button>
            )}
          </div>
          <label>Subir imagen o PDF de formulario:</label>
          <input type="file" accept="image/*,application/pdf" onChange={e => handleBgFileChange(e, idx)} style={{ marginBottom: 4 }} />
          {!form.bgImage && <div style={{ color: '#888', fontSize: 13 }}>(Sube una imagen o PDF de formulario para comenzar)</div>}
          {form.bgImage && (
            <div ref={containerRef} style={{ marginTop: 8, position: 'relative', width: 700, maxWidth: '100%' }}>
              <img
                ref={imageRef}
                src={
                  typeof form.bgImage === "string"
                    ? form.bgImage.startsWith("http")
                      ? form.bgImage
                      : `${API_URL}${form.bgImage.startsWith("/") ? "" : "/"}${form.bgImage}`
                    : URL.createObjectURL(form.bgImage)
                }
                alt="formulario"
                style={{ width: 700, maxWidth: '100%', borderRadius: 6, marginBottom: 8, display: 'block' }}
              />
              {form.fields && form.fields.map((field, fidx) => (
                <div
                  key={fidx}
                  onMouseDown={e => handleFieldMouseDown(idx, fidx, e)}
                  style={{
                    position: 'absolute',
                    left: field.x,
                    top: field.y,
                    width: field.width || 140,
                    minHeight: 38,
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    padding: 6,
                    cursor: 'move',
                    zIndex: 2,
                    userSelect: 'none',
                    boxShadow: dragInfo.idx === fidx ? '0 0 8px #e0b800' : undefined,
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 4 }}>
                    <select
                      value={field.type}
                      onChange={e => handleFieldChange(idx, fidx, 'type', e.target.value)}
                      style={{ fontSize: 13, flex: 1, minWidth: 0 }}
                    >
                      {FIELD_TYPES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => handleRemoveField(idx, fidx)} style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 0, marginLeft: 2, lineHeight: 1 }}>✕</button>
                  </div>
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => handleFieldChange(idx, fidx, 'label', e.target.value)}
                    placeholder="Etiqueta"
                    style={{ width: '100%', fontSize: 13, marginTop: 2, marginBottom: 2 }}
                  />
                  {field.type === 'select' && (
                    <input
                      type="text"
                      value={field.options || ''}
                      onChange={e => handleFieldChange(idx, fidx, 'options', e.target.value)}
                      placeholder="Opciones (separadas por coma)"
                      style={{ width: '100%', fontSize: 12, marginTop: 2 }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#444' }}>x:</span>
                    <input
                      type="number"
                      value={field.x}
                      onChange={e => handleFieldPositionChange(idx, fidx, 'x', e.target.value)}
                      style={{ width: 48, fontSize: 12, padding: '2px 4px' }}
                      min={0}
                      max={700 - (field.width || 140)}
                      title="X"
                    />
                    <span style={{ fontSize: 12, color: '#444' }}>y:</span>
                    <input
                      type="number"
                      value={field.y}
                      onChange={e => handleFieldPositionChange(idx, fidx, 'y', e.target.value)}
                      style={{ width: 48, fontSize: 12, padding: '2px 4px' }}
                      min={0}
                      max={700 - 38}
                      title="Y"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => handleAddField(idx)} style={{ marginTop: 6 }}>Agregar campo</button>
        </div>
      ))}
      <button type="button" style={{ marginTop: 16, background: '#e8f5e9', border: '1px solid #b2dfdb', borderRadius: 6, padding: '6px 18px', cursor: 'pointer' }} onClick={handleAddForm}>Agregar otro formulario replicado</button>
      {/* Modal de vista previa */}
      
      {showPreviewPanel && previewFormIdx !== null && localForms[previewFormIdx] && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowPreviewPanel(false)}>
          <div className="modal" style={{ minWidth: 700, maxWidth: 700, borderRadius: 16, boxShadow: '0 8px 32px #2224', padding: 24, position: 'relative', background: '#fff' }} onClick={e => e.stopPropagation()}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Vista previa del Formulario #{previewFormIdx + 1}</h4>
            <button style={{ position: 'absolute', top: 10, right: 10, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', zIndex: 11 }} onClick={() => setShowPreviewPanel(false)}>✕</button>
            {localForms[previewFormIdx].bgImage && (
              <div style={{ position: 'relative', width: 700, maxWidth: '100%', minHeight: 300, margin: '0 auto', maxHeight: '80vh', overflowY: 'auto' }}>
                <img
                  src={
                    typeof localForms[previewFormIdx].bgImage === "string"
                      ? localForms[previewFormIdx].bgImage.startsWith("http")
                        ? localForms[previewFormIdx].bgImage
                        : `${API_URL}${localForms[previewFormIdx].bgImage.startsWith("/") ? "" : "/"}${localForms[previewFormIdx].bgImage}`
                      : URL.createObjectURL(localForms[previewFormIdx].bgImage)
                  }
                  alt="formulario"
                  style={{ width: 700, maxWidth: '100%', borderRadius: 6, marginBottom: 8, display: 'block' }}
                />
                {localForms[previewFormIdx].fields && localForms[previewFormIdx].fields.map((field, fidx) => (
                  <div
                    key={fidx}
                    style={{
                      position: 'absolute',
                      left: field.x,
                      top: field.y,
                      width: field.width || 140,
                      minHeight: 38,
                      background: '#f9f9f9',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      padding: 6,
                      fontSize: 13,
                      pointerEvents: 'none',
                      opacity: 0.95
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 2 }}></div>
                    {field.type === 'select' ? (
                      <select disabled style={{ width: '100%' }}>
                        {(field.options || '').split(',').map((opt, i) => <option key={i}>{opt.trim()}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} disabled style={{ width: '100%' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TestFormBuilder;
