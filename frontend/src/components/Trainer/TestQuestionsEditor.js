import React, { useState, useRef } from "react";

const QUESTION_TYPES = [
  { value: "multiple", label: "Opción múltiple" },
  { value: "true-false", label: "Verdadero/Falso" },
  { value: "open", label: "Respuesta abierta" },
];

const defaultQuestion = () => ({
  type: "multiple",
  text: "",
  options: ["", ""],
  answer: "",
  file: null, // archivo adjunto
});

const TestQuestionsEditor = ({ questions, setQuestions }) => {
  const fileInputRefs = useRef([]);

  const handleAdd = () => setQuestions([...questions, defaultQuestion()]);
  const handleRemove = (idx) => setQuestions(questions.filter((_, i) => i !== idx));
  const handleChange = (idx, field, value) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };
  const handleOptionChange = (qIdx, oIdx, value) => {
    setQuestions(questions.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.map((opt, j) => j === oIdx ? value : opt) } : q
    ));
  };
  const handleAddOption = (qIdx) => {
    setQuestions(questions.map((q, i) =>
      i === qIdx ? { ...q, options: [...q.options, ""] } : q
    ));
  };
  const handleRemoveOption = (qIdx, oIdx) => {
    setQuestions(questions.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q
    ));
  };
  const handleFileChange = (idx, e) => {
    const file = e.target.files[0];
    setQuestions(questions.map((q, i) => i === idx ? { ...q, file } : q));
    if (fileInputRefs.current[idx]) fileInputRefs.current[idx].value = "";
  };
  const handleRemoveFile = (idx) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, file: null } : q));
  };

  return (
    <section style={{ marginBottom: 32 }}>
      <h3>Preguntas del test</h3>
      {questions.length === 0 && <div style={{ color: '#888' }}>(No hay preguntas aún)</div>}
      {questions.map((q, idx) => (
        <div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select value={q.type} onChange={e => handleChange(idx, 'type', e.target.value)}>
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="text"
              placeholder="Pregunta"
              value={q.text}
              onChange={e => handleChange(idx, 'text', e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => handleRemove(idx)} style={{ color: '#d32f2f' }}>Eliminar</button>
          </div>
          {q.type === "multiple" && (
            <div style={{ marginTop: 8 }}>
              <div>Opciones:</div>
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => handleOptionChange(idx, oIdx, e.target.value)}
                    placeholder={`Opción ${oIdx + 1}`}
                  />
                  <button type="button" onClick={() => handleRemoveOption(idx, oIdx)} disabled={q.options.length <= 2}>-</button>
                </div>
              ))}
              <button type="button" onClick={() => handleAddOption(idx)}>Agregar opción</button>
            </div>
          )}
          {q.type === "true-false" && (
            <div style={{ marginTop: 8 }}>
              <label>
                <input
                  type="radio"
                  name={`tf-${idx}`}
                  checked={q.answer === true}
                  onChange={() => handleChange(idx, 'answer', true)}
                /> Verdadero
              </label>
              <label style={{ marginLeft: 16 }}>
                <input
                  type="radio"
                  name={`tf-${idx}`}
                  checked={q.answer === false}
                  onChange={() => handleChange(idx, 'answer', false)}
                /> Falso
              </label>
            </div>
          )}
          {q.type === "open" && (
            <div style={{ marginTop: 8, color: '#888' }}>
              (Respuesta abierta)
            </div>
          )}
          {/* Adjuntar archivo a la pregunta */}
          <div style={{ marginTop: 10 }}>
            <label style={{ fontWeight: 500 }}>Archivo adjunto (opcional): </label>
            {q.file ? (
              <span style={{ marginLeft: 8 }}>
                {q.file.name || (typeof q.file === 'string' ? q.file : 'Archivo')}
                <button type="button" onClick={() => handleRemoveFile(idx)} style={{ marginLeft: 8, color: '#d32f2f' }}>Quitar</button>
                {q.file.type && q.file.type.startsWith('image') && (
                  <img src={URL.createObjectURL(q.file)} alt="preview" style={{ maxWidth: 80, maxHeight: 60, marginLeft: 8, borderRadius: 4 }} />
                )}
                {q.file.type && q.file.type.startsWith('video') && (
                  <video src={URL.createObjectURL(q.file)} controls style={{ maxWidth: 120, maxHeight: 80, marginLeft: 8, borderRadius: 4 }} />
                )}
              </span>
            ) : (
              <input
                type="file"
                accept="image/*,video/*"
                ref={el => fileInputRefs.current[idx] = el}
                onChange={e => handleFileChange(idx, e)}
                style={{ marginLeft: 8 }}
              />
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={handleAdd}>Agregar pregunta</button>
    </section>
  );
};

export default TestQuestionsEditor;
