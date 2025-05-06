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

  // Socket para recargar datos en tiempo real
  useEffect(() => {
    if (!user || !user.id || !user.branchId) return;
    const newSocket = io('http://localhost:5000', {
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
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user?.id, user?.branchId, fetchAllData]);

  // Cargar datos al montar o cambiar usuario
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Métodos para actualizar datos localmente tras acciones del usuario
  const addSignedCourse = (courseId) => {
    setSignedCourses((prev) => prev.includes(courseId) ? prev : [...prev, courseId]);
  };
  const updateCourses = (newCourses) => setCourses(newCourses);
  const updateAssessments = (newAssessments) => setAssessments(newAssessments);

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
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
