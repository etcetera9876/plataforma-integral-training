import React, { useRef, useEffect, useState } from "react";

const TestFormPreview = ({ form, editable, value = {}, onChange }) => {
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef();
  const API_BASE = 'http://localhost:5000'; // Ajusta si tu backend usa otro puerto

  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete) {
        setImgSize({ width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight });
      } else {
        imgRef.current.onload = () => {
          if (!imgRef.current) return;
          setImgSize({ width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight });
        };
      }
    }
  }, [form && form.bgImage]);

  if (!form || !form.bgImage) return <div style={{ color: '#888' }}>(No hay formulario para vista previa)</div>;

  const bgUrl = typeof form.bgImage === 'string'
  ? (form.bgImage.startsWith('/uploads')
      ? `${API_BASE}${form.bgImage}`
      : form.bgImage.match(/^[a-zA-Z0-9\-_]+\.(png|jpg|jpeg|gif)$/i)
        ? `${API_BASE}/uploads/${form.bgImage}`
        : form.bgImage)
  : URL.createObjectURL(form.bgImage);

  // Forzar ancho a 700px y escalar altura proporcionalmente
  const fixedWidth = 700;
  const aspectRatio = (form.originalWidth && form.originalHeight)
    ? form.originalHeight / form.originalWidth
    : (imgSize.height && imgSize.width ? imgSize.height / imgSize.width : 1);
  const scaledHeight = Math.round(fixedWidth * aspectRatio);

  return (
    <div
      style={{
        position: "relative",
        marginTop: 16,
        width: fixedWidth,
        height: scaledHeight,
        border: '1px solid #eee',
        borderRadius: 8,
        overflow: 'auto',
        maxWidth: '100%',
        maxHeight: '90vh',
        background: '#fff',
      }}
    >
      <img
        ref={imgRef}
        src={bgUrl}
        alt="formulario"
        style={{
          width: fixedWidth,
          height: scaledHeight,
          display: 'block',
          borderRadius: 8,
        }}
      />
      {form.fields && fixedWidth > 0 && scaledHeight > 0 && form.fields.map((field, idx) => {
        // Ajustar ancho mínimo del contenedor para campos de fecha
        let fieldBoxWidth = field.width || 140;
        if (field.type === 'date' && fieldBoxWidth < 140) fieldBoxWidth = 140;
        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: field.x,
              top: field.y,
              width: fieldBoxWidth,
              minHeight: 38,
              zIndex: 2,
              background: "rgba(255,255,255,0.85)",
              border: '1px solid #bbb',
              borderRadius: 4,
              padding: 6,
              boxSizing: 'border-box',
            }}
          >
            {/* Solo input, sin etiqueta */}
            {field.type === "text" && (
              <input
                type="text"
                placeholder="Texto"
                style={{ width: '100%'}}
                value={value[field.label] || ''}
                disabled={!editable}
                onChange={editable && onChange ? e => onChange({ ...value, [field.label]: e.target.value }) : undefined}
              />
            )}
            {field.type === "number" && (
              <input
                type="number"
                placeholder="Número"
                style={{ width: '100%' }}
                value={value[field.label] || ''}
                disabled={!editable}
                onChange={editable && onChange ? e => onChange({ ...value, [field.label]: e.target.value }) : undefined}
              />
            )}
            {field.type === "date" && (
              <input
                type="date"
                style={{ width: 130, minWidth: 120 }}
                value={value[field.label] || ''}
                disabled={!editable}
                onChange={editable && onChange ? e => onChange({ ...value, [field.label]: e.target.value }) : undefined}
              />
            )}
            {field.type === "select" && (
              <select
                style={{ width: '100%' }}
                value={value[field.label] || ''}
                disabled={!editable}
                onChange={editable && onChange ? e => onChange({ ...value, [field.label]: e.target.value }) : undefined}
              >
                <option value="">Selecciona</option>
                {(field.options || '').split(',').map((opt, i) => (
                  <option key={i} value={opt.trim()}>{opt.trim()}</option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TestFormPreview;
