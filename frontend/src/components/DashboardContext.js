import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const DashboardContext = createContext();

export function useDashboard() {
  return useContext(DashboardContext);
}

export function DashboardProvider({ user, children }) {
  const [courses, setCourses] = useState([]);
  const [signedCourses, setSignedCourses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [branches, setBranches] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const selectedBranchRef = useRef("");

  // Cargar datos iniciales
  const fetchAllData = useCallback(async () => {
    if (!user || !user.id || !user.branchId) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [coursesRes, signedRes, assessmentsRes] = await Promise.all([
        axios.get('/api/courses', {
          params: { recruiterId: user.id, branchId: user.branchId },
        }),
        axios.get('/api/courses/signed', {
          params: { userId: user.id },
          headers: { Authorization: token },
        }),
        axios.get('/api/assessments/assigned', {
          params: { userId: user.id, branchId: user.branchId },
          headers: { Authorization: token },
        })
      ]);
      setCourses(coursesRes.data);
      setSignedCourses(signedRes.data.signedCourseIds || []);
      setAssessments(assessmentsRes.data);
    } catch (err) {
      setCourses([]);
      setSignedCourses([]);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [user, user?.id, user?.branchId]);

  // Cargar sucursales al iniciar
  useEffect(() => {
    axios.get("/api/branches")
      .then(res => setBranches(res.data))
      .catch(() => setBranches([]));
  }, []);

  // Cargar certificados cuando cambia la sucursal seleccionada
  const fetchCertificates = useCallback(async (branchId, token) => {
    if (!branchId) {
      setCertificates([]);
      return;
    }
    setLoadingCertificates(true);
    try {
      const res = await axios.get(`/api/certificates?branch=${branchId}`, {
        headers: { Authorization: token || localStorage.getItem('token') }
      });
      setCertificates(res.data);
    } catch (err) {
      setCertificates([]);
    } finally {
      setLoadingCertificates(false);
    }
  }, []);

  // Socket para recargar datos en tiempo real
  useEffect(() => {
    if (!user || !user.id || !user.branchId) return;
    const socketUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    newSocket.on('connect', () => {
      console.log('[SOCKET][CTX] Conectado a socket.io');
    });
    newSocket.on('disconnect', (reason) => {
      console.warn('[SOCKET][CTX] Desconectado de socket.io:', reason);
    });
    newSocket.on('connect_error', (err) => {
      console.error('[SOCKET][CTX] Error de conexión socket.io:', err.message);
    });
    // SOLO UNA escucha para certificateSigned: recarga certificados del branch seleccionado SOLO si el usuario es Trainer
    // Solo recargar si el usuario es recruiter
    if (user?.role === 'Recruiter' || user?.role === 'Trainer') {
      newSocket.on('dbChange', fetchAllData);
    }

  
    const certificateHandler = (data) => {
      // Solo recargar si el usuario es trainer y el branch del certificado coincide con el branch seleccionado
      if (user?.role === 'Trainer' && data && String(data.branchId) === String(selectedBranchRef.current)) {
        fetchCertificates(selectedBranchRef.current, user?.token);
      }
    };
    newSocket.on('certificateSigned', certificateHandler);
    setSocket(newSocket);
    return () => {
      newSocket.off('certificateSigned', certificateHandler);
      if (user?.role === 'Recruiter' || user?.role === 'Trainer') {
        newSocket.off('dbChange', fetchAllData);
      }
      newSocket.disconnect();
    };
  }, [user, user?.id, user?.branchId, fetchAllData, fetchCertificates]);

  // Cargar datos al montar o cambiar usuario
  useEffect(() => {
    fetchAllData();
  }, [user, fetchAllData]);

  // Recargar certificados en tiempo real por socket
  useEffect(() => {
    selectedBranchRef.current = selectedBranch;
  }, [selectedBranch]);

  // Métodos para actualizar datos localmente tras acciones del usuario
  const addSignedCourse = (courseId) => {
    setSignedCourses((prev) => prev.includes(courseId) ? prev : [...prev, courseId]);
  };
  const updateCourses = (newCourses) => setCourses(newCourses);
  const updateAssessments = (newAssessments) => setAssessments(newAssessments);
  // NUEVO: Actualiza el estado de un assessment tras submit inmediato
  const updateAssessmentSubmission = (assessmentId, submittedAt) => {
    setAssessments((prev) => prev.map(a =>
      a._id === assessmentId ? { ...a, submittedAt } : a
    ));
  };
  const handleSelectBranch = (branchId, token) => {
    setSelectedBranch(branchId);
    selectedBranchRef.current = branchId;
    fetchCertificates(branchId, token);
  };

  return (
    <DashboardContext.Provider value={{
      courses,
      signedCourses,
      assessments,
      loading,
      loadingCertificates,
      addSignedCourse,
      updateCourses,
      updateAssessments,
      updateAssessmentSubmission, // <-- Exporta la función
      refetchAll: fetchAllData,
      // NUEVO: contexto global para certificados y sucursales
      branches,
      certificates,
      selectedBranch,
      selectBranch: handleSelectBranch,
      fetchCertificates,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
