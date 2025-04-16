const Course = require("../models/course");
const mongoose = require("mongoose");

// Crear un nuevo curso
exports.createCourse = async (req, res) => {
  try {
    const { name, assignedTo, branchId, publicationDate, expirationDate, createdBy } = req.body;

    if (!name || !assignedTo || !branchId || !createdBy) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    const newCourse = new Course({
      name,
      assignedTo,
      branchId,
      publicationDate: publicationDate || null,
      expirationDate: expirationDate || null, // Guardar la fecha límite
      createdBy,
    });

    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    console.error("Error al crear el curso:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener todos los cursos por sucursal
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



// Obtener cursos para un reclutador (solo cursos publicados o sin fecha programada)
exports.getCoursesForRecruiter = async (req, res) => {
  try {
    const { recruiterId, branchId } = req.query;

    if (!recruiterId || !branchId) {  
      return res
        .status(400)
        .json({ message: "Se requieren recruiterId y branchId" });
    }

    // Convertir branchId a ObjectId
    const branchObjectId = new mongoose.Types.ObjectId(branchId);

    // Fecha y hora actual en UTC
    const currentDate = new Date();

    // Buscar los cursos filtrados por branchId, recruiterId y fecha de publicación
    const courses = await Course.find({
      branchId: branchObjectId,
      // Filtrar por fecha de publicación
      $and: [
        {
          $or: [
            { publicationDate: { $lte: currentDate } }, // Cursos ya publicados
            { publicationDate: null }, // Cursos sin fecha programada
          ],
        },
        {
          $or: [
            { assignedTo: "All recruiters" }, // Asignados a todos los reclutadores
            { assignedTo: { $in: [recruiterId] } }, // Asignados a un reclutador específico
          ],
        },
      ],
    }).sort({ createdAt: -1 }); // Ordenar por fecha de creación (más reciente primero)

    res.status(200).json(courses);
  } catch (error) {
    console.error("Error al obtener los cursos para el reclutador:", error);
    res.status(500).json({
      message: "Error al obtener los cursos para el reclutador",
      error,
    });
  }
};