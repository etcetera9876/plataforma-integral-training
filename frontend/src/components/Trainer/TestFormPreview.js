import React, { useState } from "react";

const TestFormPreview = ({ form }) => {
  const [fieldValues, setFieldValues] = useState(
    form && form.fields ? form.fields.map(() => "") : []
  );

  if (!form || !form.bgImage) return <div style={{ color: '#888' }}>(No hay formulario para vista previa)</div>;

  const handleChange = (idx, value) => {
    setFieldValues(fieldValues.map((v, i) => i === idx ? value : v));
  };

  return (
    <div style={{ position: "relative", marginTop: 16, minHeight: 300, border: '1px solid #eee', borderRadius: 8, background: '#fafafa', maxWidth: 320 }}>
      <img
        src={typeof form.bgImage === 'string' ? form.bgImage : URL.createObjectURL(form.bgImage)}
        alt="formulario"
        style={{ width: "100%", maxWidth: 320, display: 'block', borderRadius: 8 }}
      />
      {form.fields && form.fields.map((field, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            left: field.x,
            top: field.y,
            width: field.width,
            zIndex: 2,
            background: "rgba(255,255,255,0.8)",
            border: '1px solid #bbb',
            borderRadius: 4,
            padding: 2,
          }}
        >
          <label style={{ fontWeight: 500, fontSize: 13 }}>{field.label}</label>
          <div style={{ marginTop: 4 }}>
            {field.type === "text" && (
              <input
                type="text"
                value={fieldValues[idx]}
                onChange={e => handleChange(idx, e.target.value)}
                placeholder="Texto"
                style={{ width: '90%' }}
              />
            )}
            {field.type === "number" && (
              <input
                type="number"
                value={fieldValues[idx]}
                onChange={e => handleChange(idx, e.target.value)}
                placeholder="Número"
                style={{ width: '90%' }}
              />
            )}
            {field.type === "date" && (
              <input
                type="date"
                value={fieldValues[idx]}
                onChange={e => handleChange(idx, e.target.value)}
                style={{ width: '90%' }}
              />
            )}
            {field.type === "select" && (
              <select
                value={fieldValues[idx]}
                onChange={e => handleChange(idx, e.target.value)}
                style={{ width: '90%' }}
              >
                <option value="">Selecciona</option>
                <option value="Opción 1">Opción 1</option>
                <option value="Opción 2">Opción 2</option>
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TestFormPreview;
