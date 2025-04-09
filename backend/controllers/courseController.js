// controllers/courseController.js
const Course = require("../models/course");

exports.createCourse = async (req, res) => {
  try {
    const { name, assignedTo, branchId, publicationDate, createdBy } = req.body;

    // Verificar si assignedTo es "All recruiters" o un array de ObjectId
    const finalAssignedTo = assignedTo === "All recruiters" ? "All recruiters" : assignedTo;

    const newCourse = new Course({
      name,
      assignedTo: finalAssignedTo,
      branchId,
      publicationDate,
      createdBy,
    });

    await newCourse.save();
    console.log("Curso creado correctamente:", newCourse);
    res.status(201).json(newCourse);
  } catch (error) {
    console.error("Error creando curso:", error);
    res.status(500).json({ message: "Error al crear el curso", error });
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

