import React, { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate, UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";
import axios from "axios";
import { useDashboard } from '../components/DashboardContext';
import Modal from "../components/Trainer/Modal";

// Reutilizamos la lógica de TestPreviewModal pero como página completa
const AssessmentResolvePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateAssessmentSubmission } = useDashboard();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(null); // minutos restantes
  const [timerActive, setTimerActive] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerModalAccepted, setTimerModalAccepted] = useState(false);

  // Detectar si viene de cursos relacionados
  const [fromRelated, setFromRelated] = useState(false);
  useEffect(() => {
    // Puedes usar localStorage, query param, o sessionStorage
    // Aquí ejemplo con sessionStorage
    const flag = sessionStorage.getItem(`assessment_from_related_${id}`);
    setFromRelated(flag === '1');
  }, [id]);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        // Obtén el userId real del usuario logueado
        let userId = localStorage.getItem("userId");
        if (!userId) {
          const userObj = JSON.parse(localStorage.getItem("user"));
          userId = userObj?.id;
        }
        // Busca el assessment y su subtest para este usuario
        const res = await axios.get(`/api/assessments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Busca el subtest personalizado para este usuario (si existe)
        const subtestsRes = await axios.get(`/api/assessments/${id}/subtests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('userId localStorage:', userId);
        console.log('Subtests recibidos:', subtestsRes.data);
        let subtest = null;
        if (Array.isArray(subtestsRes.data)) {
          subtest = subtestsRes.data.find(st => {
            if (typeof st.userId === 'object' && st.userId !== null) {
              return String(st.userId._id) === String(userId);
            }
            return String(st.userId) === String(userId);
          });
          console.log('Subtest encontrado para userId:', subtest);
        }
        const testData = subtest || res.data;
        // LOG de preguntas y opciones para depuración
        if (testData && Array.isArray(testData.questions)) {
          testData.questions.forEach((q, idx) => {
            console.log(`Pregunta #${idx + 1}:`, q);
          });
        }
        setTest(testData);
        // Mostrar SIEMPRE el modal antes de iniciar el test
        setShowTimerModal(true);
        setTimerModalAccepted(false);
      } catch (err) {
        setError("No se pudo cargar la evaluación");
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, [id]);

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

  const handleSubmit = async () => {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      const userObj = JSON.parse(localStorage.getItem("user"));
      userId = userObj?.id;
    }
    // --- ADAPTACIÓN: Normalizar fechas en form-dynamic a MM/dd/yyyy antes de enviar ---
    let answersToSend = { ...answers };
    if (test && Array.isArray(test.questions)) {
      test.questions.forEach((q, idx) => {
        if (q.type === 'form-dynamic' && Array.isArray(q.forms) && q.forms.length > 0 && typeof answers[idx] === 'object' && answers[idx] !== null) {
          const formFields = q.forms[0].fields || [];
          const newObj = { ...answers[idx] };
          formFields.forEach(field => {
            if (field.type === 'date' && newObj[field.label]) {
              let val = newObj[field.label];
              // Si está en formato yyyy-mm-dd, convertir a MM/dd/yyyy
              if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                const [y, m, d] = val.split('-');
                val = `${m}/${d}/${y}`;
              } else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(val)) {
                // Si está en formato dd/mm/yyyy o dd-mm-yyyy, convertir a MM/dd/yyyy
                const [d, m, y] = val.split(/[\/\-]/);
                val = `${m}/${d}/${y}`;
              }
              newObj[field.label] = val;
            }
          });
          answersToSend[idx] = newObj;
        }
      });
    }
    console.log("Enviando respuestas:", { userId, assessmentId: id, answers: answersToSend });
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`/api/assessments/${id}/submit`, {
        userId,
        answers: answersToSend,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Respuesta del backend:", res.data);
      if (res.data && res.data.subtest && res.data.subtest.submittedAt) {
        updateAssessmentSubmission(id, res.data.subtest.submittedAt);
      }
      // Limpiar timer persistente al enviar
      userId = localStorage.getItem("userId");
      if (!userId) {
        const userObj = JSON.parse(localStorage.getItem("user"));
        userId = userObj?.id;
      }
      localStorage.removeItem(`assessment_timer_${id}_${userId}`);
      // Redirige directamente al dashboard, no muestra resultado aquí
      navigate('/training-dashboard', { state: { successMessage: '¡Respuestas enviadas correctamente!' } });
    } catch (err) {
      console.error("Error al enviar respuestas:", err);
      let msg = 'Error al enviar las respuestas.';
      if (err?.response?.data?.message) {
        msg += `\n${err.response.data.message}`;
      }
      if (err?.response?.data?.error) {
        msg += `\n${err.response.data.error}`;
      }
      // Mostrar detalles para depuración
      msg += `\nuserId: ${userId}`;
      msg += `\nassessmentId: ${id}`;
      alert(msg);
    }
  };

  // Temporizador regresivo
  useEffect(() => {
    if (!timerActive || timer == null) return;
    if (timer <= 0) {
      setTimerActive(false);
      // Limpiar timer persistente
      let userId = localStorage.getItem("userId");
      if (!userId) {
        const userObj = JSON.parse(localStorage.getItem("user"));
        userId = userObj?.id;
      }
      localStorage.removeItem(`assessment_timer_${id}_${userId}`);
      handleSubmit();
      return;
    }
    const interval = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  // Solo inicializar timer si el usuario ha aceptado el modal (independiente de showTimerModal)
  useEffect(() => {
    if (!test || !test.timer || !timerModalAccepted) return;
    const userId = localStorage.getItem("userId") || (JSON.parse(localStorage.getItem("user"))?.id);
    const timerKey = `assessment_timer_${id}_${userId}`;
    let startTimestamp = localStorage.getItem(timerKey);
    const now = Date.now();
    const durationMs = Number(test.timer) * 60 * 1000;
    if (!startTimestamp) {
      localStorage.setItem(timerKey, String(now));
      startTimestamp = String(now);
    }
    const elapsed = now - Number(startTimestamp);
    const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
    setTimer(remaining);
    setTimerActive(remaining > 0);
  }, [test, timerModalAccepted, id]);

  // --- NUEVO: Persistir aceptación del timer en localStorage ---
  const getTimerAcceptedKey = () => {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      const userObj = JSON.parse(localStorage.getItem("user"));
      userId = userObj?.id;
    }
    return `assessment_timer_accepted_${id}_${userId}`;
  };

  // Al dar click en Comenzar, guardar en localStorage
  const handleStartTimer = () => {
    localStorage.setItem(getTimerAcceptedKey(), "1");
    setTimerModalAccepted(true);
    setShowTimerModal(false);
  };

  // Al cargar, leer si ya aceptó el modal
  useEffect(() => {
    const accepted = localStorage.getItem(getTimerAcceptedKey());
    if (test) {
      setTimerModalAccepted(!!accepted);
      setShowTimerModal(!accepted);
    }
  }, [test, id]);

  // Importar dinámicamente TestFormPreview para evitar ciclo de dependencias
  let TestFormPreview = null;
  try {
    TestFormPreview = require('../components/Trainer/TestFormPreview').default;
  } catch {}

  // --- BLOQUEO beforeunload (cierre/recarga/retroceso navegador) ---
  const navigator = useContext(NavigationContext).navigator;
  const [blockNav, setBlockNav] = useState(false);
  const blockNavRef = useRef(false);

  useEffect(() => {
    if (!timerModalAccepted) return;
    const handleBeforeUnload = (e) => {
      if (blockNavRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timerModalAccepted]);

  // --- BLOQUEO navegación interna SPA (React Router v7+) ---
  useEffect(() => {
    if (!timerModalAccepted) return;
    setBlockNav(true);
    blockNavRef.current = true;
    let unblock = null;
    if (navigator && navigator.block) {
      unblock = navigator.block((tx) => {
        if (blockNavRef.current) {
          const confirm = window.confirm('¿Seguro que quieres salir? Si aceptas, el test se enviará vacío y afectará tu promedio. Si fue un apagón real, contacta a soporte.');
          if (confirm) {
            // Enviar test vacío
            enviarTestVacio();
            unblock();
            tx.retry();
          }
          // Si cancela, no navega
          return false;
        }
        return true;
      });
    }
    return () => {
      if (unblock) unblock();
      setBlockNav(false);
      blockNavRef.current = false;
    };
  }, [timerModalAccepted, navigator]);

  // Función para enviar test vacío (0%)
  const enviarTestVacio = async () => {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      const userObj = JSON.parse(localStorage.getItem("user"));
      userId = userObj?.id;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/api/assessments/${id}/submit`, {
        userId,
        answers: {}, // vacío
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Limpiar timer persistente
      localStorage.removeItem(`assessment_timer_${id}_${userId}`);
    } catch (err) {
      // Ignorar error, el test se considera enviado
    }
  };

  if (loading) return <div>Cargando evaluación...</div>;
  if (error || !test) return <div>{error || "No se encontró la evaluación."}</div>;

  if (showTimerModal && test && !timerModalAccepted) {
    // Modal genérico si NO hay timer válido, si hay timer muestra el mensaje original
    const hasTimer = test.timer && Number(test.timer) >= 10;
    return (
      <Modal isOpen={true} onClose={() => {
        setShowTimerModal(false);
        navigate('/training-dashboard');
      }}>
        <div style={{ padding: 32, maxWidth: 420, textAlign: 'center' }}>
          {hasTimer && <HourglassAnimation />}
          <h2 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 18 }}>
            {hasTimer ? 'Este test tiene tiempo limitado' : 'Antes de comenzar el test'}
          </h2>
          <div style={{ fontSize: 18, marginBottom: 18 }}>
            {hasTimer ? (
              <>
                Dispondrás de <b>{test.timer} minutos</b> para resolver el test.<br />
                El tiempo comenzará al presionar <b>Comenzar</b> y no se detendrá aunque recargues la página.<br />
                <span style={{ color: '#d32f2f', fontWeight: 600 }}>
                  Una vez que inicies el test, <u>no podrás cancelarlo ni salir</u> hasta que envíes tus respuestas o se acabe el tiempo.
                </span><br />
                Si el tiempo se agota, tus respuestas se enviarán automáticamente.
              </>
            ) : (
              <>
                Al iniciar el test, <b>no podrás salir ni cancelar</b> hasta que envíes tus respuestas.<br />
                ¿Deseas comenzar?
              </>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 24 }}>
            <button style={{ background: '#1976d2', color: '#fff', fontWeight: 600, fontSize: 17, border: 'none', borderRadius: 8, padding: '10px 32px', cursor: 'pointer' }}
              onClick={handleStartTimer}>
              Comenzar
            </button>
            {/* Solo mostrar Cancelar si NO viene de cursos relacionados */}
            {!fromRelated && (
              <button style={{ background: '#e0e0e0', color: '#444', fontWeight: 500, fontSize: 16, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer' }}
                onClick={() => {
                  setShowTimerModal(false);
                  navigate('/training-dashboard');
                }}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  // Render principal del test (incluye timer y preguntas)
  return (
    <div style={{ maxWidth: 900, margin: "40px auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #e0e0e0", padding: 32, textAlign: 'left' }}>
      <h2 style={{ color: '#1976d2', fontWeight: 700, textAlign: 'center' }}>{test.name}</h2>
      <p style={{ color: '#444', textAlign: 'center', marginBottom: 15 }}>{test.description}</p>
      {test.timer && Number(test.timer) >= 10 && timer != null && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 50 }}>
          <span style={{ fontSize: 22, fontWeight: 500, color: timer <= 60 ? '#d32f2f' : '#1976d2', marginRight: 12, display: 'flex', alignItems: 'center' }}>
            <HourglassAnimation />
            <span style={{ marginLeft: 10, fontSize: 20, fontWeight: 600, color: timer <= 60 ? '#d32f2f' : '#1976d2', letterSpacing: 1 }}>
              Tiempo restante:
            </span>
            <span style={{ marginLeft: 12, fontSize: 22, fontWeight: 700, color: timer <= 60 ? '#d32f2f' : '#1976d2' }}>
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
            </span>
          </span>
        </div>
      )}
      <ol style={{ paddingLeft: 24, listStylePosition: 'decimal' }}>
        {test.questions && test.questions.map((q, idx) => {
          // Renderizado explícito para cada tipo
          if ((q.type === 'single' || q.type === 'single-choice') && Array.isArray(q.options)) {
            return (
              <li key={q._id || idx} style={{ marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>{q.statement || q.text}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  {q.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 8, fontWeight: 400 }}>
                      <input
                        type="radio"
                        name={`q${idx}`}
                        checked={answers[idx] === opt}
                        onChange={() => handleChange(idx, opt)}
                        style={{ marginRight: 0 }}
                      />
                      <span style={{ fontWeight: 400 }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </li>
            );
          }
          if ((q.type === 'multiple' || q.type === 'multiple-choice') && Array.isArray(q.options)) {
            return (
              <li key={q._id || idx} style={{ marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>{q.statement || q.text}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  {q.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 8, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        name={`q${idx}`}
                        checked={Array.isArray(answers[idx]) && answers[idx].includes(opt)}
                        onChange={() => handleCheckbox(idx, opt)}
                        style={{ marginRight: 0 }}
                      />
                      <span style={{ fontWeight: 400 }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </li>
            );
          }
          if (q.type === 'boolean' && Array.isArray(q.options)) {
            return (
              <li key={q._id || idx} style={{ marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>{q.statement || q.text}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  {q.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 8, fontWeight: 400 }}>
                      <input
                        type="radio"
                        name={`q${idx}`}
                        checked={answers[idx] === (opt === "Verdadero")}
                        onChange={() => handleChange(idx, opt === "Verdadero")}
                        style={{ marginRight: 0 }}
                      />
                      <span style={{ fontWeight: 400 }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </li>
            );
          }
          if (q.type === 'open') {
            return (
              <li key={q._id || idx} style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>{q.statement || q.text}</div>
                <textarea style={{ width: '100%', minHeight: 48, borderRadius: 6, border: '1px solid #bbb', padding: 6 }} placeholder="Escribe tu respuesta..." value={answers[idx] || ''} onChange={e => handleChange(idx, e.target.value)} />
              </li>
            );
          }
          if (q.type === 'form-dynamic' && Array.isArray(q.forms) && q.forms.length > 0 && TestFormPreview) {
            return (
              <li key={q._id || idx} style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>{q.statement || q.text}</div>
                <div style={{ marginTop: 16, marginBottom: 16, border: '1.5px solid #e0e0e0', borderRadius: 10, background: '#f8f9fa', padding: 12 }}>
                  <TestFormPreview
                    form={q.forms[0]}
                    editable={true}
                    value={answers[idx] || {}}
                    onChange={obj => setAnswers(a => ({ ...a, [idx]: obj }))}
                  />
                </div>
              </li>
            );
          }
          // Si no se reconoce el tipo, mostrar advertencia
          return (
            <li key={q._id || idx} style={{ marginBottom: 24, color: 'red' }}>
              <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>{q.statement || q.text}</div>
              <div>Tipo de pregunta no soportado o sin opciones.</div>
            </li>
          );
        })}
      </ol>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
        <button className="confirm-button" style={{ minWidth: 180, fontSize: 17, padding: '10px 32px' }} onClick={handleSubmit}>
          Enviar respuestas
        </button>
      </div>
    </div>
  );
};

function HourglassAnimation() {
  // Simple animación CSS de reloj de arena
  return (
    <span style={{ display: 'inline-block', marginRight: 8, fontSize: 28, animation: 'hourglass-spin 1.2s linear infinite' }}>
      ⏳
      <style>{`
        @keyframes hourglass-spin {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(10deg); }
          100% { transform: rotate(-10deg); }
        }
      `}</style>
    </span>
  );
}

export default AssessmentResolvePage;
