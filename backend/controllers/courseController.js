const Course = require("../models/course");
const mongoose = require("mongoose");
const { emitDbChange } = require('../socket'); // ✅ Esto es lo correcto
const path = require('path');
const fs = require('fs');
const { getLinkPreview } = require('link-preview-js');
const { v4: uuidv4 } = require('uuid'); // Para generar globalGroupId único

// Crear un nuevo curso
exports.createCourse = async (req, res) => {
  try {
    const { name, assignedTo, branchId, publicationDate, expirationDate, createdBy, globalGroupId } = req.body;

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

    // Permitir branchId como string o array
    if (Array.isArray(branchId)) {
      // Validar todos los branchId
      const invalid = branchId.some(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalid) {
        return res.status(400).json({ message: "Uno o más branchId inválidos" });
      }
      // Generar globalGroupId si no viene del frontend
      const groupId = globalGroupId || uuidv4();
      // Crear un curso por cada branchId
      const createdCourses = [];
      for (const bId of branchId) {
        const course = new Course({
          name,
          assignedTo: assignedToTransformed,
          branchId: new mongoose.Types.ObjectId(bId),
          publicationDate: publicationDate ? new Date(publicationDate) : null,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          createdBy: {
            id: new mongoose.Types.ObjectId(createdBy.id),
            name: createdBy.name,
          },
          globalGroupId: groupId,
        });
        await course.save();
        createdCourses.push(course);
      }
      await emitDbChange();
      return res.status(201).json({ message: "Cursos creados correctamente", courses: createdCourses, globalGroupId: groupId });
    } else {
      // Modo sucursal único (string)
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ message: "branchId inválido" });
      }
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
        globalGroupId: globalGroupId || null,
      });
      await course.save();
      await emitDbChange();
      return res.status(201).json({ message: "Curso creado correctamente", course });
    }
  } catch (error) {
    console.error("Error al crear el curso:", error);
    res.status(500).json({ message: "Error interno al crear el curso", error: error.message });
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

    const recruiterObjectId = mongoose.Types.ObjectId.isValid(recruiterId)
      ? new mongoose.Types.ObjectId(recruiterId)
      : recruiterId;

    const currentDate = new Date();

    // Si branchId es 'Global', no filtrar por branchId
    let filter = {
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
    };
    if (branchId !== 'Global') {
      const branchObjectId = new mongoose.Types.ObjectId(branchId);
      filter.branchId = branchObjectId;
    }

    const courses = await Course.find(filter).sort({ createdAt: -1 });

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

    // No eliminar las firmas relacionadas (CourseSignature), solo el curso
    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    // No eliminar CourseSignature: se mantienen como registro histórico
    // Si quieres hacer un soft delete, puedes agregar un campo deleted: true en CourseSignature

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

// Endpoint para obtener metadatos de un enlace (link preview)
// POST /api/link-preview { url: 'https://...' }
exports.linkPreview = async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL inválida' });
  }
  try {
    const data = await getLinkPreview(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener la vista previa del enlace', details: error.message });
  }
};

// Firma de curso: consultar si el usuario ya firmó
exports.getCourseSignature = async (req, res) => {
  try {
    const { id } = req.params; // courseId
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ signed: false, message: 'Falta userId' });
    const CourseSignature = require('../models/courseSignature');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const exists = await CourseSignature.findOne({ courseId: id, userId: userObjectId });
    res.json({ signed: !!exists });
  } catch (err) {
    res.status(500).json({ signed: false, message: 'Error al consultar firma', error: err.message });
  }
};

// Firma de curso: guardar firma
exports.signCourse = async (req, res) => {
  try {
    const { id } = req.params; // courseId
    const { userId, name } = req.body;
    if (!userId || !name) return res.status(400).json({ message: 'Faltan datos' });
    const CourseSignature = require('../models/courseSignature');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    // Evitar firmas duplicadas
    const exists = await CourseSignature.findOne({ courseId: id, userId: userObjectId });
    if (exists) return res.status(409).json({ message: 'Ya firmado' });
    // Obtener usuario y curso antes de crear la firma
    const User = require('../models/user');
    const user = await User.findById(userObjectId);
    const course = await require('../models/course').findById(id);
    // Crear la firma guardando también courseName y userName
    const signature = new CourseSignature({
      courseId: id,
      userId: userObjectId,
      name,
      courseName: course ? course.name : null,
      userName: user ? user.name : null
    });
    await signature.save();

    // Generar PDF si no existe
    const path = require('path');
    const fs = require('fs');
    const pdfFileName = `certificate-${signature._id}.pdf`;
    const pdfPath = path.join(__dirname, '../uploads', pdfFileName);
    if (!fs.existsSync(pdfPath)) {
      const { generateCertificatePDF } = require('./certificateController');
      await generateCertificatePDF({ signature, user, course, outputPath: pdfPath });
    }

    // Log detallado antes de emitir el evento
    console.log('[signCourse] Firma guardada:', {
      signatureId: signature._id,
      userId: user ? user._id : userId,
      userName: user ? user.name : name,
      courseId: course ? course._id : id,
      courseName: course ? course.name : undefined
    });

    // Construir objeto certificado
    const certificado = {
      id: signature._id,
      userName: user.name,
      courseName: course.name,
      signedAt: signature.signedAt,
      pdfUrl: `/api/certificates/${signature._id}/download`
    };

    // Emitir evento de firma por socket.io (certificateSigned con datos completos)
    const { ioInstance } = require('../socket');
    const branchIdStr = course && course.branchId ? String(course.branchId) : undefined;
    if (ioInstance) {
      console.log('[SOCKET][BACKEND] Emite certificateSigned:', { ...certificado, branchId: branchIdStr });
      ioInstance.emit('certificateSigned', { ...certificado, branchId: branchIdStr });
    }
    // Emitir evento de cambio en la base de datos
    const { emitDbChange } = require('../socket');
    await emitDbChange();
    console.log('[signCourse] emitDbChange llamado tras firma de curso.');
    res.json({ message: 'Firma guardada', signature });
  } catch (err) {
    console.error('[ERROR][signCourse]', err); // Log detallado del error
    res.status(500).json({ message: 'Error al guardar firma', error: err.message });
  }
};

// Obtener todos los IDs de cursos firmados por un usuario
exports.getSignedCourses = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'Falta userId' });
    const CourseSignature = require('../models/courseSignature');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const signatures = await CourseSignature.find({ userId: userObjectId }, 'courseId');
    const signedCourseIds = signatures.map(sig => String(sig.courseId));
    res.json({ signedCourseIds });
  } catch (err) {
    console.error('[ERROR] getSignedCourses:', err);
    res.status(500).json({ message: 'Error al obtener cursos firmados', error: err.message });
  }
};

// Obtener todos los cursos (modo global, sin filtro por branch)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error al obtener todos los cursos:", error);
    res.status(500).json({ message: "Error al obtener todos los cursos", error });
  }
};
