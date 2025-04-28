import React, { useState } from "react";

const TestFormPreview = ({ form }) => {
  const [fieldValues, setFieldValues] = useState(
    form && form.fields ? form.fields.map(() => "") : []
  );

  if (!form || !form.bgImage) return <div style={{ color: '#888' }}>(No hay formulario para vista previa)</div>;

  const handleChange = (idx, value) => {
    setFieldValues(fieldValues.map((v, i) => i === idx ? value : v));
  };

  // Ajuste: tamaño grande y superposición correcta
  const PREVIEW_WIDTH = 700;
  const PREVIEW_HEIGHT = 700;

  return (
    <div style={{ position: "relative", marginTop: 16, minHeight: PREVIEW_HEIGHT, width: PREVIEW_WIDTH, border: '1px solid #eee', borderRadius: 8, background: '#fafafa', maxWidth: '100%' }}>
      <img
        src={typeof form.bgImage === 'string' ? form.bgImage : URL.createObjectURL(form.bgImage)}
        alt="formulario"
        style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, objectFit: 'contain', display: 'block', borderRadius: 8 }}
      />
      {form.fields && form.fields.map((field, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            left: field.x,
            top: field.y,
            width: field.width || 140,
            minHeight: 38,
            zIndex: 2,
            background: "rgba(255,255,255,0.85)",
            border: '1px solid #bbb',
            borderRadius: 4,
            padding: 6,
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{field.label || '(Sin etiqueta)'}</div>
          <div>
            {field.type === "text" && (
              <input type="text" value={fieldValues[idx]} disabled placeholder="Texto" style={{ width: '100%' }} />
            )}
            {field.type === "number" && (
              <input type="number" value={fieldValues[idx]} disabled placeholder="Número" style={{ width: '100%' }} />
            )}
            {field.type === "date" && (
              <input type="date" value={fieldValues[idx]} disabled style={{ width: '100%' }} />
            )}
            {field.type === "select" && (
              <select value={fieldValues[idx]} disabled style={{ width: '100%' }}>
                <option value="">Selecciona</option>
                {(field.options || '').split(',').map((opt, i) => (
                  <option key={i} value={opt.trim()}>{opt.trim()}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TestFormPreview;
