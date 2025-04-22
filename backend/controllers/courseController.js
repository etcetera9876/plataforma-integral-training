const Course = require("../models/course");
const mongoose = require("mongoose");
const { emitDbChange } = require('../socket'); // ✅ Esto es lo correcto
const path = require('path');
const fs = require('fs');

// Crear un nuevo curso
exports.createCourse = async (req, res) => {
  try {
    const { name, assignedTo, branchId, publicationDate, expirationDate, createdBy } = req.body;

    // Validar y transformar `assignedTo`
    let assignedToTransformed;
    if (assignedTo === "All recruiters") {
      assignedToTransformed = ["All recruiters"];
    } else if (Array.isArray(assignedTo)) {
      assignedToTransformed = assignedTo.map((id) => {
        if (id === "All recruiters") return "All recruiters";
        return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
      });
    } else {
      return res.status(400).json({ message: "Formato inválido para assignedTo" });
    }

    // Validar y transformar `branchId`
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: "branchId inválido" });
    }

    // Crear el curso
    const course = new Course({
      name,
      assignedTo: assignedToTransformed,
      branchId: new mongoose.Types.ObjectId(branchId),
      publicationDate: publicationDate ? new Date(publicationDate) : null,
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      createdBy: {
        id: new mongoose.Types.ObjectId(createdBy.id),
        name: createdBy.name,
      },
    });

    await course.save();
    await emitDbChange();
    res.status(201).json({ message: "Curso creado correctamente", course });
  } catch (error) {
    console.error("Error al crear el curso:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
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

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const recruiterObjectId = mongoose.Types.ObjectId.isValid(recruiterId)
      ? new mongoose.Types.ObjectId(recruiterId)
      : recruiterId;

    const currentDate = new Date();
    console.log('[DEBUG] currentDate (UTC):', currentDate.toISOString());

    const courses = await Course.find({
      branchId: branchObjectId,
      $and: [
        {
          $or: [
            { publicationDate: { $lte: currentDate } },
            { publicationDate: null },
          ],
        },
        {
          $or: [
            { assignedTo: "All recruiters" },
            { assignedTo: { $in: [recruiterObjectId, recruiterId] } },
          ],
        },
      ],
    }).sort({ createdAt: -1 });

    // Log para depuración de fechas de publicación
    courses.forEach(c => {
      console.log(`[DEBUG] Curso: ${c.name}, publicationDate: ${c.publicationDate ? c.publicationDate.toISOString() : 'null'}`);
    });

    res.status(200).json(courses);
  } catch (error) {
    console.error("Error al obtener los cursos para el reclutador:", error);
    res.status(500).json({
      message: "Error al obtener los cursos para el reclutador",
      error,
    });
  }
};

// Obtener un curso por su ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de curso inválido" });
    }
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }
    res.status(200).json(course);
  } catch (error) {
    console.error("Error al obtener el curso por ID:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    let updates = req.body;

    // Procesar y transformar assignedTo igual que en createCourse
    if (updates.assignedTo) {
      if (updates.assignedTo === "All recruiters") {
        updates.assignedTo = ["All recruiters"];
      } else if (Array.isArray(updates.assignedTo)) {
        updates.assignedTo = updates.assignedTo.map((id) => {
          if (id === "All recruiters") return "All recruiters";
          return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
        });
      } else {
        return res.status(400).json({ message: "Formato inválido para assignedTo" });
      }
    }

    // Sumar 4 horas a publicationDate y expirationDate si existen en updates
    if (updates.publicationDate) {
      let pubDate = new Date(updates.publicationDate);
      // Si la fecha viene como string sin zona horaria, se interpreta como local
      pubDate.setHours(pubDate.getHours() + 4);
      updates.publicationDate = pubDate;
    }
    if (updates.expirationDate) {
      let expDate = new Date(updates.expirationDate);
      expDate.setHours(expDate.getHours() + 4);
      updates.expirationDate = expDate;
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updates, { new: true });
    if (!updatedCourse) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    await emitDbChange();
    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("Error al actualizar el curso:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

exports.toggleLockCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    course.isLocked = !course.isLocked; // Cambiar el estado de bloqueo
    await course.save();

    await emitDbChange();

    res.status(200).json({ message: `Curso ${course.isLocked ? "bloqueado" : "desbloqueado"}`, isLocked: course.isLocked });
  } catch (error) {
    console.error("Error al cambiar el estado de bloqueo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    res.status(200).json({ message: "Curso eliminado correctamente" });
    await emitDbChange();
  } catch (error) {
    console.error("Error al eliminar el curso:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Subida de archivos para recursos de cursos
exports.uploadResource = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }
    // Construir la URL pública del archivo
    const url = `/uploads/${req.file.filename}`;
    res.status(200).json({ url });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ message: 'Error interno al subir archivo' });
  }
};