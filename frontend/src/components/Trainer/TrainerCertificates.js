import React, { useEffect } from 'react';
import pdfIcon from '../../assets/pdf-icon.png';
import './TrainerDashboard.css';
import { useDashboard } from '../DashboardContext';

const TrainerCertificates = ({ setUser, user, branchId }) => {
  const {
    branches,
    certificates,
    selectedBranch,
    selectBranch,
    loading,
  } = useDashboard();

  useEffect(() => {
    if (branchId && branchId !== selectedBranch) {
      selectBranch(branchId, user.token);
    }
  }, [branchId, selectedBranch, selectBranch, user.token]);

  return (
    <>
      {loading && <p>Loading certificates...</p>}
      {!loading && selectedBranch && certificates.length === 0 && (
        <>
          <p>No certificates found for this branch.</p>
          <p style={{color: 'gray', fontSize: 13}}>¿Esperabas ver certificados aquí? Revisa la consola del navegador para detalles de depuración.</p>
        </>
      )}
      {!loading && certificates.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 32, marginTop: 24, maxWidth: 900, marginLeft: 0 }}>
          <table className="training-table" style={{ minWidth: 400, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 16px', minWidth: 180 }}>Recruiter/Manager</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', minWidth: 180 }}>Course</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', minWidth: 120 }}>Date signed</th>
                <th style={{ textAlign: 'center', padding: '10px 16px', minWidth: 60 }}>Signed record</th>
                <th style={{ textAlign: 'center', padding: '10px 16px', minWidth: 60 }}>Training certificate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" style={{ padding: 0 }}>
                  <div style={{ borderBottom: '2px solid #e0e0e0', width: '100%' }}></div>
                </td>
              </tr>
              {certificates.map(cert => (
                <tr key={cert.id}>
                  <td style={{ textAlign: 'left', padding: '10px 16px' }}>{cert.userName}</td>
                  <td style={{ textAlign: 'left', padding: '10px 16px' }}>{cert.courseName}</td>
                  <td style={{ textAlign: 'left', padding: '10px 16px' }}>{new Date(cert.signedAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                    {cert.signedFileUrl && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}${cert.signedFileUrl}`, {
                              headers: { Authorization: user.token },
                            });
                            if (!response.ok) throw new Error('Error downloading PDF firmado');
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${cert.userName}-${cert.courseName}-firmado.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            alert('Error descargando PDF firmado');
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Descargar PDF firmado por el usuario"
                      >
                        <img src={pdfIcon} alt="PDF firmado" style={{ width: 28, height: 28, filter: 'hue-rotate(120deg)' }} />
                      </button>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}${cert.pdfUrl}`, {
                            headers: { Authorization: user.token },
                          });
                          if (!response.ok) throw new Error('Error downloading PDF');
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${cert.userName}-${cert.courseName}-certificate.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          alert('Error downloading PDF');
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Descargar certificado generado"
                    >
                      <img src={pdfIcon} alt="PDF" style={{ width: 28, height: 28 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default TrainerCertificates;
