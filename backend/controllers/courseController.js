// controllers/courseController.js
const Course = require("../models/course");

exports.createCourse = async (req, res) => {
  console.log("🟢 createCourse llamado. Body recibido:", req.body); // DEBUG

  try {
    const { name, branchId, createdBy, assignedTo, publicationDate } = req.body;

    if (!name || !branchId || !createdBy || !createdBy.id || !createdBy.name) {
      console.warn("⚠️ Faltan campos requeridos:", req.body); // DEBUG
      return res.status(400).json({ message: "Missing required fields" });
    }

    const course = new Course({
      name,
      branchId,
      createdBy,
      assignedTo: assignedTo || "All recruiters",
      publicationDate: publicationDate || null,
    });

    await course.save();
    console.log("✅ Curso creado:", course); // DEBUG
    res.status(201).json(course);
  } catch (error) {
    console.error("🔴 Error creando curso:", error);
    res.status(500).json({ message: "Error creating course", error });
  }
};


exports.getCoursesByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    const courses = await Course.find({ branchId }).sort({ creationDate: -1 });
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Error fetching courses", error });
  }
};
