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
                    return (
                      <div key={idx} style={{ minWidth: 260, maxWidth: 340, flex: '0 0 260px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #e0e0e0', padding: 14, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <b style={{ marginBottom: 8, fontSize: 16 }}>Test para {userName}</b>
                        <ul style={{ marginTop: 6, paddingLeft: 18, width: '100%' }}>
                          {test.questions.map(q => (
                            <li key={q._id} style={{ marginBottom: 10 }}>
                              <div style={{ fontWeight: 500 }}>{q.statement || q.text}</div>
                              {Array.isArray(q.options) && q.options.length > 0 && (
                                <ul style={{ margin: '4px 0 0 12px', padding: 0 }}>
                                  {q.options.map((opt, i) => (
                                    <li key={i} style={{ listStyle: 'circle', fontWeight: 400 }}>{opt}</li>
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

export default TestEditPage;
