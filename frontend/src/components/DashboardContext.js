import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
        }),
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
  }, [user?.id, user?.branchId]);

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
    setLoading(true);
    try {
      const res = await axios.get(`/api/certificates?branch=${branchId}`, {
        headers: { Authorization: token || localStorage.getItem('token') }
      });
      setCertificates(res.data);
    } catch (err) {
      setCertificates([]);
    } finally {
      setLoading(false);
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
    newSocket.on('dbChange', () => {
      fetchAllData();
    });
    // NUEVO: escuchar evento de firma de curso
    newSocket.on('courseSigned', (data) => {
      if (data && String(data.userId) === String(user.id)) {
        fetchAllData();
      }
    });
    // NUEVO: escuchar evento de certificado firmado (para tiempo real en certificados)
    newSocket.on('certificateSigned', (data) => {
      console.log('[SOCKET][CTX] certificateSigned recibido:', data, 'user.branchId:', user.branchId);
      if (data && String(data.branchId) === String(user.branchId)) {
        fetchAllData();
      }
    });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user?.id, user?.branchId, fetchAllData]);

  // Cargar datos al montar o cambiar usuario
  useEffect(() => {
    fetchAllData();
  }, [user, fetchAllData]);

  // Recargar certificados en tiempo real por socket
  useEffect(() => {
    if (!selectedBranch) return;
    if (!socket) return;
    const handler = (data) => {
      if (data && String(data.branchId) === String(selectedBranch)) {
        // Agregar el certificado recibido directamente al estado si no existe
        setCertificates(prev => {
          if (prev.some(cert => cert.id === data.id || cert._id === data._id)) return prev;
          return [...prev, data];
        });
      }
    };
    socket.on('certificateSigned', handler);
    return () => socket.off('certificateSigned', handler);
  }, [selectedBranch, socket, fetchCertificates]);

  // Métodos para actualizar datos localmente tras acciones del usuario
  const addSignedCourse = (courseId) => {
    setSignedCourses((prev) => prev.includes(courseId) ? prev : [...prev, courseId]);
  };
  const updateCourses = (newCourses) => setCourses(newCourses);
  const updateAssessments = (newAssessments) => setAssessments(newAssessments);
  const handleSelectBranch = (branchId, token) => {
    setSelectedBranch(branchId);
    fetchCertificates(branchId, token);
  };

  return (
    <DashboardContext.Provider value={{
      courses,
      signedCourses,
      assessments,
      loading,
      addSignedCourse,
      updateCourses,
      updateAssessments,
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
