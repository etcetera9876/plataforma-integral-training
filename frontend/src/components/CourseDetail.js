import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import './CourseDetail.css';
import { useDashboard } from './DashboardContext';

import pdfIcon from '../assets/pdf-icon.png';
import wordIcon from '../assets/word-icon.png';
import excelIcon from '../assets/excel-icon.png';
import ppIcon from '../assets/pp-icon.png';
import pngIcon from '../assets/png-icon.png';
import jpgIcon from '../assets/jpg-icon.png';
import mp4Icon from '../assets/mp4-icon.png';
import mp3Icon from '../assets/mp3-icon.png';
import checkIcon from '../assets/check-icon.png';

const FILE_ICONS = {
  pdf: pdfIcon,
  doc: wordIcon,
  docx: wordIcon,
  xls: excelIcon,
  xlsx: excelIcon,
  ppt: ppIcon,
  pptx: ppIcon,
  png: pngIcon,
  jpg: jpgIcon,
  jpeg: jpgIcon,
  gif: jpgIcon,
  mp4: mp4Icon,
  mov: mp4Icon,
  avi: mp4Icon,
  mp3: mp3Icon,
  wav: mp3Icon,
  link: null, // handled separately
};

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || null;
}

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courses, signedCourses, addSignedCourse } = useDashboard();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkPreview, setLinkPreview] = useState({});
  const [showSignModal, setShowSignModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [user, setUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
  const [signedPdfFile, setSignedPdfFile] = useState(null);

  // Buscar el curso en el contexto global antes de pedirlo al backend
  useEffect(() => {
    const found = courses.find(c => String(c._id) === String(id));
    if (found) {
      setCourse(found);
      setLoading(false);
    } else {
      setLoading(true);
      axios.get(`/api/courses/byid/${id}`)
        .then(res => {
          setCourse(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id, courses]);

  // Vista previa de enlaces con cache en localStorage
  useEffect(() => {
    if (!course || !course.resources) return;
    course.resources.forEach((res) => {
      const isLink = res.type === 'link' || (res.url && res.url.startsWith('http'));
      if (isLink && res.url) {
        // Intenta obtener del cache localStorage
        const cacheKey = `linkPreview_${res.url}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setLinkPreview(prev => ({ ...prev, [res.url]: JSON.parse(cached) }));
        } else {
          axios.post(`${API_URL}/api/courses/link-preview`, { url: res.url })
            .then(response => {
              setLinkPreview(prev => ({ ...prev, [res.url]: response.data }));
              localStorage.setItem(cacheKey, JSON.stringify(response.data));
            })
            .catch(() => {
              setLinkPreview(prev => ({ ...prev, [res.url]: null }));
              localStorage.setItem(cacheKey, JSON.stringify(null));
            });
        }
      }
    });
    // eslint-disable-next-line
  }, [course]);

  useEffect(() => {
    // Obtener usuario logueado
    const userObj = localStorage.getItem('user');
    if (userObj) setUser(JSON.parse(userObj));
  }, []);

  // Usar el contexto global para la firma si está disponible
  useEffect(() => {
    if (signedCourses && signedCourses.some(cid => String(cid) === String(id))) {
      setSigned(true);
    } else {
      // Fallback: consulta al backend solo si no está en contexto
      const userObj = localStorage.getItem('user');
      if (!userObj) return;
      const user = JSON.parse(userObj);
      const token = localStorage.getItem('token');
      axios.get(`/api/courses/${id}/signature`, {
        params: { userId: user.id },
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setSigned(res.data.signed))
        .catch(() => setSigned(false));
    }
  }, [id, signedCourses]);

  // Cierre automático del snackbar después de 1.5s
  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar(s => ({ ...s, open: false }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  if (loading) return <div className="course-detail-loading">Cargando...</div>;
  if (!course) return <div className="course-detail-error">No se encontró el curso.</div>;

  return (
    <div className="course-detail-outer">
      <div className="course-detail-card" style={{ position: 'relative', paddingBottom: 60 }}>
        <div className="course-detail-header">
          <h2 className="course-detail-title">{course.name}</h2>
          <div className="course-detail-actions">
            {signed && (
              <img src={checkIcon} alt="Curso firmado" title="Curso firmado" style={{ width: 32, height: 32, marginRight: 12, marginTop: 2 }} />
            )}
            <button className="course-detail-btn" onClick={() => window.history.back()}>Regresar</button>
          </div>
        </div>
        {/* Modal de firma */}
        {showSignModal && (
          <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowSignModal(false)}>
            <div className="modal" style={{ minWidth: 340, maxWidth: 420, borderRadius: 12, boxShadow: '0 4px 24px #2224', padding: 32, position: 'relative', background: '#fff' }} onClick={e => e.stopPropagation()}>
              <button style={{ position: 'absolute', top: 10, right: 10, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowSignModal(false)}>✕</button>
              <h3 style={{ marginTop: 0 }}>Firma de compromiso</h3>
              <p>Descargue, imprima y firme el archivo. Con esto usted está reconociendo que ha recibido una capacitación del curso: <b>{course.name}</b>.</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const apiBase = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
                    
                    const res = await fetch(`${apiBase}/api/certificates/template/${course._id}?userId=${user?.id}`);
                
                    if (!res.ok) throw new Error('No se pudo descargar la plantilla PDF');
                    const blob = await res.blob();
                    
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `plantilla-${course.name}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    
                  } catch (err) {
                    console.error('[PLANTILLA] Error al descargar la plantilla PDF:', err);
                    alert('Error al descargar la plantilla PDF');
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12, textDecoration: 'none', color: '#1976d2', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <img src={pdfIcon} alt="PDF" style={{ width: 28, height: 28 }} />
                Descargar plantilla PDF
              </button>
              <div style={{ margin: '16px 0 8px 0', fontWeight: 500 }}>Suba su archivo firmado aquí</div>
              <input
                type="file"
                accept="application/pdf"
                id="signed-pdf-upload"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setSignedPdfFile(e.target.files[0]);
                  }
                }}
                disabled={signing}
              />
              <label htmlFor="signed-pdf-upload" style={{ display: 'inline-block', background: '#1976d2', color: '#fff', borderRadius: 6, padding: '8px 18px', cursor: signing ? 'not-allowed' : 'pointer', fontWeight: 600, marginBottom: 8 }}>
                {signedPdfFile ? 'Reemplazar PDF firmado' : 'Seleccionar PDF firmado'}
              </label>
              {signedPdfFile && (
                <div style={{ fontSize: 14, color: '#333', marginBottom: 8 }}>
                  Archivo seleccionado: {signedPdfFile.name}
                </div>
              )}
              <p style={{ marginTop: 18 }}>Por favor, escribe tu nombre completo para confirmar que has revisado y comprendido a consciencia el curso de <b>{course.name}</b>.</p>
              <input
                type="text"
                value={signature}
                onChange={e => setSignature(e.target.value)}
                placeholder="Nombre completo"
                style={{ width: '100%', borderRadius: 8, border: '1.2px solid #d0d0d0', padding: 8, fontSize: 16, marginBottom: 18 }}
                disabled={signing}
              />
              <button
                className="confirm-button"
                style={{ minWidth: 120, fontSize: 16 }}
                disabled={signing || !signature.trim() || !signedPdfFile}
                onClick={async () => {
                  if (signature.trim() !== user.name) {
                    setSnackbar({ open: true, message: 'El nombre debe coincidir exactamente con el registrado en el sistema.', type: 'error' });
                    return;
                  }
                  setSigning(true);
                  try {
                    const token = localStorage.getItem('token');
                    // 1. Firmar el curso
                    // Obtener datos del curso y usuario para guardar en la firma
                    const courseRes = await axios.get(`/api/courses/byid/${id}`);
                    const courseData = courseRes.data;
                    const signRes = await axios.post(`/api/courses/${id}/signature`, {
                      userId: user.id,
                      name: signature.trim(),
                      courseName: courseData.name, // Nuevo campo
                      userName: user.name // Nuevo campo
                    }, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    // 2. Subir el PDF firmado
                    if (signedPdfFile) {
                      const formData = new FormData();
                      formData.append('signedFile', signedPdfFile);
                      await axios.post(`/api/certificates/${signRes.data.signature._id}/upload-signed`, formData, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                    }
                    setShowSignModal(false);
                    setSigned(true);
                    addSignedCourse(id); // Actualiza el contexto global
                    navigate('/training-dashboard', { state: { successMessage: 'Curso firmado con éxito' } });
                  } catch (err) {
                    setSnackbar({ open: true, message: 'Error al firmar el curso o subir el archivo', type: 'error' });
                    setTimeout(() => setSnackbar({ open: false, message: '', type: 'error' }), 1500);
                  } finally {
                    setSigning(false);
                  }
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        )}
        {/* Snackbar */}
        {snackbar.open && (
          <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: snackbar.type === 'success' ? '#43a047' : '#d32f2f', color: '#fff', fontWeight: 600, fontSize: 17, borderRadius: 10, boxShadow: '0 4px 24px #2224', padding: '16px 32px', textAlign: 'center', opacity: 0.98, letterSpacing: 0.2, pointerEvents: 'auto', transition: 'all 0.3s' }}>{snackbar.message}</div>
        )}
        <div className="course-detail-section">
          <h4>Descripción</h4>
          <div className="course-detail-description-box">{course.description || 'Sin descripción.'}</div>
        </div>
        <div className="course-detail-section">
          <h4>Recursos adjuntos</h4>
          {course.resources && course.resources.length > 0 ? (
            <ul className="course-detail-resources-list">
              {course.resources.map((res, idx) => {
                const isLink = res.type === 'link' || (res.url && res.url.startsWith('http'));
                let url = '';
                if (isLink) {
                  url = res.url;
                } else if (res.url && res.url.startsWith('/uploads/')) {
                  url = `${API_URL}${res.url}`;
                } else {
                  url = '';
                }
                const name = res.name || res.filename || res.url || (typeof res === 'string' ? res : 'Recurso inválido');
                const ext = isLink ? 'link' : (name.split('.').pop().toLowerCase());
                return url ? (
                  <li key={idx} className="resource-item resource-item-vertical resource-item-card">
                    <div className="resource-preview-area">
                      {isLink && linkPreview[res.url] && linkPreview[res.url].images && linkPreview[res.url].images.length > 0 ? (
                        <img src={linkPreview[res.url].images[0]} alt="Vista previa del enlace" className="resource-preview-image" />
                      ) : !isLink && ext.match(/jpg|jpeg|png|gif/) ? (
                        <img src={url} alt={name} className="resource-preview-image" />
                      ) : !isLink && ext === 'pdf' ? (
                        <iframe
                          src={url}
                          title={name}
                          className="resource-preview-pdf"
                          frameBorder="0"
                          width="100%"
                          height="120"
                        />
                      ) : !isLink && ext.match(/mp4|mov|avi/) ? (
                        <video src={url} controls className="resource-preview-video" />
                      ) : !isLink && ext.match(/mp3|wav/) ? (
                        <audio src={url} controls className="resource-preview-audio" />
                      ) : (
                        <div style={{height:'80px', width:'100%'}}></div>
                      )}
                    </div>
                    {isLink && linkPreview[res.url] && linkPreview[res.url].title && (
                      <div className="resource-link-preview-title">{linkPreview[res.url].title}</div>
                    )}
                    {isLink && linkPreview[res.url] && linkPreview[res.url].description && (
                      <div className="resource-link-preview-desc">{linkPreview[res.url].description}</div>
                    )}
                    <div className="resource-link-row">
                      {isLink ? (
                        <span className="resource-icon">🔗</span>
                      ) : getFileIcon(name) ? (
                        <img src={getFileIcon(name)} alt={ext + ' icon'} className="resource-file-icon" />
                      ) : (
                        <span className="resource-icon">📁</span>
                      )}
                      {isLink ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">{name}</a>
                      ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer">{name}</a>
                      )}
                    </div>
                  </li>
                ) : (
                  <li key={idx} className="resource-item" style={{color:'#c00'}}>
                    <span className="resource-icon">❌</span>
                    <span>Recurso inválido</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="course-detail-no-resources">No hay recursos adjuntos.</p>
          )}
        </div>
        {/* Botón de firma si no está firmado */}
        {!signed && user && (
          <button
            className="confirm-button"
            style={{ position: 'absolute', bottom: 18, right: 18, zIndex: 1000 }}
            onClick={() => setShowSignModal(true)}
          >
            He revisado el curso
          </button>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
