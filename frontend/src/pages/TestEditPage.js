import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
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
          <button type="button" onClick={() => navigate(-1)} style={{ fontSize: 16, padding: '6px 18px', borderRadius: 8, border: '1px solid #bbb', background: '#f5f5f5', cursor: 'pointer' }}>&larr; Regresar</button>
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
       
       
          {/* Formulario para seleccionar preguntas del banco */}
          <div style={{ marginBottom: 32, padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1.5px solid #e0e0e0' }}>
            <h4 style={{ marginTop: 0 }}>Agregar preguntas desde banco</h4>
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
              <button
                type="button"
                style={{ height: 38, alignSelf: 'flex-end', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '0 18px', fontWeight: 600, cursor: 'pointer' }}
                onClick={async () => {
                  try {
                    if (!questionFilters.difficulty) {
                      setError("Selecciona una dificultad para buscar preguntas");
                      setShowAlert(true);
                      return;
                    }
                    const token = localStorage.getItem("token");
                    let newQuestions = [];
                    for (const type of QUESTION_TYPES) {
                      const count = questionFilters.counts[type.value];
                      if (count > 0) {
                        const res = await axios.get(`${API_URL}/api/questions/random`, {
                          params: {
                            type: type.value,
                            difficulty: questionFilters.difficulty,
                            topic: questionFilters.topic || undefined,
                            exclude: questions.map(q => q._id),
                            count
                          },
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        newQuestions = newQuestions.concat(res.data);
                      }
                    }
                    if (newQuestions.length === 0) {
                      setError("No se encontraron preguntas con los filtros seleccionados.");
                      setShowAlert(true);
                      return;
                    }
                    // Mapear preguntas del banco al formato esperado por TestQuestionsEditor
                    const mapQuestion = (q) => ({
                      ...q,
                      text: q.text || q.statement || "",
                      options: q.options || [],
                      answer: q.correctAnswer || q.answer || "",
                    });
                    setQuestions(prev => [
                      ...prev,
                      ...newQuestions.map(mapQuestion)
                    ]);
                    setSuccess("Preguntas agregadas desde el banco");
                    setShowAlert(true);
                  } catch (err) {
                    setError("Error al buscar preguntas en el banco");
                    setShowAlert(true);
                  }
                }}
              >Agregar preguntas</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
            <button type="button" onClick={() => handleSave(false)}>Guardar borrador</button>
            <button type="button" onClick={() => handleSave(true)}>Publicar</button>
          </div>
        </form>
        <AlertMessage open={showAlert} message={error || success} type={error ? "error" : "success"} onClose={() => setShowAlert(false)} />
      </div>
    </div>
  );
};

export default TestEditPage;
