import React, { useRef, useEffect, useState } from "react";

const TestFormPreview = ({ form }) => {
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

  // Usa el tamaño original si está disponible en el objeto form
  const originalWidth = form.originalWidth || imgSize.width || 100;
  const originalHeight = form.originalHeight || imgSize.height || 100;

  return (
    <div
      style={{
        position: "relative",
        marginTop: 16,
        width: originalWidth,
        height: originalHeight,
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
          width: originalWidth,
          height: originalHeight,
          display: 'block',
          borderRadius: 8,
        }}
      />
      {form.fields && originalWidth > 0 && originalHeight > 0 && form.fields.map((field, idx) => (
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
          }}
        >
          {/* Solo input, sin etiqueta */}
          {field.type === "text" && (
            <input type="text" placeholder="Texto" style={{ width: '100%' }} />
          )}
          {field.type === "number" && (
            <input type="number" placeholder="Número" style={{ width: '100%' }} />
          )}
          {field.type === "date" && (
            <input type="date" style={{ width: '100%' }} />
          )}
          {field.type === "select" && (
            <select style={{ width: '100%' }}>
              <option value="">Selecciona</option>
              {(field.options || '').split(',').map((opt, i) => (
                <option key={i} value={opt.trim()}>{opt.trim()}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
};

export default TestFormPreview;
