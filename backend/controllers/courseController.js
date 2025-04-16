const Course = require("../models/course");
const mongoose = require("mongoose");
const { emitDbChange } = require('../socket'); // ✅ Esto es lo correcto

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
      publicationDate,
      expirationDate,
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

    console.log("[DEBUG][getCoursesForRecruiter] recruiterId:", recruiterId);
    console.log("[DEBUG][getCoursesForRecruiter] branchId:", branchId);

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

    console.log("[DEBUG][getCoursesForRecruiter] Cursos encontrados:", courses.map(c => ({_id: c._id, name: c.name, assignedTo: c.assignedTo, branchId: c.branchId})));

    res.status(200).json(courses);
  } catch (error) {
    console.error("Error al obtener los cursos para el reclutador:", error);
    res.status(500).json({
      message: "Error al obtener los cursos para el reclutador",
      error,
    });
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

    // Log para depuración: ver cómo queda assignedTo antes de guardar
    console.log("[DEBUG][updateCourse] assignedTo a guardar:", updates.assignedTo);

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updates, { new: true });
    if (!updatedCourse) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    // Log para depuración: ver cómo quedó guardado en la BD
    console.log("[DEBUG][updateCourse] assignedTo guardado en BD:", updatedCourse.assignedTo);
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
  console.log("ID recibido para eliminar:", req.params.courseId); // Log para depuración
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