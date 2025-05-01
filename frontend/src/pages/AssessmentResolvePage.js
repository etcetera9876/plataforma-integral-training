import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

// Reutilizamos la lógica de TestPreviewModal pero como página completa
const AssessmentResolvePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});

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
        let subtest = null;
        if (Array.isArray(subtestsRes.data)) {
          subtest = subtestsRes.data.find(st => String(st.userId) === String(userId));
        }
        setTest(subtest || res.data);
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
    console.log('Enviando respuestas:', { userId, answers }); // <-- LOG para depuración
    try {
      const token = localStorage.getItem("token");
      await axios.post(`/api/assessments/${id}/submit`, {
        userId,
        answers,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/training-dashboard', { state: { successMessage: '¡Respuestas enviadas correctamente!' } });
    } catch (err) {
      alert('Error al enviar las respuestas.');
    }
  };

  // Importar dinámicamente TestFormPreview para evitar ciclo de dependencias
  let TestFormPreview = null;
  try {
    TestFormPreview = require('../components/Trainer/TestFormPreview').default;
  } catch {}

  if (loading) return <div>Cargando evaluación...</div>;
  if (error || !test) return <div>{error || "No se encontró la evaluación."}</div>;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #e0e0e0", padding: 32 }}>
      <h2 style={{ color: '#1976d2', fontWeight: 700 }}>{test.name}</h2>
      <p style={{ color: '#444' }}>{test.description}</p>
      <ol style={{ paddingLeft: 20 }}>
        {test.questions && test.questions.map((q, idx) => (
          <li key={q._id || idx} style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>{q.statement || q.text}</div>
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
            {q.type === 'single' && Array.isArray(q.options) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginLeft: 0 }}>
                {q.options.map((opt, i) => (
                  <label key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontWeight: 400, gap: 0, marginBottom: 6, marginRight: 800 }}>
                    <input type="radio" name={`q${idx}`} checked={answers[idx] === opt} onChange={() => handleChange(idx, opt)} style={{ marginRight: 8 }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === 'multiple' && Array.isArray(q.options) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginLeft: 0 }}>
                {q.options.map((opt, i) => (
                  <label key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontWeight: 400, gap: 0, marginBottom: 6, marginRight: 800 }}>
                    <input type="checkbox" name={`q${idx}`} checked={Array.isArray(answers[idx]) && answers[idx].includes(opt)} onChange={() => handleCheckbox(idx, opt)} style={{ marginRight: 8 }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === 'open' && (
              <textarea style={{ width: '100%', minHeight: 48, borderRadius: 6, border: '1px solid #bbb', padding: 6 }} placeholder="Escribe tu respuesta..." value={answers[idx] || ''} onChange={e => handleChange(idx, e.target.value)} />
            )}
            {q.type === 'form-dynamic' && Array.isArray(q.forms) && q.forms.length > 0 && TestFormPreview && (
              <div style={{ marginTop: 16, marginBottom: 16, border: '1.5px solid #e0e0e0', borderRadius: 10, background: '#f8f9fa', padding: 12 }}>
                <TestFormPreview form={q.forms[0]} editable={true} />
              </div>
            )}
            {!q.type && Array.isArray(q.options) && (
              <ul style={{ marginTop: 4, marginLeft: 12, padding: 0 }}>
                {q.options.map((opt, i) => (
                  <li key={i} style={{ listStyle: 'circle', fontWeight: 400 }}>{opt}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
        <button className="confirm-button" style={{ minWidth: 180, fontSize: 17, padding: '10px 32px' }} onClick={handleSubmit}>
          Enviar respuestas
        </button>
        <button className="cancel-button" style={{ marginLeft: 16 }} onClick={() => navigate(-1)}>Cancelar</button>
      </div>
    </div>
  );
};

export default AssessmentResolvePage;
