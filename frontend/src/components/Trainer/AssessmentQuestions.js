import React, { useState } from "react";

const defaultOption = () => "";

function getDefaultQuestion(type) {
  switch (type) {
    case "multiple-choice":
      return { type, text: "", options: ["", ""], answer: [] };
    case "single-choice":
      return { type, text: "", options: ["", ""], answer: "" };
    case "true-false":
      return { type, text: "", options: ["Verdadero", "Falso"], answer: "" };
    case "open":
      return { type, text: "", answer: "" };
    case "case":
      return { type, text: "", answer: "" };
    default:
      return { type, text: "", answer: "" };
  }
}

const AssessmentQuestions = ({ questions, setQuestions, evaluationType }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);

  const handleAdd = () => {
    setQuestions([...questions, getDefaultQuestion(evaluationType)]);
    setEditingIndex(questions.length);
    setEditQuestion(getDefaultQuestion(evaluationType));
  };

  const handleEdit = (idx) => {
    setEditingIndex(idx);
    setEditQuestion({ ...questions[idx] });
  };

  const handleSave = (idx) => {
    const updated = [...questions];
    updated[idx] = editQuestion;
    setQuestions(updated);
    setEditingIndex(null);
    setEditQuestion(null);
  };

  const handleDelete = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
    setEditingIndex(null);
    setEditQuestion(null);
  };

  const handleChange = (field, value) => {
    setEditQuestion((prev) => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (optIdx, value) => {
    setEditQuestion((prev) => {
      const newOptions = [...(prev.options || [])];
      newOptions[optIdx] = value;
      return { ...prev, options: newOptions };
    });
  };

  const handleAddOption = () => {
    setEditQuestion((prev) => ({ ...prev, options: [...(prev.options || []), ""] }));
  };

  const handleRemoveOption = (optIdx) => {
    setEditQuestion((prev) => {
      const newOptions = [...(prev.options || [])];
      newOptions.splice(optIdx, 1);
      return { ...prev, options: newOptions };
    });
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <ul style={{ paddingLeft: 18 }}>
        {questions.map((q, idx) => (
          <li key={idx} style={{ marginBottom: 10, border: "1px solid #ccc", borderRadius: 6, padding: 8, background: editingIndex === idx ? "#f7f7f7" : "#fff" }}>
            {editingIndex === idx ? (
              <div>
                <input
                  type="text"
                  placeholder="Pregunta"
                  value={editQuestion.text}
                  onChange={e => handleChange("text", e.target.value)}
                  style={{ width: "100%", marginBottom: 6 }}
                />
                {(evaluationType === "multiple-choice" || evaluationType === "single-choice") && (
                  <>
                    <div style={{ marginBottom: 6 }}>
                      Opciones:
                      {(editQuestion.options || []).map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => handleOptionChange(optIdx, e.target.value)}
                            style={{ flex: 1 }}
                          />
                          {editQuestion.options.length > 2 && (
                            <button type="button" onClick={() => handleRemoveOption(optIdx)} style={{ color: "red" }}>✕</button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={handleAddOption} style={{ marginTop: 4 }}>Agregar opción</button>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      Respuesta correcta:
                      {evaluationType === "multiple-choice" ? (
                        <>
                          {(editQuestion.options || []).map((opt, optIdx) => (
                            <label key={optIdx} style={{ marginRight: 8 }}>
                              <input
                                type="checkbox"
                                checked={Array.isArray(editQuestion.answer) && editQuestion.answer.includes(opt)}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  let newAnswer = Array.isArray(editQuestion.answer) ? [...editQuestion.answer] : [];
                                  if (checked) newAnswer.push(opt);
                                  else newAnswer = newAnswer.filter(a => a !== opt);
                                  handleChange("answer", newAnswer);
                                }}
                              />
                              {opt}
                            </label>
                          ))}
                        </>
                      ) : (
                        <select
                          value={editQuestion.answer || ""}
                          onChange={e => handleChange("answer", e.target.value)}
                        >
                          <option value="">Selecciona la respuesta</option>
                          {(editQuestion.options || []).map((opt, optIdx) => (
                            <option key={optIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}
                {evaluationType === "true-false" && (
                  <div style={{ marginBottom: 6 }}>
                    Respuesta correcta:
                    <select
                      value={editQuestion.answer || ""}
                      onChange={e => handleChange("answer", e.target.value)}
                    >
                      <option value="">Selecciona la respuesta</option>
                      <option value="Verdadero">Verdadero</option>
                      <option value="Falso">Falso</option>
                    </select>
                  </div>
                )}
                {(evaluationType === "open" || evaluationType === "case") && (
                  <div style={{ marginBottom: 6 }}>
                    <label>Respuesta esperada (opcional):</label>
                    <textarea
                      value={editQuestion.answer || ""}
                      onChange={e => handleChange("answer", e.target.value)}
                      rows={2}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => handleSave(idx)} style={{ color: "green" }}>Guardar</button>
            
                  <button type="button" onClick={() => handleDelete(idx)} style={{ color: "red" }}>Eliminar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <b>{q.text}</b>
                  {q.type === "multiple-choice" && <span style={{ color: '#888', marginLeft: 8 }}>[Opción múltiple]</span>}
                  {q.type === "single-choice" && <span style={{ color: '#888', marginLeft: 8 }}>[Opción única]</span>}
                  {q.type === "true-false" && <span style={{ color: '#888', marginLeft: 8 }}>[Verdadero/Falso]</span>}
                  {q.type === "open" && <span style={{ color: '#888', marginLeft: 8 }}>[Respuesta abierta]</span>}
                  {q.type === "case" && <span style={{ color: '#888', marginLeft: 8 }}>[Caso simulado]</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleEdit(idx)}>Editar</button>
                  <button type="button" onClick={() => handleDelete(idx)} style={{ color: "red" }}>Eliminar</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="confirm-button"
        onClick={handleAdd}
        style={{
          marginTop: 8,
          background: '#e53935',
          color: '#fff',
          fontWeight: 600,
          borderRadius: 8,
          padding: '7px 16px',
          fontSize: 15,
          border: 'none',
          boxShadow: '0 1px 4px #e0e0e0',
          transition: 'background 0.2s',
          cursor: 'pointer',
          width: 'auto',
          minWidth: 140,
          alignSelf: 'flex-end'
        }}
      >
        Agregar pregunta
      </button>
    </div>
  );
};

export default AssessmentQuestions;
