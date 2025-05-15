import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socket from '../../socket';
import { FaRedo, FaHistory } from 'react-icons/fa';

function ConfirmModal({ open, onConfirm, onCancel, userName }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 32, minWidth: 320, boxShadow: '0 2px 12px #aaa', textAlign: 'center' }}>
        <div style={{ fontSize: 18, marginBottom: 18 }}>¿Enviar recordatorio a <b>{userName}</b>?</div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button onClick={onConfirm} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: 'pointer' }}>Enviar</button>
          <button onClick={onCancel} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function ResetModal({ open, onClose, onSubmit, userName, loading }) {
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  // Limpiar campos al cerrar/cancelar o confirmar
  useEffect(() => {
    if (!open) {
      setReason('');
      setFiles([]);
      setError('');
    }
  }, [open]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Debes ingresar un motivo.');
      return;
    }
    setError('');
    onSubmit({ reason, files });
    // Limpiar campos después de submit
    setReason('');
    setFiles([]);
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, padding: 32, minWidth: 340, boxShadow: '0 2px 12px #aaa', textAlign: 'center' }}>
        <div style={{ fontSize: 18, marginBottom: 18 }}>Resetear test de <b>{userName}</b></div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motivo del reseteo (requerido)"
          rows={3}
          style={{ width: '100%', borderRadius: 6, border: '1px solid #ccc', padding: 8, marginBottom: 12 }}
        />
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          style={{ marginBottom: 12 }}
        />
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
          <button type="submit" disabled={loading} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: 'pointer' }}>Resetear</button>
          <button type="button" onClick={onClose} disabled={loading} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

