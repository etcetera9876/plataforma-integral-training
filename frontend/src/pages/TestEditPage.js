import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AlertMessage from "../components/Trainer/AlertMessage";
import TestQuestionsEditor from "../components/Trainer/TestQuestionsEditor";
import TestFormBuilder from "../components/Trainer/TestFormBuilder";
import API_URL from "../config";

const QUESTION_TYPES = [
  { value: "boolean", label: "Verdadero/Falso" },
  { value: "open", label: "Respuesta libre" },
  { value: "single", label: "Opción simple" },
  { value: "multiple", label: "Opciones múltiples" },
  { value: "form-dynamic", label: "Formulario dinámico" },
];

const DIFFICULTY_OPTIONS = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Medio" },
  { value: "dificil", label: "Difícil" },
];

const TestEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [test, setTest] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [block, setBlock] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [assignedTo, setAssignedTo] = useState([]);
  const [scheduled, setScheduled] = useState(false);
  const [publicationDate, setPublicationDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [branchId, setBranchId] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [forms, setForms] = useState([]);
  const [questionFilters, setQuestionFilters] = useState({
    difficulty: "",
    topic: "",
    counts: QUESTION_TYPES.reduce((acc, t) => ({ ...acc, [t.value]: 0 }), {})
  });
  const [topics, setTopics] = useState([]);
  const [maxRepeats, setMaxRepeats] = useState(1);
  const [multiPreview, setMultiPreview] = useState(null);
  const [multiMissing, setMultiMissing] = useState([]);
  const [multiLoading, setMultiLoading] = useState(false);
  const [userNamesMap, setUserNamesMap] = useState({});
  const [branchUsers, setBranchUsers] = useState([]);
  const [previewTest, setPreviewTest] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // --- MERGE AUTOMÁTICO DE CAMPOS PARA FORM-DYNAMIC EN MULTIPREVIEW ---
  // Guarda el banco de preguntas para mergear datos de imagen en form-dynamic
  const [questionBank, setQuestionBank] = useState([]);

  // Cargar banco de preguntas completo al inicio
  useEffect(() => {
    async function fetchQuestionBank() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuestionBank(res.data);
      } catch {}
    }
    fetchQuestionBank();
  }, []);

  // Merge automático de originalWidth/originalHeight en form-dynamic al recibir multiPreview
  useEffect(() => {
    if (!multiPreview || questionBank.length === 0) return;
    let changed = false;
    const merged = multiPreview.map(test => ({
      ...test,
      questions: test.questions.map(q => {
        if (q.type === 'form-dynamic' && Array.isArray(q.forms) && q.forms.length > 0) {
          const original = questionBank.find(oq => oq._id === q._id);
          if (original && Array.isArray(original.forms) && original.forms[0]) {
            const origForm = original.forms[0];
            const form = q.forms[0];
            // Solo mergea si faltan los campos
            if ((form.originalWidth == null || form.originalHeight == null) && (origForm.originalWidth && origForm.originalHeight)) {
              changed = true;
              return {
                ...q,
                forms: [{
                  ...form,
                  originalWidth: origForm.originalWidth,
                  originalHeight: origForm.originalHeight
                }]
              };
            }
          }
        }
        return q;
      })
    }));
    if (changed) setMultiPreview(merged);
  }, [multiPreview, questionBank]);

  // Cargar temas únicos del banco de preguntas
  useEffect(() => {
    async function fetchTopics() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allTopics = res.data.map(q => q.topic).filter(Boolean);
        setTopics([...new Set(allTopics)]);
      } catch {}
    }
    fetchTopics();
  }, []);

  // Cargar datos del test y bloques
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/assessments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;
        setTest(data);
        setName(data.name || "");
        setDescription(data.description || "");
        setBlock(data.components && data.components.length > 0 ? data.components[0].block || data.components[0]._id : "");
        setAssignedTo(data.assignedTo || []);
        setBranchId(data.branch || "");
        if (data.publicationDate || data.expirationDate) {
          setScheduled(true);
          setPublicationDate(data.publicationDate ? toLocalDatetimeString(data.publicationDate) : "");
          setExpirationDate(data.expirationDate ? toLocalDatetimeString(data.expirationDate) : "");
        } else {
          setScheduled(false);
        }
        if (data.questions) setQuestions(data.questions);
        // Si tienes formularios en el backend, también puedes cargarlos aquí
        // if (data.forms) setForms(data.forms);
        // Cargar bloques disponibles para la sucursal
        if (data.branch) {
          const blocksRes = await axios.get(`${API_URL}/api/assessments/blocks/${data.branch}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setBlocks(blocksRes.data);
        }
      } catch (err) {
        setError("Error al cargar el test");
        setShowAlert(true);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id]);

  // Cargar usuarios del branch si es All branch o si hay asignados específicos
  useEffect(() => {
    async function fetchBranchUsers() {
      if (!branchId) return;
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/users/branch/${branchId}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBranchUsers(res.data);
        // Crear un mapa de IDs a nombres para acceso rápido (asegurando que la clave sea string)
        const namesMap = {};
        res.data.forEach(u => { namesMap[String(u._id)] = u.name; });
        setUserNamesMap(namesMap);
      } catch {
        setBranchUsers([]);
        setUserNamesMap({});
      }
    }
    fetchBranchUsers();
  }, [branchId]);

  // Hook para asegurar que todos los userIds de multiPreview estén en userNamesMap
  useEffect(() => {
    if (!multiPreview) return;
    const missingIds = multiPreview
      .map(t => String(t.userId))
      .filter(id => !userNamesMap[id]);
    if (missingIds.length > 0) {
      axios.post(`${API_URL}/api/users/names`, { userIds: missingIds })
        .then(res => {
          setUserNamesMap(prev => ({ ...prev, ...res.data }));
        });
    }
  }, [multiPreview, userNamesMap]);

  function toLocalDatetimeString(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISO = new Date(date - tzOffset).toISOString().slice(0, 16);
    return localISO;
  }

  const handleSave = async (publish = false) => {
    try {
      setError("");
      setSuccess("");
      setShowAlert(false);
      const token = localStorage.getItem("token");
      const payload = {
        name,
        description,
        branch: branchId,
        components: [{ block, weight: 100 }], // Por ahora solo un bloque, puedes adaptar para varios
        assignedTo,
        publicationDate: scheduled && publicationDate ? new Date(publicationDate).toISOString() : null,
        expirationDate: scheduled && expirationDate ? new Date(expirationDate).toISOString() : null,
        // ...agrega aquí preguntas, etc. en siguientes pasos
      };
      await axios.put(`/api/assessments/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(publish ? "Test publicado con éxito" : "Borrador guardado");
      setShowAlert(true);
      // Opcional: redirigir después de guardar
      // navigate("/tests");
    } catch (err) {
      setError("Error al guardar el test");
      setShowAlert(true);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #e0e0e0", padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 500, minWidth: 700, margin: '0 auto' }}>
        {/* Título principal y botón regresar en la misma fila */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>Editar Test</h2>
          {/* Botón regresar que mantiene el branch seleccionado */}
          <button
            type="button"
            onClick={() => {
              // Si hay branchId y/o branchName, pásalos en el estado
              navigate('/courses-assessments', { state: { branchId, branchName: test?.branchName || location.state?.branchName } });
            }}
            style={{ fontSize: 16, padding: '6px 18px', borderRadius: 8, border: '1px solid #bbb', background: '#f5f5f5', cursor: 'pointer' }}
          >
            &larr; Regresar
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSave(false); }}>
          {/* Campo: Nombre del test */}
          <div style={{ marginBottom: 16 }}>
            <label>Nombre del test</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%" }} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: "100%" }} rows={3} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Bloque</label>
            <select value={block} onChange={e => setBlock(e.target.value)} style={{ width: "100%" }} required>
              <option value="">Selecciona un bloque</option>
              {blocks.map(b => (
                <option key={b._id} value={b._id}>{b.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Asignados a</label>
            <input type="text" value={assignedTo.join(", ")} readOnly style={{ width: "100%" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>
              <input type="checkbox" checked={scheduled} onChange={e => setScheduled(e.target.checked)} /> Programado
            </label>
            {scheduled && (
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div>
                  <label>Fecha de publicación</label>
                  <input type="datetime-local" value={publicationDate} onChange={e => setPublicationDate(e.target.value)} />
                </div>
                <div>
                  <label>Fecha de expiración</label>
                  <input type="datetime-local" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 32, padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1.5px solid #e0e0e0' }}>
            <h4 style={{ marginTop: 0 }}>Generar tests personalizados para cada usuario</h4>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label>Dificultad *</label><br />
                <select
                  value={questionFilters.difficulty}
                  onChange={e => setQuestionFilters(f => ({ ...f, difficulty: e.target.value }))}
                  required
                >
                  <option value="">Selecciona dificultad</option>
                  {DIFFICULTY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label>Tema (opcional)</label><br />
                <input
                  list="topic-list"
                  value={questionFilters.topic}
                  onChange={e => setQuestionFilters(f => ({ ...f, topic: e.target.value }))}
                  placeholder="Tema"
                />
                <datalist id="topic-list">
                  {topics.map((t, i) => <option key={i} value={t} />)}
                </datalist>
              </div>
              {QUESTION_TYPES.map(type => (
                <div key={type.value}>
                  <label>{type.label}</label><br />
                  <input
                    type="number"
                    min={0}
                    style={{ width: 60 }}
                    value={questionFilters.counts[type.value]}
                    onChange={e => setQuestionFilters(f => ({ ...f, counts: { ...f.counts, [type.value]: Number(e.target.value) } }))}
                  />
                </div>
              ))}
              <div style={{ marginLeft: 24, opacity: 0.85 }}>
                <label style={{ fontWeight: 500 }}>Repeticiones permitidas</label><br />
                <input
                  type="number"
                  min={1}
                  style={{ width: 60 }}
                  value={maxRepeats}
                  onChange={e => setMaxRepeats(Number(e.target.value))}
                />
              </div>
              <button
                type="button"
                style={{ height: 38, alignSelf: 'flex-end', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '0 18px', fontWeight: 600, cursor: 'pointer' }}
                disabled={multiLoading}
                onClick={async () => {
                  setMultiLoading(true);
                  setMultiPreview(null);
                  setMultiMissing([]);
                  try {
                    const token = localStorage.getItem("token");
                    const res = await axios.post(
                      `${API_URL}/api/assessments/generate-multi`,
                      {
                        name,
                        description,
                        branch: branchId,
                        assignedTo: assignedTo.length > 0 ? assignedTo : "All branch",
                        components: [{ block, weight: 100 }],
                        questionFilters,
                        maxRepeats
                      },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setMultiPreview(res.data.tests);
                    setMultiMissing(res.data.missing || []);
                  } catch (err) {
                    setError("Error al generar tests personalizados");
                    setShowAlert(true);
                  } finally {
                    setMultiLoading(false);
                  }
                }}
              >Generar tests personalizados</button>
            </div>
            {/* Previsualización */}
            {multiPreview && (
              <div style={{ marginTop: 18 }}>
                <h5>Previsualización de tests generados:</h5>
                {multiMissing.length > 0 && (
                  <div style={{ color: "#d32f2f", marginBottom: 8 }}>
                    {multiMissing.map((m, i) => {
                      const userName = userNamesMap[String(m.userId)] || m.userId;
                      const typeLabel = (QUESTION_TYPES.find(t => t.value === m.type)?.label) || m.type;
                      const diffLabel = (DIFFICULTY_OPTIONS.find(d => d.value === questionFilters.difficulty)?.label) || questionFilters.difficulty;
                      return (
                        <div key={i}>
                          Falta(n) {m.missing} pregunta(s) de tipo {typeLabel} con dificultad {diffLabel} para {userName}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 18, overflowX: 'auto', border: "1px solid #eee", borderRadius: 8, background: "#fafbfc", padding: 8, minHeight: 180 }}>
                  {multiPreview.map((test, idx) => {
                    const userName = userNamesMap[String(test.userId)] || test.userId;
                    // Obtener label del bloque
                    const blockLabel = (blocks.find(b => b._id === (test.block || test.components?.[0]?.block))?.label) || '';
                    return (
                      <div key={idx} style={{ minWidth: 260, maxWidth: 340, flex: '0 0 260px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #e0e0e0', padding: 14, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <b style={{ fontSize: 16 }}>Test para {userName}</b>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, marginLeft: 4 }}
                            title="Ver previsualización"
                            onClick={e => { e.stopPropagation(); e.preventDefault(); setPreviewTest({ ...test, blockLabel }); setShowPreview(true); }}
                          >
                            👁️
                          </button>
                        </div>
                        <ul style={{ marginTop: 6, paddingLeft: 18, width: '100%' }}>
                          {test.questions.map((q, i) => (
                            <li key={q._id || i} style={{ marginBottom: 10 }}>
                              <div style={{ fontWeight: 500 }}>{q.statement || q.text}</div>
                              {Array.isArray(q.options) && q.options.length > 0 && (
                                <ul style={{ margin: '4px 0 0 12px', padding: 0 }}>
                                  {q.options.map((opt, j) => (
                                    <li key={j} style={{ listStyle: 'circle', fontWeight: 400 }}>{opt}</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                {/* Modal de previsualización reutilizable */}
                {showPreview && previewTest && (
                  <TestPreviewModal test={previewTest} userName={userNamesMap[String(previewTest.userId)] || previewTest.userId} onClose={() => setShowPreview(false)} />
                )}
              </div>
            )}
          </div>
        </form>
        {/* Botón Guardar fijo */}
        <div style={{ position: 'sticky', bottom: 0, background: '#fff', zIndex: 10, padding: '16px 0 0 0', marginTop: 24, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee' }}>
          <button
            type="button"
            style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 32px', fontWeight: 600, fontSize: 17, boxShadow: '0 1px 4px #e0e0e0', cursor: 'pointer' }}
            onClick={() => handleSave(false)}
            disabled={loading}
          >
            Guardar
          </button>
        </div>
        <AlertMessage open={showAlert} message={error || success} type={error ? "error" : "success"} onClose={() => setShowAlert(false)} />
      </div>
    </div>
  );
};

// Mueve TestPreviewModal fuera del componente principal para cumplir con las reglas de hooks
function TestPreviewModal({ test, userName, onClose }) {
  const [answers, setAnswers] = React.useState({});
  const handleChange = (idx, value) => {
    setAnswers(a => ({ ...a, [idx]: value }));
  };
  const handleCheckbox = (idx, opt) => {
    setAnswers(a => {
      const prev = Array.isArray(a[idx]) ? a[idx] : [];
      if (prev.includes(opt)) {
        return { ...a, [idx]: prev.filter(o => o !== opt) };
      } else {
        return { ...a, [idx]: [...prev, opt] };
      }
    });
  };
  // Importar dinámicamente TestFormPreview para evitar ciclo de dependencias
  const TestFormPreview = require('../components/Trainer/TestFormPreview').default;
  if (!test) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #2224', padding: 32, minWidth: 340, maxWidth: 900, maxHeight: '90vh', overflowY: 'auto', position: 'relative', fontFamily: 'inherit' }} onClick={e => e.stopPropagation()}>
        <button style={{ position: 'absolute', top: 12, right: 16, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>✕</button>
        <h2 style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: 22, color: '#1976d2', letterSpacing: 0.2 }}>{test.name || 'Test sin nombre'}</h2>
        {test.description && <div style={{ marginBottom: 12, color: '#444', fontSize: 16, fontWeight: 400 }}>{test.description}</div>}
        {test.blockLabel && (
          <div style={{ marginBottom: 18, padding: '8px 0', borderBottom: '1.5px solid #e3e3e3', color: '#1976d2', fontWeight: 500, fontSize: 15 }}>
            {test.blockLabel}
          </div>
        )}
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {test.questions.map((q, idx) => (
            <li key={q._id || idx} style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>{q.statement || q.text}</div>
              {/* Verdadero/Falso: uno debajo del otro, radio a la izquierda */}
              {q.type === 'boolean' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', marginLeft: 8 }}>
                  {["Verdadero", "Falso"].map((opt, i) => (
                    <label key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontWeight: 400, gap: 0 }}>
                      <input type="radio" name={`q${idx}`} checked={answers[idx] === (opt === "Verdadero")} onChange={() => handleChange(idx, opt === "Verdadero")}/>
                      <span style={{ marginLeft: 6 }}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {/* Opción simple: opciones una debajo de otra, radio a la izquierda, alineadas como pregunta 1 */}
              {q.type === 'single' && Array.isArray(q.options) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginLeft: 0 }}>
                  {q.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontWeight: 400, gap: 0, marginBottom: 6, marginRight: 570 }}>
                      <input type="radio" name={`q${idx}`} checked={answers[idx] === opt} onChange={() => handleChange(idx, opt)} style={{ marginRight: 8 }} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {/* Opción múltiple: opciones una debajo de otra, checkbox a la izquierda, alineadas como pregunta 1 */}
              {q.type === 'multiple' && Array.isArray(q.options) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginLeft: 0 }}>
                  {q.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontWeight: 400, gap: 0, marginBottom: 6, marginRight: 570 }}>
                      <input type="checkbox" name={`q${idx}`} checked={Array.isArray(answers[idx]) && answers[idx].includes(opt)} onChange={() => handleCheckbox(idx, opt)} style={{ marginRight: 8 }} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {/* Abierta */}
              {q.type === 'open' && (
                <textarea style={{ width: '100%', minHeight: 48, borderRadius: 6, border: '1px solid #bbb', padding: 6 }} placeholder="Escribe tu respuesta..." value={answers[idx] || ''} onChange={e => handleChange(idx, e.target.value)} />
              )}
              {/* Formulario dinámico */}
              {q.type === 'form-dynamic' && Array.isArray(q.forms) && q.forms.length > 0 && (
                <div style={{ margin: '16px 0', border: '1.5px solid #e0e0e0', borderRadius: 10, background: '#f8f9fa', padding: 12 }}>
                  <TestFormPreview form={q.forms[0]} editable={true} />
                </div>
              )}
              {/* Si no hay tipo, solo muestra opciones si existen */}
              {!q.type && Array.isArray(q.options) && (
                <ul style={{ margin: '4px 0 0 12px', padding: 0 }}>
                  {q.options.map((opt, i) => (
                    <li key={i} style={{ listStyle: 'circle', fontWeight: 400 }}>{opt}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default TestEditPage;
