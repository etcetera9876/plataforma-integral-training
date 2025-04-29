import React, { useRef, useEffect, useState } from "react";

const TestFormPreview = ({ form }) => {
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef();

  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete) {
        setImgSize({ width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight });
      } else {
        imgRef.current.onload = () => {
          setImgSize({ width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight });
        };
      }
    }
  }, [form && form.bgImage]);

  if (!form || !form.bgImage) return <div style={{ color: '#888' }}>(No hay formulario para vista previa)</div>;

  const bgUrl = typeof form.bgImage === 'string' ? form.bgImage : URL.createObjectURL(form.bgImage);

  return (
    <div
      style={{
        position: "relative",
        marginTop: 16,
        width: imgSize.width || 100,
        height: imgSize.height || 100,
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
          width: imgSize.width || 'auto',
          height: imgSize.height || 'auto',
          display: 'block',
          borderRadius: 8,
        }}
      />
      {form.fields && imgSize.width > 0 && imgSize.height > 0 && form.fields.map((field, idx) => (
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
          {/* Solo input, sin etiqueta */}
          {field.type === "text" && (
            <input type="text" disabled placeholder="Texto" style={{ width: '100%' }} />
          )}
          {field.type === "number" && (
            <input type="number" disabled placeholder="Número" style={{ width: '100%' }} />
          )}
          {field.type === "date" && (
            <input type="date" disabled style={{ width: '100%' }} />
          )}
          {field.type === "select" && (
            <select disabled style={{ width: '100%' }}>
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