const EvaluationResultsPage = ({ user, branchId }) => {
  const [branches, setBranches] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [subtests, setSubtests] = useState([]);
  const [userNamesMap, setUserNamesMap] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });
  const [viewMode, setViewMode] = useState('test'); // 'test' o 'user'
  const [gradesSummary, setGradesSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [showResetHistory, setShowResetHistory] = useState(false);
  // Estado para historial de reseteos
  const [resetLogs, setResetLogs] = useState([]);
  const [loadingResetLogs, setLoadingResetLogs] = useState(false);

  // Obtener token
  const token = user?.token || localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  // Cargar branches al inicio (solo si necesitas la lista para mostrar nombres)
  useEffect(() => {
    axios.get('/api/branches', axiosConfig).then(res => setBranches(res.data));
  }, []);

  // Cargar tests al seleccionar branch
  useEffect(() => {
    if (!branchId) return;
    axios.get(`/api/assessments?branchId=${branchId}`, axiosConfig).then(res => setTests(res.data));
    setSelectedTest(null);
    setSubtests([]);
  }, [branchId]);

  // Cargar subtests al seleccionar test
  useEffect(() => {
    if (!selectedTest) return;
    axios.get(`/api/assessments/${selectedTest._id}/subtests`, axiosConfig).then(res => setSubtests(res.data));
  }, [selectedTest]);

  // Recargar subtests en tiempo real cuando llega un evento de socket
  useEffect(() => {
    if (!selectedTest) return;
    const handler = () => {
      axios.get(`/api/assessments/${selectedTest._id}/subtests`, axiosConfig).then(res => setSubtests(res.data));
    };
    socket.on('dbChange', handler);
    return () => socket.off('dbChange', handler);
  }, [selectedTest]);

  // Obtener nombres de usuario por ID (solo para los que no están en userNamesMap)
  useEffect(() => {
    if (!subtests || subtests.length === 0) return;
    const ids = subtests
      .map(st => {
        if (typeof st.userId === 'string') return st.userId;
        if (typeof st.userId === 'object' && st.userId?._id) return st.userId._id;
        return null;
      })
      .filter(id => id && /^[a-f\d]{24}$/i.test(id) && !userNamesMap[id]);
    if (ids.length > 0) {
      axios.post('/api/users/names', { userIds: ids }, axiosConfig)
        .then(res => setUserNamesMap(prev => ({ ...prev, ...res.data })))
        .catch(() => {});
    }
  }, [subtests, userNamesMap]);

  const handleRemindClick = (st) => {
    setCurrentUserId(typeof st.userId === 'object' ? st.userId._id : st.userId);
    setCurrentUserName(typeof st.userId === 'object' ? st.userId.name || st.userId.email : st.userId);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    try {
      await axios.post(`/api/assessments/${selectedTest._id}/remind`, {
        userId: currentUserId
      }, axiosConfig);
      setSnackbar({ open: true, message: 'Correo de recordatorio enviado', type: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'No se pudo enviar el correo de recordatorio', type: 'error' });
    }
  };

  // Cargar lista de usuarios con subtests en la branch seleccionada
  useEffect(() => {
    if (viewMode !== 'user' || !branchId) return;
    axios.get(`/api/assessments?branchId=${branchId}`, axiosConfig).then(res => {
      const allTests = res.data || [];
      // Obtener todos los subtests de todos los tests
      Promise.all(
        allTests.map(test => axios.get(`/api/assessments/${test._id}/subtests`, axiosConfig).then(r => r.data))
      ).then(subtestsArrays => {
        const userIds = Array.from(new Set(subtestsArrays.flat().map(st => {
          if (typeof st.userId === 'object' && st.userId?._id) return st.userId._id;
          if (typeof st.userId === 'string') return st.userId;
          return null;
        }).filter(Boolean)));
        // Obtener nombres de usuario
        if (userIds.length > 0) {
          axios.post('/api/users/names', { userIds }, axiosConfig)
            .then(resp => {
              const options = userIds.map(id => ({ id, name: resp.data[id] || id }));
              setUserOptions(options);
              if (!selectedUserId && options.length > 0) setSelectedUserId(options[0].id);
            });
        } else {
          setUserOptions([]);
        }
      });
    });
  }, [viewMode, branchId]);

  // Cargar resumen de notas por usuario seleccionado
  useEffect(() => {
    if (viewMode !== 'user' || !branchId || !selectedUserId) return;
    setLoadingSummary(true);
    axios.get(`/api/assessments/grades-summary?userId=${selectedUserId}&branchId=${branchId}`, axiosConfig)
      .then(res => setGradesSummary(res.data))
      .catch(() => setGradesSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [viewMode, branchId, selectedUserId]);

  // Cargar historial de reseteos al abrir el modal
  useEffect(() => {
    if (!showResetHistory || !selectedTest) return;
    setLoadingResetLogs(true);
    axios.get(`/api/assessments/${selectedTest._id}/reset-logs`, axiosConfig)
      .then(res => setResetLogs(res.data))
      .catch(() => setResetLogs([]))
      .finally(() => setLoadingResetLogs(false));
  }, [showResetHistory, selectedTest]);

  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar(s => ({ ...s, open: false }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, marginBottom: 15 }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 18 }}>
          <button
            className={viewMode === 'test' ? 'confirm-button' : 'icon-button'}
            style={{ fontWeight: 600, fontSize: 16, padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
            onClick={() => setViewMode('test')}
          >
            Por test
          </button>
          <button
            className={viewMode === 'user' ? 'confirm-button' : 'icon-button'}
            style={{ fontWeight: 600, fontSize: 16, padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
            onClick={() => setViewMode('user')}
          >
            Por usuario
          </button>
        </div>
        {viewMode === 'user' && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 600, marginRight: 8, marginTop: 20 }}>Selecciona usuario:</label>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: 6, borderRadius: 6, minWidth: 180 }}>
              {userOptions.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {viewMode === 'test' ? (
        <div style={{ display: 'flex', gap: 32, width: '100%' }}>
          <div style={{ minWidth: 320, background: '#fafbfc', borderRadius: 12, boxShadow: '0 2px 12px #e0e0e0', border: '1px solid #e0e0e0', padding: 24, boxSizing: 'border-box', height: 'fit-content' }}>
            <h4>Lista de Tests</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tests.map(test => (
                <li key={test._id} style={{ marginBottom: 10 }}>
                  <button onClick={() => setSelectedTest(test)} style={{ background: selectedTest?._id === test._id ? '#1976d2' : '#f5f5f5', color: selectedTest?._id === test._id ? '#fff' : '#222', border: 'none', borderRadius: 6, padding: '8px 16px', width: '100%', textAlign: 'left', fontWeight: 600, cursor: 'pointer' }}>
                    {test.name} <span style={{ fontWeight: 400, fontSize: 13, color: '#888' }}>({test.createdAt?.slice(0,10)})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* Detalle de resultados */}
          <div style={{ flex: 1 }}>
            {selectedTest && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <h3 style={{ marginBottom: 0 }}>Resultados para: {selectedTest.name}</h3>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      marginLeft: 16,
                      marginRight: 24,
                      fontSize: 22,
                      color: '#1976d2',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Ver historial de reseteos"
                    onClick={() => setShowResetHistory(true)}
                  >
                    <FaHistory style={{ marginRight: 6 }} />
                    <span style={{ fontSize: 15, fontWeight: 500 }}>Historial</span>
                  </button>
                </div>
                <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', background: '#fafbfc', borderRadius: 8 }}>
                  <thead>
                    <tr style={{ background: '#e3eafc' }}>
                      <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 180 }}>Usuario</th>
                      <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 120 }}>Estado</th>
                      <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 180 }}>Fecha envío</th>
                      <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 100 }}>Puntaje</th>
                      <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'center', minWidth: 100 }}>Reseteo?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subtests.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 18 }}>(No hay resultados aún)</td></tr>
                    )}
                    {subtests.map(st => (
                      <tr key={st._id}>
                        <td style={{ padding: '10px 0', borderBottom: '1px solid #eee', textAlign: 'left', minWidth: 180 }}>
                          {(() => {
                            if (typeof st.userId === 'object') {
                              return st.userId.name || st.userId.email || st.userId._id || JSON.stringify(st.userId);
                            } else if (/^[a-f\d]{24}$/i.test(st.userId) && userNamesMap[st.userId]) {
                              return userNamesMap[st.userId];
                            } else {
                              return st.userId;
                            }
                          })()}
                        </td>
                        <td style={{ padding: '10px 0', borderBottom: '1px solid #eee', textAlign: 'left', minWidth: 120 }}>
                          {st.submittedAt ? 'Completado' : (
                            <>
                              Pendiente
                              <button
                                style={{
                                  marginLeft: 8,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  verticalAlign: 'middle',
                                  padding: 0
                                }}
                                title="Enviar recordatorio por correo"
                                onClick={() => handleRemindClick(st)}
                              >
                                <img src={require('../../assets/gmail-icon.png')} alt="Gmail" style={{ width: 20, height: 20, verticalAlign: 'middle' }} />
                              </button>
                            </>
                          )}
                        </td>
                        <td style={{ padding: '10px 0', borderBottom: '1px solid #eee', textAlign: 'left', minWidth: 180 }}>{st.submittedAt ? new Date(st.submittedAt).toLocaleString() : '-'}</td>
                        <td style={{ padding: '10px 0', borderBottom: '1px solid #eee', textAlign: 'left', minWidth: 100 }}>{st.score != null ? `${st.score} / ${st.totalQuestions}` : '-'}</td>
                        <td style={{ padding: '10px 0', borderBottom: '1px solid #eee', textAlign: 'center', minWidth: 100 }}>
                          {st.submittedAt && (
                            <button
                              style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 600, cursor: 'pointer' }}
                              title="Resetear test"
                              onClick={() => {
                                setCurrentUserId(typeof st.userId === 'object' ? st.userId._id : st.userId);
                                setCurrentUserName(typeof st.userId === 'object' ? st.userId.name || st.userId.email : st.userId);
                                setResetOpen(true);
                              }}
                            >
                              Resetear
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', background: '#fafbfc', borderRadius: 12, boxShadow: '0 2px 12px #e0e0e0', padding: 32, boxSizing: 'border-box', margin: '0 auto' }}>
          <h3 style={{ marginBottom: 18 }}>Notas por bloque y nota global</h3>
          {loadingSummary ? (
            <div>Cargando resumen...</div>
          ) : gradesSummary ? (
            <>
              <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', marginBottom: 18 }}>
                <thead>
                  <tr style={{ background: '#e3eafc' }}>
                    <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Bloque</th>
                    <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Peso (%)</th>
                    <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Promedio (%)</th>
                    <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Aporte (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {gradesSummary.blocks.map(b => (
                    <tr key={b.blockId}>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
                        {b.label}
                        {typeof b.count === 'number' ? <span style={{ color: '#888', fontWeight: 400 }}> ({b.count})</span> : null}
                      </td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #eee', textAlign: 'center' }}>{b.weight}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #eee', textAlign: 'center' }}>{b.average.toFixed(2)}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #eee', textAlign: 'center' }}>{b.weighted.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2', textAlign: 'right' }}>
                Nota global: {gradesSummary.notaGlobal.toFixed(2)}%
              </div>
              {gradesSummary && gradesSummary.testsDetail && gradesSummary.testsDetail.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h4 style={{ marginBottom: 12 }}>Detalle de tests resueltos</h4>
                  <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', background: '#fff', borderRadius: 8, marginBottom: 18 }}>
                    <thead>
                      <tr style={{ background: '#e3eafc' }}>
                        <th style={{ padding: '8px 0', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Test</th>
                        <th style={{ padding: '8px 0', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Bloque</th>
                        <th style={{ padding: '8px 0', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Fecha</th>
                        <th style={{ padding: '8px 0', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Puntaje (%)</th>
                        <th style={{ padding: '8px 0', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Correctas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradesSummary.testsDetail.map((t, idx) => (
                        <tr key={t.assessmentId + '-' + idx}>
                          <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'left' }}>{t.assessmentName}</td>
                          <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'left' }}>{t.blockLabel}</td>
                          <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'left' }}>{t.submittedAt ? new Date(t.submittedAt).toLocaleString() : '-'}</td>
                          <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'center' }}>{typeof t.score === 'number' ? t.score : '-'}</td>
                          <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'center' }}>{t.correctCount != null && t.totalQuestions != null ? `${t.correctCount} / ${t.totalQuestions}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div>No hay datos de notas para este usuario en la sucursal seleccionada.</div>
          )}
        </div>
      )}
      <ConfirmModal
        open={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        userName={currentUserName}
      />
      <ResetModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onSubmit={async ({ reason, files }) => {
          setResetOpen(false);
          try {
            if (!reason || !reason.trim()) {
              setSnackbar({ open: true, message: 'Debes ingresar un motivo.', type: 'error' });
              return;
            }
            const formData = new FormData();
            formData.append('reason', reason);
            if (files && files.length > 0) {
              files.forEach((file, index) => {
                formData.append(`file${index}`, file);
              });
            }
            await axios.post(`/api/assessments/${selectedTest._id}/reset/${currentUserId}`, formData, {
              ...axiosConfig,
              headers: {
                ...axiosConfig.headers,
                'Content-Type': 'multipart/form-data',
              },
            });
            setSnackbar({ open: true, message: 'Test reseteado exitosamente', type: 'success' });
          } catch (err) {
            setSnackbar({ open: true, message: 'Error al resetear el test', type: 'error' });
          }
        }}
        userName={currentUserName}
        loading={false}
      />
      {showResetHistory && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowResetHistory(false)}>
          <div className="modal" style={{ minWidth: 900, maxWidth: 1200, width: '90vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 18, display: 'flex', alignItems: 'center' }}><FaHistory style={{ marginRight: 8 }} />Historial de reseteos</h3>
            {loadingResetLogs ? (
              <div style={{ textAlign: 'center', color: '#888', margin: '32px 0' }}>Cargando historial...</div>
            ) : resetLogs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', margin: '32px 0' }}>(No hay reseteos registrados para este test)</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafbfc', borderRadius: 8, marginBottom: 12, minWidth: 700, tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#e3eafc' }}>
                    <th style={{ padding: '8px 4px', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 90, maxWidth: 120 }}>Fecha</th>
                    <th style={{ padding: '8px 4px', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 90, maxWidth: 120 }}>Usuario</th>
                    <th style={{ padding: '8px 4px', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 90, maxWidth: 120 }}>Admin</th>
                    <th style={{ padding: '8px 4px', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 120, maxWidth: 180 }}>Motivo</th>
                    <th style={{ padding: '8px 4px', borderBottom: '1px solid #ddd', textAlign: 'center', minWidth: 40, maxWidth: 60 }}>
                      Archivos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resetLogs.map(log => (
                    <tr key={log._id}>
                      <td style={{ padding: '8px 4px', borderBottom: '1px solid #eee' }}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</td>
                      <td style={{ padding: '8px 4px', borderBottom: '1px solid #eee' }}>{log.userId?.name || log.userId?.email || log.userId?._id || '-'}</td>
                      <td style={{ padding: '8px 4px', borderBottom: '1px solid #eee' }}>{log.adminId?.name || log.adminId?.email || log.adminId?._id || '-'}</td>
                      <td style={{ padding: '8px 4px', borderBottom: '1px solid #eee', maxWidth: 220, whiteSpace: 'pre-line', overflowWrap: 'break-word' }}>{log.reason}</td>
                      <td style={{ padding: '8px 4px', borderBottom: '1px solid #eee', textAlign: 'center', minWidth: 40, maxWidth: 60 }}>
                        {log.attachments && log.attachments.length > 0 ? (
                          log.attachments.map((file, idx) => {
                            const url = file.downloadUrl || file.url || `/uploads/${file.filename}`;
                            const name = file.originalname || file.filename || `Archivo ${idx + 1}`;
                            return (
                              <span key={idx} style={{ display: 'inline-block', marginRight: 4 }}>
                                <a href={url} download style={{ color: '#1976d2' }} title={`Descargar ${name}`}>
                                  <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                                    <img src={require('../../assets/pdf-icon.png')} alt="Descargar PDF" style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
                                  </button>
                                </a>
                              </span>
                            );
                          })
                        ) : (
                          <span style={{ color: '#888' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="confirm-button" style={{ marginTop: 18 }} onClick={() => setShowResetHistory(false)}>Cerrar</button>
          </div>
        </div>
      )}
      {snackbar.open && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: snackbar.type === 'success' ? '#43a047' : '#d32f2f',
          color: '#fff',
          padding: '14px 32px',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 16,
          zIndex: 9999,
          boxShadow: '0 2px 12px #aaa',
          minWidth: 280,
          textAlign: 'center',
        }}
          onClick={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </div>
      )}
    </div>
  );
};

export default EvaluationResultsPage;
