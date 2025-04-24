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

const TestFormBuilder = ({ forms, setForms }) => {
  const navigate = useNavigate();
  const [bgImage, setBgImage] = useState(null);
  const [fields, setFields] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfImage, setPdfImage] = useState(null);
  const containerRef = useRef();
  const imageRef = useRef();

  // Drag & drop para campos sobre la imagen
  const [dragInfo, setDragInfo] = useState({ idx: null, offsetX: 0, offsetY: 0 });

  const handleFieldMouseDown = (idx, e) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    setDragInfo({
      idx,
      offsetX: e.clientX - fields[idx].x - containerRect.left,
      offsetY: e.clientY - fields[idx].y - containerRect.top,
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

  const handleBgFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setBgImage(file);
    } else if (file.type === "application/pdf") {
      // Subir el PDF al backend (a /uploads)
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`${API_URL}/api/assessments/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.filename) return alert("Error al subir PDF");
      setPdfFile(uploadData.filename);
      // Convertir el PDF a imagen
      const convertRes = await fetch(`${API_URL}/api/assessments/convert-pdf-to-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfFile: uploadData.filename }),
      });
      const convertData = await convertRes.json();
      if (!convertData.imagePath) return alert("Error al convertir PDF a imagen");
      setPdfImage(convertData.imagePath);
      setBgImage(convertData.imagePath); // Usar automáticamente la imagen como fondo
    } else {
      alert("Solo se permiten imágenes o PDF");
    }
  };

  const handleAddField = () => {
    setFields(fields => [
      ...fields,
      { type: "text", label: "", x: 20, y: 20, width: 120, value: "" }
    ]);
  };

  const handleFieldChange = (idx, field, value) => {
    setFields(fields.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  };

  const handleRemoveField = (idx) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const handleFieldPositionChange = (idx, axis, value) => {
    setFields(fields => fields.map((f, i) => i === idx ? { ...f, [axis]: Number(value) } : f));
  };

  // MULTI-FORMULARIO: Permitir varios formularios replicados
  const handleAddForm = () => {
    setForms(forms => [...forms, { bgImage: null, fields: [] }]);
  };
  const handleRemoveForm = (idx) => {
    setForms(forms => forms.filter((_, i) => i !== idx));
  };

  // Guardar el formulario en el estado global
  React.useEffect(() => {
    setForms([{ bgImage, fields }]);
  }, [bgImage, fields, setForms]);

  return (
    <>
      <h3>Formularios replicados</h3>
      {forms.map((form, idx) => (
        <div key={idx} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <strong>Formulario #{idx + 1}</strong>
            {forms.length > 1 && (
              <button style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleRemoveForm(idx)}>Eliminar</button>
            )}
          </div>
          <label>Subir imagen o PDF de formulario:</label>
          <input type="file" accept="image/*,application/pdf" onChange={e => handleBgFileChange(e, idx)} style={{ marginBottom: 4 }} />
          {!form.bgImage && <div style={{ color: '#888', fontSize: 13 }}>(Sube una imagen o PDF de formulario para comenzar)</div>}
          {/* Mostrar la imagen antes de los campos y con width 700px */}
          {form.bgImage && (
            <div ref={containerRef} style={{ marginTop: 8, position: 'relative', width: 700, maxWidth: '100%' }}>
              <img
                ref={imageRef}
                src={typeof form.bgImage === "string" ? form.bgImage : URL.createObjectURL(form.bgImage)}
                alt="formulario"
                style={{ width: 700, maxWidth: '100%', borderRadius: 6, marginBottom: 8, display: 'block' }}
              />
              {/* Renderizar campos editables sobre la imagen */}
              {fields.map((field, fidx) => (
                <div
                  key={fidx}
                  onMouseDown={e => handleFieldMouseDown(fidx, e)}
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
                      onChange={e => handleFieldChange(fidx, 'type', e.target.value)}
                      style={{ fontSize: 13, flex: 1, minWidth: 0 }}
                    >
                      {FIELD_TYPES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => handleRemoveField(fidx)} style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 0, marginLeft: 2, lineHeight: 1 }}>✕</button>
                  </div>
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => handleFieldChange(fidx, 'label', e.target.value)}
                    placeholder="Etiqueta"
                    style={{ width: '100%', fontSize: 13, marginTop: 2, marginBottom: 2 }}
                  />
                  {field.type === 'select' && (
                    <input
                      type="text"
                      value={field.options || ''}
                      onChange={e => handleFieldChange(fidx, 'options', e.target.value)}
                      placeholder="Opciones (separadas por coma)"
                      style={{ width: '100%', fontSize: 12, marginTop: 2 }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#444' }}>x:</span>
                    <input
                      type="number"
                      value={field.x}
                      onChange={e => handleFieldPositionChange(fidx, 'x', e.target.value)}
                      style={{ width: 48, fontSize: 12, padding: '2px 4px' }}
                      min={0}
                      max={700 - (field.width || 140)}
                      title="X"
                    />
                    <span style={{ fontSize: 12, color: '#444' }}>y:</span>
                    <input
                      type="number"
                      value={field.y}
                      onChange={e => handleFieldPositionChange(fidx, 'y', e.target.value)}
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
          {/* Mostrar los campos después de la imagen */}
          {/* ...el resto de la UI de edición de campos puede quedarse para edición textual/manual... */}
          <button type="button" onClick={() => handleAddField(idx)} style={{ marginTop: 6 }}>Agregar campo</button>
        </div>
      ))}
      <button type="button" style={{ marginTop: 16, background: '#e8f5e9', border: '1px solid #b2dfdb', borderRadius: 6, padding: '6px 18px', cursor: 'pointer' }} onClick={handleAddForm}>Agregar otro formulario replicado</button>
    </>
  );
};

export default TestFormBuilder;
