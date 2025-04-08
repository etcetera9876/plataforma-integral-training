// src/components/Trainer/CourseModal.js
import React, { useState } from "react";
import "./TrainerDashboard.css";

const CourseModal = ({ branchName = "", onClose, onSubmit }) => {
  const [courseName, setCourseName] = useState("");

  const handleSubmit = () => {
    if (!courseName.trim()) return;
  
    console.log("handleSubmit llamado con:", courseName); // DEBUG
  
    if (typeof onSubmit === "function") {
      onSubmit(courseName);
    } else {
      console.error("onSubmit no es una función:", onSubmit); // DEBUG
    }
  
    onClose();
  };
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Add course for {branchName}:</h3>

        <div className="modal-field">
          <label>Assign to:</label>
          <div className="modal-input">
            <span role="img" aria-label="group">👥</span> All students
          </div>
        </div>

        <div className="modal-field">
          <label>Name:</label>
          <input
            type="text"
            placeholder="Enter course name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            required
          />
        </div>

        <div className="modal-actions">
          <button onClick={handleSubmit}>Publish now</button>
          <button disabled>Schedule publication</button>
        </div>
      </div>
    </div>
  );
};

export default CourseModal;
