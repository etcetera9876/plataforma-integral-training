import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AlertMessage from "../components/Trainer/AlertMessage";
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
  const [assignedMode, setAssignedMode] = useState("select");
  const [branchUsers, setBranchUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(
    Array.isArray(assignedTo) && assignedTo[0] !== "All recruiters"
      ? assignedTo
      : []
  );
  const [scheduled, setScheduled] = useState(false);
  const [publicationDate, setPublicationDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [branchId, setBranchId] = useState("");
  const [showAlert, setShowAlert] = useState(false);
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
  const [previewTest, setPreviewTest] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [courses, setCourses] = useState([]);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [timer, setTimer] = useState(""); // Nuevo: timer en minutos

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
        // Cargar bloques disponibles para la sucursal
        if (data.branch) {
          const blocksRes = await axios.get(`${API_URL}/api/assessments/blocks/${data.branch}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setBlocks(blocksRes.data);
        }
        // Cargar subtests guardados
        const subtestsRes = await axios.get(`${API_URL}/api/assessments/${id}/subtests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (Array.isArray(subtestsRes.data) && subtestsRes.data.length > 0) {
          setMultiPreview(subtestsRes.data);
          // Si todos los subtests tienen el mismo timer válido, precargarlo en el formulario
          const timers = subtestsRes.data.map(st => st.timer).filter(t => typeof t === 'number' && t >= 10);
          if (timers.length > 0 && timers.every(t => t === timers[0])) {
            setTimer(String(timers[0]));
          } else {
            setTimer("");
          }
        }
        // Precargar filtros si existen en el assessment
        if (data.filters) {
          setQuestionFilters(data.filters.questionFilters || questionFilters);
          setMaxRepeats(data.filters.maxRepeats || 1);
        }
        // Setear cursos relacionados
        if (data.relatedCourses) {
          setRelatedCourses(data.relatedCourses.map(String));
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

  // Obtener todos los cursos activos del branch para el multiselect
  useEffect(() => {
    if (!branchId) return;
    axios.get(`/api/courses/${branchId}`)
      .then(res => {
        const now = new Date();
        const activos = res.data.filter(c => !c.expirationDate || new Date(c.expirationDate) > now);
        setCourses(activos);
      })
      .catch(() => setCourses([]));
  }, [branchId]);

  // Sincroniza assignedMode y selectedUsers SOLO cuando assignedTo cambia por la carga del test
  useEffect(() => {
    if (Array.isArray(assignedTo) && assignedTo.length > 0) {
      if (assignedTo[0] === "All recruiters") {
        setAssignedMode("all");
        setSelectedUsers([]);
      } else {
        setAssignedMode("select");
        setSelectedUsers(assignedTo);
      }
    }
  }, [assignedTo]);

  // Handler para radio
  const handleAssignedModeChange = (mode) => {
    setAssignedMode(mode);
    if (mode === "all") {
      setAssignedTo(["All recruiters"]);
      setSelectedUsers([]);
      setBranchUsers([]);
    } else if (mode === "select" && branchId) {
      // Forzar recarga inmediata
      axios
        .get(`${API_URL}/api/users/branch/${branchId}/users`)
        .then((response) => setBranchUsers(response.data))
        .catch(() => setBranchUsers([]));
      setAssignedTo(selectedUsers);
    }
  };

  // Handler para checkboxes
  const handleUserCheckbox = (userId) => {
    setSelectedUsers((prev) => {
      let updated;
      if (prev.includes(userId)) {
        updated = prev.filter((id) => id !== userId);
      } else {
        updated = [...prev, userId];
      }
      setAssignedTo(updated);
      return updated;
    });
  };

  // Cargar usuarios del branch cuando assignedMode o branchId cambian
  useEffect(() => {
    
    if (assignedMode === "select" && branchId) {
      axios
        .get(`${API_URL}/api/users/branch/${branchId}/users`)
        .then((response) => {
        
          setBranchUsers(response.data);
        })
        .catch((err) => {
       
          setBranchUsers([]);
        });
    } else if (assignedMode !== "select") {
      setBranchUsers([]); // Limpia la lista si no está en modo select
    }
  }, [assignedMode, branchId]);

  // Hook para asegurar que todos los userIds de multiPreview estén en userNamesMap
  useEffect(() => {
    if (!multiPreview) return;
    const missingIds = multiPreview
      .map(t => String(t.userId))
      .filter(id => /^[a-f\d]{24}$/i.test(id) && !userNamesMap[id]);
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

  // Obtener el userId del localStorage (ajusta si tu app lo guarda diferente)
  const userId = localStorage.getItem('userId');
  const draftKey = `draft_test_${id}_${userId}`;
  const [hasDraft, setHasDraft] = useState(false);
  const [showingDraft, setShowingDraft] = useState(false);

  // Al cargar, verifica si hay borrador
  useEffect(() => {
    if (localStorage.getItem(draftKey)) {
      setHasDraft(true);
    } else {
      setHasDraft(false);
    }
  }, [draftKey]);

  // Guardar borrador
  const handleSaveDraft = () => {
    try {
      const draft = {
        name,
        description,
        block,
        assignedTo,
        scheduled,
        publicationDate,
        expirationDate,
        questionFilters,
        maxRepeats,
        multiPreview,
        multiMissing,
        relatedCourses
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setHasDraft(true);
      setShowingDraft(false);
      setSuccess('¡Borrador guardado con éxito!');
      setError('');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 2000);
    } catch (e) {
      setError('Error al guardar el borrador');
      setSuccess('');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 2000);
    }
  };

  // Mostrar borrador
  const handleShowDraft = () => {
    const draft = JSON.parse(localStorage.getItem(draftKey));
    if (draft) {
      setName(draft.name || "");
      setDescription(draft.description || "");
      setBlock(draft.block || "");
      setAssignedTo(draft.assignedTo || []);
      setScheduled(draft.scheduled || false);
      setPublicationDate(draft.publicationDate || "");
      setExpirationDate(draft.expirationDate || "");
      setQuestionFilters(draft.questionFilters || { difficulty: "", topic: "", counts: {} });
      setMaxRepeats(draft.maxRepeats || 1);
      setMultiPreview(draft.multiPreview || null);
      setMultiMissing(draft.multiMissing || []);
      setRelatedCourses(draft.relatedCourses || []);
      setShowingDraft(true);
    }
  };

  // Al guardar en BD, limpia el borrador y guarda subtests si existen
  const handleSave = async (publish = false) => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      const selectedBlock = blocks.find(b => b._id === block);
      const blockWeight = selectedBlock ? selectedBlock.weight : 100;
      const payload = {
        name,
        description,
        branch: branchId,
        components: [{ block, weight: blockWeight }],
        assignedTo,
        publicationDate: scheduled && publicationDate ? new Date(publicationDate).toISOString() : null,
        expirationDate: scheduled && expirationDate ? new Date(expirationDate).toISOString() : null,
        filters: { questionFilters, maxRepeats },
        relatedCourses
      };
      await axios.put(`/api/assessments/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Si hay subtests generados, guárdalos
      if (multiPreview && Array.isArray(multiPreview) && multiPreview.length > 0) {
        // Agregar timer a cada subtest si está definido
        const subtestsToSave = multiPreview.map(st => timer && Number(timer) >= 10 ? { ...st, timer: Number(timer) } : st);
        await axios.post(`/api/assessments/${id}/subtests`, { subtests: subtestsToSave }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setSuccess("");
      setError("");
      setShowAlert(false);
      setTimeout(() => {
        navigate('/courses-assessments', { state: { branchId, successMessage: "¡Test editado con éxito!" } });
      }, 800);
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setShowingDraft(false);
    } catch (err) {
      setError("Error al guardar el test");
      setSuccess("");
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 2000);
    }
  };

  // --- HABILITAR BOTÓN GENERAR TESTS PERSONALIZADOS SEGÚN CRITERIOS ---
  const allowedTypes = ["boolean", "open", "single", "multiple", "form-dynamic"];
  const hasAllowedType = allowedTypes.some(type => questionFilters.counts[type] > 0);
  // El botón solo se habilita si:
  // - NO hay subtests generados: se requiere dificultad y tipo
  // - SI hay subtests generados: siempre habilitado
  const noSubtests = !multiPreview || (Array.isArray(multiPreview) && multiPreview.length === 0);
  const canGenerateMulti =
    (!noSubtests && true) ||
    (noSubtests && questionFilters.difficulty && hasAllowedType);

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ maxWidth: 800, marginLeft: 'auto', marginRight: 'auto', marginTop: 40, marginBottom: 40, background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #e0e0e0", padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 500, minWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
        {/* Título principal y botón regresar en la misma fila */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Editar Test</h2>
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
            <select value={block} onChange={e => setBlock(e.target.value)} style={{ width: "100%", borderRadius: 8, padding: 8, border: '1.5px solid #e0e0e0' }} required>
              <option value="">Selecciona un bloque</option>
              {blocks.map(b => (
                <option key={b._id} value={b._id}>{b.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Curso relacionado (opcional)</label>
            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 6 }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {courses.map((c) => (
                  <li key={c._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ width: 28, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        value={c._id}
                        checked={relatedCourses.map(String).includes(String(c._id))}
                        onChange={e => {
                          const isChecked = e.target.checked;
                          setRelatedCourses(prev => {
                            const prevStr = prev.map(String);
                            if (isChecked) {
                              return prevStr.includes(String(c._id)) ? prevStr : [...prevStr, String(c._id)];
                            } else {
                              return prevStr.filter(id => id !== String(c._id));
                            }
                          });
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 15, textAlign: 'left', flex: 1, paddingLeft: 4 }}>{c.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Selector de asignados (igual a los modales de curso, alineado a la izquierda) */}
          <div className="modal-field" style={{ maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', width: '100%', marginTop: 25, marginBottom: 26 }}>
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 6, textAlign: 'center' }}>Asignados a</div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 24, justifyContent: 'center', marginBottom: 12 }}>
              <label style={{ fontWeight: 400, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Todos los reclutadores</span>
                <input
                  type="radio"
                  name="assignedMode"
                  value="all"
                  checked={assignedMode === "all"}
                  onChange={() => handleAssignedModeChange("all")}
                  style={{ marginLeft: 8, transform: 'scale(1.15)' }}
                />
              </label>
              <label style={{ fontWeight: 400, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Seleccionar reclutadores</span>
                <input
                  type="radio"
                  name="assignedMode"
                  value="select"
                  checked={assignedMode === "select"}
                  onChange={() => handleAssignedModeChange("select")}
                  style={{ marginLeft: 8, transform: 'scale(1.15)' }}
                />
              </label>
            </div>
            {assignedMode === "select" && (
              <div className="modal-field" style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #000', borderRadius: 10, padding: 10, background: '#fff', marginTop: 0, boxShadow: '0 2px 8px #e0e0e0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxWidth: 480 }}>
                  {branchUsers.map((user) => (
                    <li key={user._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, background: '#fafbfc', borderRadius: 8, boxShadow: '0 1px 4px #e0e0e0', padding: '10px 14px', border: '1px solid #e0e0e0', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 15 }}>{user.name}</span>
                      <input
                        type="checkbox"
                        value={user._id}
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleUserCheckbox(user._id)}
                        style={{ transform: 'scale(1.15)' }}
                      />
                    </li>
                  ))}
                </ul>
                {branchUsers.length === 0 && (
                  <div style={{ fontSize: 14, color: '#888', marginTop: 8, marginLeft: 8 }}>No hay reclutadores disponibles en esta sucursal.</div>
                )}
              </div>
            )}
          </div>
          <div style={{ marginTop: 32, marginBottom: 32, padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1.5px solid #e0e0e0' }}>
            <h4 style={{ marginTop: 0, fontSize: 22, color: '#1976d2', fontWeight: 600, letterSpacing: 0.2, marginBottom: 18 }}>
              Generar tests personalizados para cada usuario
            </h4>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label>Dificultad *</label><br />
                <select
                  value={questionFilters.difficulty}
                  onChange={e => setQuestionFilters(f => ({ ...f, difficulty: e.target.value }))}
                  required
                  style={{ width: '100%', borderRadius: 8, padding: 8, border: '1.5px solid #e0e0e0' }}
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
              <div style={{ minWidth: 120 }}>
                <label style={{ fontWeight: 500 }}>Timer (minutos, opcional)</label><br />
                <input
                  type="number"
                  min={10}
                  style={{ width: 80 }}
                  value={timer}
                  onChange={e => setTimer(e.target.value.replace(/^0+/, ''))}
                  placeholder="10"
                />
              </div>
              {QUESTION_TYPES.map(type => (
                <div key={type.value}>
                  <label>{type.label}</label><br />
                  <input
                    type="number"
                    min={0}
                    style={{ width: 60 }}
                    value={questionFilters.counts[type.value]}
                    onChange={e => setQuestionFilters(f => ({ ...f, counts: { ...f.counts, [type.value]: Number(e.target.value) } }))
                    }
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
            </div>
            <button
              type="button"
              className="confirm-button"
              style={{ minWidth: 220, fontSize: 17, padding: '5px 15px', marginTop: 25 }}
              disabled={multiLoading || !canGenerateMulti}
              onClick={async () => {
                if (timer && Number(timer) < 10) {
                  setError('El timer debe ser mayor o igual a 10 minutos');
                  setShowAlert(true);
                  return;
                }
                setMultiLoading(true);
                setMultiPreview(null);
                setMultiMissing([]);
                try {
                  const token = localStorage.getItem("token");
                  const selectedBlock = blocks.find(b => b._id === block);
                  const blockWeight = selectedBlock ? selectedBlock.weight : 100;
                  const res = await axios.post(
                    `${API_URL}/api/assessments/generate-multi`,
                    {
                      name,
                      description,
                      branch: branchId,
                      assignedTo: assignedTo.length > 0 ? assignedTo : "All branch",
                      components: [{ block, weight: blockWeight }],
                      questionFilters,
                      maxRepeats,
                      timer: timer && Number(timer) >= 10 ? Number(timer) : undefined
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
            >
              Generar tests personalizados
            </button>
            {/* Previsualización */}
            {multiPreview && (
              <div style={{ marginTop: 25 }}>
                <h4 style={{ fontSize: 22, color: '#1976d2', fontWeight: 600, letterSpacing: 0.2, marginBottom: 15 }}>
                  Previsualización de tests generados:
                </h4>
                {multiMissing.length > 0 && (
                  <div style={{ color: "#d32f2f", marginBottom: 8 }}>
                    {multiMissing.map((m, i) => {
                      const userName = userNamesMap[String(m.userId)] || (typeof m.userId === 'object' ? (m.userId.name || m.userId.email || m.userId._id) : undefined) || String(m.userId);
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
                    const userName =
                      userNamesMap[String(test.userId)] ||
                      (typeof test.userId === 'object' ? (test.userId.name || test.userId.email || test.userId._id) : undefined) ||
                      String(test.userId);
                    const blockLabel = (blocks.find(b => b._id === (test.block || test.components?.[0]?.block))?.label) || '';
                    return (
                      <div key={idx} style={{ minWidth: 260, maxWidth: 340, flex: '0 0 260px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #e0e0e0', padding: 14, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}
                        onClick={() => { setPreviewTest({ ...test, blockLabel }); setShowPreview(true); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <b style={{ fontSize: 16 }}>Test para {userName}</b>
                        </div>
                        {/* Miniatura de previsualización */}
                        <div style={{ width: '100%', maxWidth: 300, maxHeight: 120, overflow: 'hidden', borderRadius: 6, border: '1px solid #e0e0e0', background: '#f8f9fa', pointerEvents: 'none', opacity: 0.95 }}>
                          <TestPreviewThumbnail test={test} blockLabel={blockLabel} />
                        </div>
                        <div style={{ marginTop: 8, color: '#1976d2', fontSize: 13, fontWeight: 500, textAlign: 'center', width: '100%' }}>
                          Click para vista previa
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Modal de previsualización reutilizable */}
                {showPreview && previewTest && (
                  <TestPreviewModal
                    test={previewTest}
                    userName={
                      userNamesMap[String(previewTest.userId)] ||
                      (typeof previewTest.userId === 'object' ? (previewTest.userId.name || previewTest.userId.email || previewTest.userId._id) : undefined) ||
                      String(previewTest.userId)
                    }
                    onClose={() => setShowPreview(false)}
                  />
                )}
              </div>
            )}
          </div>
        </form>
        {/* Botón Guardar fijo y Guardar borrador/Mostrar borrador */}
        <div style={{ position: 'sticky', bottom: 0, background: '#fff', zIndex: 10, paddingTop: 16, marginTop: 24, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', gap: 12 }}>
          <button
            type="button"
            style={{ background: '#e0e0e0', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 500, fontSize: 15, marginRight: 8, opacity: 0.85, transition: 'all 0.15s', minWidth: 140, cursor: 'pointer' }}
            onClick={hasDraft && !showingDraft ? handleShowDraft : handleSaveDraft}
          >
            {hasDraft && !showingDraft ? 'Mostrar borrador' : 'Guardar borrador'}
          </button>
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
        <h2 style={{ marginTop: 0, marginRight: 0, marginBottom: 8, marginLeft: 0, fontWeight: 700, fontSize: 22, color: '#1976d2', letterSpacing: 0.2 }}>{test.name || 'Test sin nombre'}</h2>
        {test.description && <div style={{ marginBottom: 12, color: '#444', fontSize: 16, fontWeight: 400 }}>{test.description}</div>}
        {test.blockLabel && (
          <div style={{ marginTop: 8, marginBottom: 18, paddingTop: 8, paddingBottom: 8, borderBottom: '1.5px solid #e3e3e3', color: '#1976d2', fontWeight: 500, fontSize: 15 }}>
            {test.blockLabel}
          </div>
        )}
        <ol style={{ paddingLeft: 20, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 }}>
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
                    <label key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontWeight: 400, gap: 0, marginBottom: 6, marginRight: 670 }}>
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
                    <label key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontWeight: 400, gap: 0, marginBottom: 6, marginRight: 670 }}>
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
                <div style={{ marginTop: 16, marginBottom: 16, border: '1.5px solid #e0e0e0', borderRadius: 10, background: '#f8f9fa', padding: 12 }}>
                  <TestFormPreview form={q.forms[0]} editable={true} />
                </div>
              )}
              {/* Si no hay tipo, solo muestra opciones si existen */}
              {!q.type && Array.isArray(q.options) && (
                <ul style={{ marginTop: 4, marginRight: 0, marginBottom: 0, marginLeft: 12, padding: 0 }}>
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

// Miniatura de previsualización (versión reducida, no interactiva)
function TestPreviewThumbnail({ test, blockLabel }) {
  // Solo muestra el nombre, descripción y primer bloque de preguntas, sin interacción
  return (
    <div style={{ padding: 8, fontSize: 13 }}>
      <div style={{ fontWeight: 700, color: '#1976d2', marginBottom: 2, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{test.name || 'Test sin nombre'}</div>
      {test.description && <div style={{ color: '#444', fontSize: 12, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{test.description}</div>}
      {blockLabel && <div style={{ color: '#1976d2', fontWeight: 500, fontSize: 12, marginBottom: 2 }}>{blockLabel}</div>}
      <ol style={{ paddingLeft: 16, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, fontSize: 12, color: '#333', maxHeight: 60, overflow: 'hidden' }}>
        {test.questions.slice(0, 2).map((q, idx) => (
          <li key={q._id || idx} style={{ marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {q.statement || q.text}
          </li>
        ))}
        {test.questions.length > 2 && <li style={{ color: '#888' }}>...y más</li>}
      </ol>
    </div>
  );
}

// 1. ESTILO RECLUTADORES COMO BOTÓN ROJO
const recruiterButtonStyle = (selected) => ({
  background: selected ? '#d32f2f' : '#fff',
  color: selected ? '#fff' : '#d32f2f',
  border: '2px solid #d32f2f',
  borderRadius: 4,
  padding: '4px 12px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  marginRight: 8,
  marginBottom: 6,
  outline: selected ? '2px solid #b71c1c' : 'none',
  transition: 'all 0.15s',
  minWidth: 120,
  display: 'inline-block',
});

export default TestEditPage;
