const mongoose = require('mongoose');
const Assessment = require('../models/assessment');
const Block = require('../models/block');
const { exec } = require("child_process");
const path = require("path");
const multer = require("multer");
const Subtest = require('../models/subtest');

// Configuración de multer para guardar archivos en /uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueSuffix);
  }
});
const upload = multer({ storage });

// Controlador para subir archivos PDF a /uploads
const uploadPdf = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  res.json({ filename: req.file.filename });
};

exports.getAssessments = async (req, res) => {
  try {
    const { branchId } = req.query;
    let filter = {};
    if (branchId && branchId !== 'Global') {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ message: 'branchId inválido' });
      }
      filter.branch = new mongoose.Types.ObjectId(branchId);
    } else if (branchId === 'Global') {
      filter.branch = 'Global';
    }
    const assessments = await Assessment.find(filter).sort({ createdAt: -1 });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener evaluaciones', error: error.message });
  }
};

exports.createAssessment = async (req, res) => {
  try {
    console.log("REQ.BODY ASSESSMENT:", req.body); // <-- LOG PARA DEPURAR
    const { name, description, branch, components, block, publicationDate, expirationDate, assignedTo } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El campo "name" es obligatorio.' });
    }
    if (!branch || !mongoose.Types.ObjectId.isValid(branch)) {
      return res.status(400).json({ message: 'El campo "branch" es inválido o no está definido.' });
    }
    if (!components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ message: 'El campo "components" debe ser un array con al menos un elemento.' });
    }

    // LOG extra para ver tipos
    console.log("TIPOS:", {
      branch: typeof branch,
      block: typeof block,
      components,
      assignedTo,
    });

    // Adaptar components: aceptar array de IDs o array de objetos { block, weight }
    let adaptedComponents = components;
    if (typeof components[0] === 'string' || typeof components[0] === 'number') {
      // Si es array de IDs, consultar el peso real de cada bloque
      const blocks = await Block.find({ _id: { $in: components } });
      const blockWeightMap = {};
      blocks.forEach(b => { blockWeightMap[b._id.toString()] = b.weight; });
      adaptedComponents = components.map(id => ({ block: id, weight: blockWeightMap[id.toString()] || 100 }));
    }
    // Obtener labels de los bloques
    const blockIds = adaptedComponents.map(c => c.block);
    const blocks = await Block.find({ _id: { $in: blockIds } });
    const blockMap = {};
    blocks.forEach(b => { blockMap[b._id.toString()] = b.label; });
    // Agregar label a cada componente
    const componentsWithLabels = adaptedComponents.map(c => ({
      block: c.block,
      label: blockMap[c.block.toString()] || '',
      weight: c.weight
    }));
    const assessment = new Assessment({
      name,
      description,
      branch,
      components: componentsWithLabels,
      block,
      publicationDate,
      expirationDate,
      assignedTo,
      createdBy: req.body.createdBy,
    });
    await assessment.save();
    res.status(201).json({ message: 'Evaluación creada con éxito', assessment });
  } catch (error) {
    console.error("ERROR AL CREAR ASSESSMENT:", error); // <-- LOG PARA DEPURAR
    res.status(500).json({ message: 'Error al crear la evaluación', error: error.message });
  }
};

exports.getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id);
    if (!assessment) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la evaluación', error: error.message });
  }
};

exports.updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description, branch, components, block, publicationDate, expirationDate, assignedTo, questions, evaluationType, filters } = req.body;
    // Adaptar components: aceptar array de IDs o array de objetos { block, weight }
    let adaptedComponents = components;
    if (Array.isArray(components) && (typeof components[0] === 'string' || typeof components[0] === 'number')) {
      adaptedComponents = components.map(id => ({ block: id, weight: 100 }));
    }
    // Obtener labels de los bloques
    const blockIds = adaptedComponents.map(c => c.block);
    const blocks = await Block.find({ _id: { $in: blockIds } });
    const blockMap = {};
    blocks.forEach(b => { blockMap[b._id.toString()] = b.label; });
    // Agregar label a cada componente
    const componentsWithLabels = adaptedComponents.map(c => ({
      block: c.block,
      label: blockMap[c.block.toString()] || '',
      weight: c.weight
    }));
    const updated = await Assessment.findByIdAndUpdate(
      id,
      { name, description, branch, components: componentsWithLabels, block, publicationDate, expirationDate, assignedTo, questions, evaluationType, filters },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }
    res.json({ message: 'Evaluación actualizada', assessment: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la evaluación', error: error.message });
  }
};

