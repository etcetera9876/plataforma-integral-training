import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EvaluationResultsPage = ({ user }) => {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [subtests, setSubtests] = useState([]);

  // Obtener token
  const token = user?.token || localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  // Cargar branches al inicio
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

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #e0e0e0', padding: 32 }}>
      {/* Selector de branch */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 600, marginRight: 12 }}>Branch:</label>
        <select value={branchId} onChange={e => setBranchId(e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
          <option value="">Selecciona una sucursal</option>
          {branches.map(b => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>
      {/* Lista de tests */}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafbfc', borderRadius: 8 }}>
                <thead>
                  <tr style={{ background: '#e3eafc' }}>
                    <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>Usuario</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>Estado</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>Fecha envío</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>Puntaje</th>
                  </tr>
                </thead>
                <tbody>
                  {subtests.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: 18 }}>(No hay resultados aún)</td></tr>
                  )}
                  {subtests.map(st => (
                    <tr key={st._id}>
                      <td style={{ padding: 10 }}>{st.userId?.name || st.userId?.email || st.userId}</td>
                      <td style={{ padding: 10 }}>{st.submittedAt ? 'Completado' : 'Pendiente'}</td>
                      <td style={{ padding: 10 }}>{st.submittedAt ? new Date(st.submittedAt).toLocaleString() : '-'}</td>
                      <td style={{ padding: 10 }}>{st.score != null ? `${st.score} / ${st.totalQuestions}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationResultsPage;
