import React, { useRef } from "react";

// Uploader de archivos (imágenes, videos, etc.) para el test
const TestFilesUploader = ({ files, setFiles }) => {
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles([...files, ...newFiles]);
    fileInputRef.current.value = "";
  };

  const handleRemove = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  return (
    <section style={{ marginBottom: 32 }}>
      <h3>Archivos del test (imágenes, videos, etc.)</h3>
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ marginBottom: 12 }}
      />
      {files.length === 0 && <div style={{ color: '#888' }}>(No hay archivos subidos aún)</div>}
      <ul style={{ paddingLeft: 16 }}>
        {files.map((file, idx) => (
          <li key={idx} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{file.name || (typeof file === 'string' ? file : 'Archivo')}</span>
            <button type="button" onClick={() => handleRemove(idx)} style={{ color: '#d32f2f' }}>Eliminar</button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TestFilesUploader;
