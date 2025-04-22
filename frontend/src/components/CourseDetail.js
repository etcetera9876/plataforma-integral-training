import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import './CourseDetail.css';

import pdfIcon from '../assets/pdf-icon.png';
import wordIcon from '../assets/word-icon.png';
import excelIcon from '../assets/excel-icon.png';
import ppIcon from '../assets/pp-icon.png';
import pngIcon from '../assets/png-icon.png';
import jpgIcon from '../assets/jpg-icon.png';
import mp4Icon from '../assets/mp4-icon.png';
import mp3Icon from '../assets/mp3-icon.png';

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
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkPreview, setLinkPreview] = useState({});

  useEffect(() => {
    axios.get(`/api/courses/byid/${id}`)
      .then(res => {
        setCourse(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!course || !course.resources) return;
    course.resources.forEach((res, idx) => {
      const isLink = res.type === 'link' || (res.url && res.url.startsWith('http'));
      if (isLink && res.url && !linkPreview[res.url]) {
        axios.post(`${API_URL}/api/courses/link-preview`, { url: res.url })
          .then(response => {
            setLinkPreview(prev => ({ ...prev, [res.url]: response.data }));
          })
          .catch(() => {
            setLinkPreview(prev => ({ ...prev, [res.url]: null }));
          });
      }
    });
    // eslint-disable-next-line
  }, [course]);

  if (loading) return <div className="course-detail-loading">Cargando...</div>;
  if (!course) return <div className="course-detail-error">No se encontró el curso.</div>;

  return (
    <div className="course-detail-outer">
      <div className="course-detail-card">
        <div className="course-detail-header">
          <h2 className="course-detail-title">{course.name}</h2>
          <div className="course-detail-actions">
            <button className="course-detail-btn" onClick={() => window.history.back()}>Regresar</button>
            {/* <button className="course-detail-btn edit">Editar</button> */}
          </div>
        </div>
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
      </div>
    </div>
  );
};

export default CourseDetail;