exports.deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    // Eliminar subtests relacionados antes de eliminar el assessment principal
    const Subtest = require('../models/subtest');
    await Subtest.deleteMany({ assessment: id });
    const deleted = await Assessment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }
    res.json({ message: 'Evaluación eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la evaluación', error: error.message });
  }
};

exports.toggleLockAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id);
    if (!assessment) {
      return res.status(404).json({ message: 'Evaluación no encontrada' });
    }
    assessment.isLocked = !assessment.isLocked;
    await assessment.save();
    res.json({ message: 'Estado de bloqueo actualizado', assessment });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado de bloqueo', error: error.message });
  }
};

// Convierte la primera página de un PDF subido a imagen PNG y devuelve la ruta
exports.convertPdfToImage = async (req, res) => {
  try {
    const { pdfFile } = req.body;
    if (!pdfFile) return res.status(400).json({ error: "Falta el nombre del archivo PDF" });
    const pdfPath = path.join(__dirname, "../uploads", pdfFile);
    const outputBase = pdfFile.replace(/\.[^.]+$/, "");
    // Asegura que la imagen se guarde en la carpeta uploads
    const outputPath = path.join(__dirname, "../uploads", `${outputBase}-0.png`);
    // Solo convertir la primera página del PDF
    const cmd = `magick "${pdfPath}[0]" "${outputPath}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Error ejecutando magick:", error, stderr);
        return res.status(500).json({ error: "Error ejecutando magick", details: stderr });
      }
      // Devuelve la ruta de la primera imagen generada
      res.json({ imagePath: `/uploads/${outputBase}-0.png` });
    });
  } catch (err) {
    console.error("Error general convertPdfToImage:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};

// Generar tests personalizados para múltiples usuarios
exports.generateMultiAssessments = async (req, res) => {
  try {
    const { name, description, branch, assignedTo, components, questionFilters, maxRepeats } = req.body;
    let userIds = assignedTo;
    // Si es All branch o All recruiters, buscar todos los usuarios cuyo place sea el nombre del branch
    if (assignedTo === 'All branch' || (Array.isArray(assignedTo) && assignedTo[0] === 'All recruiters')) {
      const Branch = require('../models/branch');
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) return res.status(400).json({ message: 'Branch no encontrado' });
      const users = await require('../models/user').find({ place: branchDoc.name });
      userIds = users.map(u => u._id.toString());
    }
    // Obtener todas las preguntas filtradas
    const Question = require('../models/question');
    const allQuestions = await Question.find({
      difficulty: questionFilters.difficulty,
      ...(questionFilters.topic ? { topic: questionFilters.topic } : {})
    });
    // Agrupar preguntas por tipo
    const questionsByType = {};
    allQuestions.forEach(q => {
      if (!questionsByType[q.type]) questionsByType[q.type] = [];
      questionsByType[q.type].push(q);
    });
    // Algoritmo de asignación
    const tests = [];
    const usedQuestions = {};
    let missing = [];
    for (const userId of userIds) {
      let testQuestions = [];
      for (const [type, count] of Object.entries(questionFilters.counts)) {
        if (count > 0) {
          let pool = questionsByType[type] || [];
          pool = pool.filter(q => (usedQuestions[q._id] || 0) < (maxRepeats || 1));
          const shuffled = pool.sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, count);
          selected.forEach(q => {
            usedQuestions[q._id] = (usedQuestions[q._id] || 0) + 1;
          });
          testQuestions = testQuestions.concat(selected);
          if (selected.length < count) {
            missing.push({ userId, type, missing: count - selected.length });
          }
        }
      }
      tests.push({ userId, name, description, branch, components, questions: testQuestions });
    }
    res.json({ tests, missing });
  } catch (error) {
    res.status(500).json({ message: 'Error al generar tests personalizados', error: error.message });
  }
};

// Guardar subtests personalizados para un assessment
exports.saveSubtests = async (req, res) => {
  try {
    const { id } = req.params; // assessmentId
    const { subtests } = req.body;
    if (!Array.isArray(subtests) || subtests.length === 0) {
      return res.status(400).json({ message: 'No se enviaron subtests' });
    }
    // Validar que el assessment existe
    const assessment = await Assessment.findById(id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment no encontrado' });
    }
    // Eliminar subtests anteriores antes de guardar los nuevos
    await Subtest.deleteMany({ assessment: id });
    // Guardar cada subtest
    const created = [];
    for (const st of subtests) {
      if (!st.userId || !st.questions || !Array.isArray(st.questions)) continue;
      const subtest = new Subtest({
        assessment: id,
        userId: st.userId,
        name: st.name || assessment.name,
        description: st.description || assessment.description,
        block: st.block || (assessment.components && assessment.components[0]?.block),
        questions: st.questions,
      });
      await subtest.save();
      created.push(subtest);
    }
    res.status(201).json({ message: 'Subtests guardados', subtests: created });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar subtests', error: error.message });
  }
};

// Obtener subtests de un assessment
exports.getSubtests = async (req, res) => {
  try {
    const { id } = req.params;
    const Subtest = require('../models/subtest');
    const subtests = await Subtest.find({ assessment: id });
    res.json(subtests);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener subtests', error: error.message });
  }
};

// Obtener evaluaciones asignadas a un usuario y branch (con estado de subtest)
exports.getAssignedAssessments = async (req, res) => {
  try {
    console.log('--- getAssignedAssessments called ---');
    const { userId, branchId } = req.query;
    console.log('Params:', { userId, branchId });
    if (!userId || !branchId) {
      console.log('Faltan parámetros');
      return res.status(400).json({ message: 'Faltan parámetros userId o branchId' });
    }
    const branchObjectId = mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : branchId;
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const assessments = await Assessment.find({
      branch: branchObjectId,
      assignedTo: { $in: [userId, userObjectId, "All recruiters"] }
    }).sort({ createdAt: -1 });
    // Buscar subtest para cada assessment y userId
    const Subtest = require('../models/subtest');
    const assessmentsWithStatus = await Promise.all(assessments.map(async (a) => {
      const subtest = await Subtest.findOne({ assessment: a._id, userId });
      return {
        ...a.toObject(),
        submittedAt: subtest?.submittedAt || null,
        submittedAnswers: subtest?.submittedAnswers || null
      };
    }));
    res.json(assessmentsWithStatus);
  } catch (error) {
    console.error("Error en getAssignedAssessments:", error);
    res.status(500).json({ message: 'Error al obtener evaluaciones asignadas', error: error.message, stack: error.stack });
  }
};

// Guardar respuestas de un usuario para un assessment
exports.submitAssessment = async (req, res) => {
  try {
    const { id } = req.params; // assessmentId
    const { userId, answers } = req.body;
    if (!userId || !answers) {
      return res.status(400).json({ message: 'Faltan userId o answers' });
    }
    // Busca el subtest correspondiente
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const Subtest = require('../models/subtest');
    const subtest = await Subtest.findOne({ assessment: id, userId: userObjectId });
    if (!subtest) {
      return res.status(404).json({ message: 'No se encontró el subtest para este usuario' });
    }
    // Guarda las respuestas en el subtest
    subtest.submittedAnswers = answers;
    subtest.submittedAt = new Date();
    await subtest.save();
    // Notificar por correo al trainer (placeholder, integrar nodemailer)
    try {
      const User = require('../models/user');
      const assessment = await Assessment.findById(id);
      const recruiter = await User.findById(userId);
      const trainer = await User.findById(assessment.createdBy?.id);
      if (trainer && trainer.email) {
        // Aquí deberías integrar nodemailer o tu sistema de correo
        console.log(`[NOTIFICACIÓN] El reclutador ${recruiter?.name || userId} ha realizado el test "${assessment.name}". Notificar a: ${trainer.email}`);
        // await sendMail(trainer.email, ...)
      }
    } catch (notifyErr) {
      console.error('Error al notificar al trainer:', notifyErr);
    }
    res.json({ message: 'Respuestas guardadas correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar respuestas', error: error.message });
  }
};

module.exports.uploadPdf = uploadPdf;