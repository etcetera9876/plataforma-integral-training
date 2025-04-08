import React, { useState, useEffect } from "react";
import CourseModal from "./CourseModal";
import axios from "axios";
import API_URL from "../../config";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import useBranches from "../../hooks/useBranches";
import "./TrainerDashboard.css";

const TrainerDashboard = ({ setUser, user }) => {
  const navigate = useNavigate();
  const { branches, loading } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (selectedBranch) {
      fetchCourses();
    }
  }, [selectedBranch]);

  const fetchCourses = async () => {
    try {
      const token = user.token;
      const res = await axios.get(`${API_URL}/api/courses/${selectedBranch}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(res.data);
    } catch (error) {
      console.error("Error al obtener cursos:", error.response?.data || error.message);
    }
  };

  const handleAddCourse = async (courseName) => {
    try {
      const token = user.token;
      const payload = {
        name: courseName,
        createdBy: { id: user.id, name: user.name },
        branchId: selectedBranch,
      };

      const res = await axios.post(`${API_URL}/api/courses`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchCourses();
    } catch (err) {
      console.error("Error al crear curso:", err.response?.data || err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  const currentBranchName = branches.find((b) => b._id === selectedBranch)?.name || "";

  return (
    <div className="dashboard-container">
      <Sidebar onLogout={handleLogout} userName={user.name} userId={user.id} />
      <main className="main-content">
        <h1 className="title">Trainer Dashboard</h1>
        <p className="subtitle">Bienvenido, aquí puedes gestionar cursos y evaluaciones por sucursal.</p>

        <section className="branch-selector">
          <label htmlFor="branch-select">Select the branch:</label>
          {loading ? (
            <p>Loading branches...</p>
          ) : (
            <select id="branch-select" value={selectedBranch} onChange={handleBranchChange}>
              <option value="">-- Selecciona una sucursal --</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </section>

        {selectedBranch && (
          <>
            <section className="courses-section">
              <div className="section-header">
                <h2 className="section-title">{currentBranchName} Courses</h2>
                <button className="add-button" onClick={() => setShowCourseModal(true)}>＋</button>
              </div>
              <ul className="course-list">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <li key={course._id} className="course-item">
                      <span className="course-name">📘 {course.name}</span>
                      <span className="creator">Creado por {course.createdBy.name}</span>
                    </li>
                  ))
                ) : (
                  <li className="empty-message">No hay cursos registrados en esta sucursal.</li>
                )}
              </ul>
            </section>

            <section className="evaluations-section">
              <div className="section-header">
                <h2 className="section-title">{currentBranchName} Evaluations</h2>
                <button className="add-button">＋</button>
              </div>
              <div className="evaluation-buttons">
                <button className="eval-button">Theoretical exam</button>
                <button className="eval-button">Practical Cases</button>
              </div>
            </section>
          </>
        )}
      </main>

      {showCourseModal && (
        <CourseModal
          branchName={currentBranchName}
          onClose={() => setShowCourseModal(false)}
          onSubmit={handleAddCourse}
        />
      )}
    </div>
  );
};

export default TrainerDashboard;
