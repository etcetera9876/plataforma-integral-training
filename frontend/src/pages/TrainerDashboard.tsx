// src/pages/TrainerDashboard.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";

interface Branch {
  _id: string;
  name: string;
  address: string;
}

interface Course {
  _id: string;
  name: string;
  assignedTo: string;
  creationDate: string;
  publicationDate: string | null;
}

const TrainerDashboard: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [courseName, setCourseName] = useState("");
  const [assignedTo, setAssignedTo] = useState("All students");

  const trainerId = "trainer123"; // esto debería venir del login/session

  // Get all branches
  useEffect(() => {
    axios.get("http://localhost:5000/api/branches")
      .then(res => setBranches(res.data))
      .catch(err => console.error("Error loading branches", err));
  }, []);

  // Get courses of selected branch
  useEffect(() => {
    if (selectedBranch) {
      axios.get(`http://localhost:5000/api/courses/${selectedBranch}`)
        .then(res => setCourses(res.data))
        .catch(err => console.error("Error loading courses", err));
    }
  }, [selectedBranch]);

  const handleCreateCourse = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/courses", {
        name: courseName,
        branchId: selectedBranch,
        createdBy: trainerId,
        assignedTo,
      });
      setCourses([...courses, response.data]);
      setShowModal(false);
      setCourseName("");
    } catch (error) {
      console.error("Error creating course", error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Trainer Dashboard</h1>

      <label className="block mb-2 font-semibold">Select the branch:</label>
      <select
        value={selectedBranch}
        onChange={(e) => setSelectedBranch(e.target.value)}
        className="border p-2 rounded mb-4"
      >
        <option value="">-- Select --</option>
        {branches.map(branch => (
          <option key={branch._id} value={branch._id}>
            {branch.name}
          </option>
        ))}
      </select>

      {selectedBranch && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Courses:</h2>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 text-white px-3 py-1 rounded"
            >
              + Add Course
            </button>
          </div>

          <ul className="space-y-2">
            {courses.map(course => (
              <li key={course._id} className="border p-2 rounded">
                <strong>{course.name}</strong> - {course.assignedTo}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
          <div className="bg-white p-6 rounded w-96 shadow-lg">
            <h2 className="text-lg font-bold mb-4">Add Course</h2>

            <label className="block mb-2">Course Name</label>
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="border w-full p-2 mb-4 rounded"
              placeholder="Example: Revised W-4"
            />

            <label className="block mb-2">Assign to</label>
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="border w-full p-2 mb-4 rounded"
              placeholder="All students"
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCourse}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;
