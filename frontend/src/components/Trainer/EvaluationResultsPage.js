import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socket from '../../socket';

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

const EvaluationResultsPage = ({ user, branchId }) => {
  const [branches, setBranches] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [subtests, setSubtests] = useState([]);
  const [userNamesMap, setUserNamesMap] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });

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

  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar(s => ({ ...s, open: false }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      <div style={{ minWidth: 320 }}>
        <h4>Tests</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
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
            <h3 style={{ marginBottom: 18 }}>Resultados para: {selectedTest.name}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafbfc', borderRadius: 8, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#e3eafc' }}>
                  <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 180 }}>Usuario</th>
                  <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 120 }}>Estado</th>
                  <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 180 }}>Fecha envío</th>
                  <th style={{ padding: '10px 0', borderBottom: '1px solid #ddd', textAlign: 'left', minWidth: 100 }}>Puntaje</th>
                </tr>
              </thead>
              <tbody>
                {subtests.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: 18 }}>(No hay resultados aún)</td></tr>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      <ConfirmModal
        open={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        userName={currentUserName}
      />
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
