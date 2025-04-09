const Course = require("../models/course");
const mongoose = require("mongoose");


exports.createCourse = async (req, res) => {
  try {
    const { name, assignedTo, branchId, publicationDate, createdBy } = req.body;

    const newCourse = new Course({
      name,
      assignedTo,
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

    const courses = await Course.find({ branchId }).sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Error fetching courses", error });
  }
};

// Obtener cursos para un recruiter
exports.getCoursesForRecruiter = async (req, res) => {
  try {
    const { recruiterId, branchId } = req.query;
    console.log("Parámetros recibidos:", { recruiterId, branchId });

    if (!recruiterId || !branchId) {
      return res.status(400).json({ message: "Se requieren recruiterId y branchId" });
    }

    // Convertir branchId a ObjectId
    const branchObjectId = new mongoose.Types.ObjectId(branchId);

    // Buscar los cursos filtrados por branchId y recruiterId
    const courses = await Course.find({
      branchId: branchObjectId,
      $or: [
        { assignedTo: "All recruiters" },
        { assignedTo: { $in: [recruiterId] } },
      ],
    }).sort({ createdAt: -1 });

    console.log("Cursos encontrados:", courses);
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error al obtener los cursos para el reclutador:", error);
    res.status(500).json({ message: "Error al obtener los cursos para el reclutador", error });
  }
};