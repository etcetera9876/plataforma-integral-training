import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import AlertMessage from './AlertMessage';
import axios from 'axios';
import API_URL from '../../config';
import './TrainerDashboard.css';
import pdfIcon from '../../assets/pdf-icon.png';
import jpgIcon from '../../assets/jpg-icon.png';
import pngIcon from '../../assets/png-icon.png';
import mp4Icon from '../../assets/mp4-icon.png';
import wordIcon from '../../assets/word-icon.png';
import excelIcon from '../../assets/excel-icon.png';
import ppIcon from '../../assets/pp-icon.png';
import TestFormBuilder from './TestFormBuilder';
import TestFormPreview from './TestFormPreview';

const API_BASE = 'http://localhost:5000';

const getAttachmentIcon = (type) => {
  if (!type) return null;
  if (type === 'pdf') return pdfIcon;
  if (type === 'image') return jpgIcon;
  if (type === 'video') return mp4Icon;
  if (type === 'word') return wordIcon;
  if (type === 'excel') return excelIcon;
  if (type === 'ppt') return ppIcon;
  return null;
};

const initialState = {
  statement: '',
  type: '',
  difficulty: '',
  topic: '',
  options: [''],
  correctAnswer: '',
  correctAnswerIA: '',
  attachment: null,
  attachmentType: '',
};

const typeOptions = [
  { value: 'multiple', label: 'Opciones múltiples' },
  { value: 'single', label: 'Opción simple' },
  { value: 'open', label: 'Respuesta abierta' },
  { value: 'boolean', label: 'Verdadero/Falso' },
  { value: 'form-dynamic', label: 'Formulario dinámico' },
];

const difficultyOptions = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Medio' },
  { value: 'dificil', label: 'Difícil' },
];

const QuestionBankModal = ({ onClose, onCreate, topics = [] }) => {
  const [form, setForm] = useState(initialState);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const fileInputRef = React.useRef();
  const [lockedMap, setLockedMap] = useState({});
  const [editIndex, setEditIndex] = useState(null);
  const [currentAttachment, setCurrentAttachment] = useState(null);
  const [forms, setForms] = useState([]);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [previewFormIdx, setPreviewFormIdx] = useState(null);
  // Estado para vista previa de formulario dinámico desde la tabla
  const [showDynamicFormPreview, setShowDynamicFormPreview] = useState(false);
  const [dynamicFormToPreview, setDynamicFormToPreview] = useState(null);

  // Editar pregunta: carga los datos en el formulario
  const handleEdit = (q, idx) => {
    setForm({
      statement: q.statement || '',
      type: q.type || '',
      difficulty: q.difficulty || '',
      topic: q.topic || '',
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options : [''],
      correctAnswer: q.correctAnswer || '',
      correctAnswerIA: q.correctAnswerIA || '',
      attachment: null,
      attachmentType: '',
    });
    setForms(q.forms || []);
    setCurrentAttachment(q.attachment && q.attachment.url ? q.attachment : null);
    setEditIndex(idx);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Limpia el formulario y los formularios replicados al cerrar el modal
  const handleClose = () => {
    setForm(initialState);
    setForms([]);
    setEditIndex(null);
    setCurrentAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setForm(initialState);
    setForms([]);
    setCurrentAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Eliminar pregunta
  const handleDelete = async (q) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/questions/${q._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ open: true, message: 'Pregunta eliminada', type: 'success' });
      // No usar toggle, solo recargar preguntas
      await fetchQuestions();
    } catch (err) {
      setSnackbar({ open: true, message: err?.response?.data?.message || 'No se pudo eliminar', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(res.data);
      try {
        const lockRes = await axios.post(`${API_URL}/api/questions/locked`, { ids: res.data.map(q => q._id) }, { headers: { Authorization: `Bearer ${token}` } });
        setLockedMap(lockRes.data);
      } catch {
        setLockedMap({});
      }
    } catch {
      setQuestions([]);
      setLockedMap({});
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line
  }, [loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (idx, value) => {
    const newOptions = [...form.options];
    newOptions[idx] = value;
    setForm((prev) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setForm((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (idx) => {
    const newOptions = form.options.filter((_, i) => i !== idx);
    setForm((prev) => ({ ...prev, options: newOptions }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let type = '';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type === 'application/pdf') type = 'pdf';
    else if (file.type.startsWith('video/')) type = 'video';
    else type = 'other';
    setForm((prev) => ({ ...prev, attachment: file, attachmentType: type }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.type || !form.difficulty || !form.topic) {
        setSnackbar({ open: true, message: 'Completa todos los campos obligatorios', type: 'error' });
        setLoading(false);
        return;
      }
      if ((form.type === 'multiple' || form.type === 'single') && form.options.some(opt => !opt)) {
        setSnackbar({ open: true, message: 'Completa todas las opciones', type: 'error' });
        setLoading(false);
        return;
      }
      if ((form.type === 'multiple' || form.type === 'single' || form.type === 'boolean') && !form.correctAnswer) {
        setSnackbar({ open: true, message: 'Selecciona la respuesta correcta', type: 'error' });
        setLoading(false);
        return;
      }
      if (form.type === 'open' && !form.correctAnswerIA) {
        setSnackbar({ open: true, message: 'Completa la respuesta correcta (IA)', type: 'error' });
        setLoading(false);
        return;
      }
      let processedForms = forms;
      if (form.type === 'form-dynamic' && forms.length > 0) {
        processedForms = await Promise.all(forms.map(async (f) => {
          if (f.bgImage && typeof f.bgImage !== 'string') {
            // Si es PDF, primero subir y luego convertir a imagen
            if (f.bgImage.type === 'application/pdf') {
              const formData = new FormData();
              formData.append('file', f.bgImage);
              const uploadRes = await fetch(`${API_URL}/api/assessments/upload`, {
                method: 'POST',
                body: formData,
              });
              const uploadData = await uploadRes.json();
              if (!uploadData.filename) throw new Error('Error al subir PDF');
              // Convertir PDF a imagen
              const convertRes = await fetch(`${API_URL}/api/assessments/convert-pdf-to-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfFile: uploadData.filename }),
              });
              const convertData = await convertRes.json();
              if (!convertData.imagePath) throw new Error('Error al convertir PDF a imagen');
              // Siempre guardar la ruta de la imagen generada
              return { ...f, bgImage: convertData.imagePath };
            } else {
              // Si es imagen, subirla y guardar la ruta
              const formData = new FormData();
              formData.append('file', f.bgImage);
              const uploadRes = await fetch(`${API_URL}/api/assessments/upload`, {
                method: 'POST',
                body: formData,
              });
              const uploadData = await uploadRes.json();
              if (!uploadData.filename) throw new Error('Error al subir imagen');
              // Siempre guardar la ruta de la imagen generada
              return { ...f, bgImage: uploadData.filename };
            }
          } else if (f.bgImage && typeof f.bgImage === 'string') {
            return { ...f, bgImage: f.bgImage };
          } else {
            return { ...f, bgImage: null };
          }
        }));
        // Log de depuración: mostrar rutas finales de bgImage
        processedForms.forEach((f, idx) => {
          // console.log(`[QuestionBankModal] Formulario #${idx + 1} bgImage final:`, f.bgImage);
        });
        // ACTUALIZA EL ESTADO PARA QUE EL RENDER USE LA RUTA DE LA IMAGEN Y NO EL FILE
        setForms(processedForms);
      }
      // Log para depuración
      if (form.type === 'form-dynamic') {
        // console.log('Enviando forms al backend:', processedForms);
      }
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'options') data.append('options', JSON.stringify(value));
        else if (key === 'attachment' && value) data.append('attachment', value);
        else if (key === 'correctAnswerIA' && form.type !== 'open') return;
        else if (value) data.append(key, value);
      });
      if (form.type === 'form-dynamic') {
        data.append('forms', JSON.stringify(processedForms));
      }
      let response;
      if (editIndex !== null && questions[editIndex]?._id) {
        // Edición
        const id = questions[editIndex]._id;
        const token = localStorage.getItem('token');
        response = await axios.put(`${API_URL}/api/questions/${id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 200) {
          setSnackbar({ open: true, message: 'Pregunta actualizada', type: 'success' });
          setEditIndex(null);
          setCurrentAttachment(null);
          setForm(initialState);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } else {
        // Creación
        try {
          response = await onCreate(data);
          if (response && response.status && (response.status === 200 || response.status === 201)) {
            setSnackbar({ open: true, message: 'Pregunta creada con éxito', type: 'success' });
            setForm(initialState);
            setForms([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
          } else {
            setSnackbar({ open: true, message: 'Error al guardar la pregunta', type: 'error' });
          }
        } catch (err) {
          setSnackbar({ open: true, message: err?.response?.data?.message || 'Error al guardar la pregunta', type: 'error' });
        }
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.response?.data?.message || 'Error al guardar la pregunta', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 700, maxWidth: 1200, borderRadius: 14, boxShadow: '0 8px 32px rgba(60,60,60,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ textAlign: 'center', fontWeight: 700, fontSize: 24, margin: '10px 0 18px 0', letterSpacing: 0.5 }}>Crear pregunta en banco</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="modal-field">
            <label>Tipo de pregunta *</label>
            <select name="type" value={form.type} onChange={e => { handleChange(e); if(e.target.value !== 'form-dynamic') setForms([]); }} required style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }}>
              <option value="">Selecciona tipo</option>
              {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="modal-field">
            <label>Enunciado *</label>
            <textarea name="statement" value={form.statement} onChange={handleChange} required style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }} />
          </div>
          <div className="modal-field">
            <label>Dificultad *</label>
            <select name="difficulty" value={form.difficulty} onChange={handleChange} required style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }}>
              <option value="">Selecciona dificultad</option>
              {difficultyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="modal-field">
            <label>Tema *</label>
            <input name="topic" value={form.topic} onChange={handleChange} required list="topic-list" style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }} />
            <datalist id="topic-list">
              {topics.map((t, i) => <option key={i} value={t} />)}
            </datalist>
          </div>
          {/* Mostrar formulario replicado aquí si es form-dynamic */}
          {form.type === 'form-dynamic' && (
            <div style={{ margin: '18px 0', background: '#f8f9fa', borderRadius: 10, padding: 12, border: '1.5px solid #e0e0e0', position: 'relative' }}>
              <TestFormBuilder forms={forms} setForms={setForms} showPreviewPanel={showFormPreview} setShowPreviewPanel={setShowFormPreview} previewFormIdx={previewFormIdx} setPreviewFormIdx={setPreviewFormIdx} />
              {showFormPreview && forms[previewFormIdx] && (
                <div style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 8px 32px #2224',
                  padding: 24,
                  minWidth: 320,
                  maxWidth: 700,
                  width: '90vw',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  margin: '24px auto',
                  position: 'relative',
                  zIndex: 10,
                }}>
                  <button style={{ position: 'absolute', top: 10, right: 10, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', zIndex: 11 }} onClick={() => setShowFormPreview(false)}>✕</button>
                  <h4 style={{ marginTop: 0, marginBottom: 12 }}>Vista previa del Formulario #{previewFormIdx + 1}</h4>
                  {typeof TestFormPreview !== 'undefined' ? (
                    <TestFormPreview form={forms[previewFormIdx]} />
                  ) : (
                    <>
                      {forms[previewFormIdx].bgImage && (
                        <img src={typeof forms[previewFormIdx].bgImage === 'string' ? forms[previewFormIdx].bgImage : URL.createObjectURL(forms[previewFormIdx].bgImage)} alt="formulario" style={{ width: '100%', maxWidth: 700, borderRadius: 6, marginBottom: 12, display: 'block' }} />
                      )}
                      <div style={{ position: 'relative', width: '100%', maxWidth: 700 }}>
                        {forms[previewFormIdx].fields && forms[previewFormIdx].fields.map((field, fidx) => (
                          <div key={fidx} style={{ position: 'absolute', left: field.x, top: field.y, width: field.width || 140, minHeight: 38, background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 4, padding: 6, fontSize: 13, pointerEvents: 'none', opacity: 0.95 }}>
                            <div style={{ fontWeight: 500, marginBottom: 2 }}>{field.label || '(Sin etiqueta)'}</div>
                            {field.type === 'select' ? (
                              <select disabled style={{ width: '100%' }}>
                                {(field.options || '').split(',').map((opt, i) => <option key={i}>{opt.trim()}</option>)}
                              </select>
                            ) : (
                              <input type={field.type} disabled style={{ width: '100%' }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {(form.type === 'multiple' || form.type === 'single') && (
            <div className="modal-field">
              <label>Opciones</label>
              {form.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    required
                    style={{ flex: 1, borderRadius: 6, border: '1px solid #ccc', padding: 6 }}
                  />
                  {form.options.length > 1 && (
                    <button type="button" onClick={() => removeOption(idx)} style={{ color: 'red', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOption} style={{ marginTop: 4, background: '#e3f2fd', color: '#1976d2', border: 'none', borderRadius: 6, padding: '6px 18px', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Agregar opción</button>
            </div>
          )}
          {(form.type === 'multiple' || form.type === 'single') && (
            <div className="modal-field">
              <label>Respuesta correcta *</label>
              <select
                name="correctAnswer"
                value={form.correctAnswer}
                onChange={handleChange}
                required
                style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }}
              >
                <option value="">Selecciona la respuesta correcta</option>
                {form.options.map((opt, idx) => (
                  <option key={idx} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
          {form.type === 'boolean' && (
            <div className="modal-field">
              <label>Respuesta correcta *</label>
              <select
                name="correctAnswer"
                value={form.correctAnswer}
                onChange={handleChange}
                required
                style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }}
              >
                <option value="">Selecciona la respuesta</option>
                <option value="true">Verdadero</option>
                <option value="false">Falso</option>
              </select>
            </div>
          )}
          {form.type === 'open' && (
            <div className="modal-field">
              <label>Respuesta correcta (IA) *</label>
              <textarea name="correctAnswerIA" value={form.correctAnswerIA} onChange={handleChange} required style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 15 }} placeholder="Escribe aquí la respuesta ideal para IA" />
            </div>
          )}
          {/* Ocultar adjunto si es form-dynamic */}
          {form.type !== 'form-dynamic' && (
            <div className="modal-field">
              <label>Adjuntar PDF, imagen o video</label>
              {editIndex !== null && currentAttachment ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#555' }}>Archivo actual:</span>
                  <a href={currentAttachment.url.startsWith('/uploads') ? `${API_BASE}${currentAttachment.url}` : currentAttachment.url} target="_blank" rel="noopener noreferrer">
                    <img src={getAttachmentIcon(currentAttachment.type)} alt="adjunto" style={{ width: 28, height: 28, verticalAlign: 'middle' }} />
                    <span style={{ marginLeft: 6 }}>{currentAttachment.name || 'Ver archivo'}</span>
                  </a>
                </div>
              ) : null}
              <input type="file" accept=".pdf,image/*,video/*" onChange={handleFileChange} ref={fileInputRef} />
            </div>
          )}
          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button className="cancel-button" type="button" onClick={handleCancelEdit} disabled={loading}>Cancelar</button>
            <button className="confirm-button" type="submit" disabled={loading}>{editIndex !== null ? (loading ? 'Guardando...' : 'Guardar') : (loading ? 'Creando...' : 'Crear')}</button>
          </div>
        </form>
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 8, fontWeight: 600 }}>Preguntas existentes</h4>
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, background: '#fafbfc', padding: 8 }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Enunciado</th>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Tipo</th>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Dificultad</th>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Tema</th>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Opciones</th>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Respuesta(s) correcta(s)</th>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Adjunto</th>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Estado</th>
                  <th style={{ padding: '10px 16px', borderBottom: '1px solid #ddd' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {questions.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#888' }}>(No hay preguntas aún)</td></tr>
                ) : (
                  questions.map((q, idx) => {
                    const isLocked = lockedMap[q._id];
                    let typeLabel = q.type === 'boolean' ? 'Verdadero/Falso' : (typeOptions.find(t => t.value === q.type)?.label || q.type);
                    let adjIcon = q.attachment && q.attachment.type ? getAttachmentIcon(q.attachment.type) : null;
                    return (
                      <tr key={q._id || idx}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.statement}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee' }}>{typeLabel}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee' }}>{q.difficulty}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee' }}>{q.topic}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.type === 'form-dynamic' ? '-' : (Array.isArray(q.options) && q.options.length > 0 ? q.options.join(', ') : '-')}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.type === 'open' ? '-' : (Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer || '-')}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                          {q.type === 'form-dynamic' && q.forms && q.forms.length > 0 ? (
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                              title="Vista previa de formulario dinámico"
                              onClick={() => { setDynamicFormToPreview(q.forms[0]); setShowDynamicFormPreview(true); }}
                            >
                              <img src={adjIcon} alt="adjunto" style={{ width: 28, height: 28, verticalAlign: 'middle' }} />
                            </button>
                          ) : (
                            adjIcon && q.attachment?.url ? (
                              <a href={q.attachment.url.startsWith('/uploads') ? `${API_BASE}${q.attachment.url}` : q.attachment.url} target="_blank" rel="noopener noreferrer">
                                <img src={adjIcon} alt="adjunto" style={{ width: 28, height: 28, verticalAlign: 'middle' }} />
                              </a>
                            ) : (
                              '-' 
                            )
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee', fontWeight: 600, color: isLocked ? '#d32f2f' : '#388e3c' }}>{isLocked ? 'Bloqueado' : 'Libre'}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEdit(q, idx)}
                            disabled={isLocked}
                            style={{ marginRight: 8, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                            title={isLocked ? 'No se puede editar una pregunta usada en un test' : 'Editar'}
                          >✏️</button>
                          <button
                            onClick={() => handleDelete(q)}
                            disabled={isLocked}
                            style={{ opacity: isLocked ? 0.5 : 1, cursor: isLocked ? 'not-allowed' : 'pointer', color: '#d32f2f', fontWeight: 600 }}
                            title={isLocked ? 'No se puede eliminar una pregunta usada en un test' : 'Eliminar'}
                          >🗑️</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <AlertMessage
          open={snackbar.open}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        />
      </div>
      {/* Modal de vista previa de formulario dinámico */}
      {showDynamicFormPreview && dynamicFormToPreview && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowDynamicFormPreview(false)}>
          <div className="modal" style={{ minWidth: 600, maxWidth: 700, borderRadius: 16, boxShadow: '0 8px 32px #2224', padding: 24, position: 'relative', background: '#fff' }} onClick={e => e.stopPropagation()}>
            <button style={{ position: 'absolute', top: 10, right: 10, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', zIndex: 11 }} onClick={() => setShowDynamicFormPreview(false)}>✕</button>
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>Vista previa del Formulario</h4>
            <TestFormPreview form={dynamicFormToPreview} />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBankModal;
