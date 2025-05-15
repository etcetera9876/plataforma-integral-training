const mongoose = require('mongoose');
const Assessment = require('../models/assessment');
const Block = require('../models/block');
const { exec } = require("child_process");
const path = require("path");
const multer = require("multer");
const Subtest = require('../models/subtest');
const nodemailer = require('nodemailer');
const { emitDbChange } = require('../socket');
const { isOpenAnswerCorrect } = require('../utils/openai');
const ResetLog = require('../models/resetLog');

// Configuración nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // Cambia según tu proveedor
  auth: {
    user: process.env.NOTIFY_EMAIL_USER || 'tucorreo@gmail.com',
    pass: process.env.NOTIFY_EMAIL_PASS || 'tu_contraseña_de_aplicacion'
  }
});

async function sendNotificationEmail(to, subject, text) {
  await transporter.sendMail({
    from: process.env.NOTIFY_EMAIL_USER || 'tucorreo@gmail.com',
    to,
    subject,
    text
  });
}

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
    const { name, description, branch, components, block, publicationDate, expirationDate, assignedTo, relatedCourses } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El campo "name" es obligatorio.' });
    }
    if (!branch || !mongoose.Types.ObjectId.isValid(branch)) {
      return res.status(400).json({ message: 'El campo "branch" es inválido o no está definido.' });
    }
    if (!components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ message: 'El campo "components" debe ser un array con al menos un elemento.' });
    }

 

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
      relatedCourses: Array.isArray(relatedCourses) ? relatedCourses : [],
    });
    await assessment.save();
    await emitDbChange(); // <--- Notifica a los clientes en tiempo real
    res.status(201).json({ message: 'Evaluación creada correctamente', assessment });
  } catch (error) {
    
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
    let { name, description, branch, components, block, publicationDate, expirationDate, assignedTo, questions, evaluationType, filters, relatedCourses } = req.body;
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
      { name, description, branch, components: componentsWithLabels, block, publicationDate, expirationDate, assignedTo, questions, evaluationType, filters, relatedCourses: Array.isArray(relatedCourses) ? relatedCourses : [] },
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
    await emitDbChange(); // <--- Notifica a los clientes en tiempo real
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
    await emitDbChange(); // Notifica a los clientes en tiempo real
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
    const { name, description, branch, assignedTo, components, questionFilters, maxRepeats, timer } = req.body;
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
      tests.push({ userId, name, description, branch, components, questions: testQuestions, timer });
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
        timer: st.timer && st.timer >= 10 ? st.timer : undefined,
      });
      await subtest.save();
      created.push(subtest);
    }
    res.status(201).json({ message: 'Subtests guardados', subtests: created });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar subtests', error: error.message });
  }
};

// Obtener subtests de un assessment con usuario populado
exports.getSubtests = async (req, res) => {
  try {
    const { id } = req.params;
    const Subtest = require('../models/subtest');
    // Populate userId con nombre y email
    const subtests = await Subtest.find({ assessment: id }).populate('userId', 'name email');
    res.json(subtests);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener subtests', error: error.message });
  }
};

// Obtener evaluaciones asignadas a un usuario y branch (con estado de subtest)
exports.getAssignedAssessments = async (req, res) => {
  try {
    const { userId, branchId } = req.query;
    if (!userId || !branchId) {
      return res.status(400).json({ message: 'Faltan parámetros userId o branchId' });
    }
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    // Si branchId es 'Global', no filtrar por branch
    let filter = {
      assignedTo: { $in: [userId, userObjectId, "All recruiters"] }
    };
    if (branchId !== 'Global') {
      const branchObjectId = mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : branchId;
      filter.branch = branchObjectId;
    }
    const assessments = await Assessment.find(filter).sort({ createdAt: -1 });
    // Buscar subtest para cada assessment y userId
    const Subtest = require('../models/subtest');
    const CourseSignature = require('../models/courseSignature');
    const Course = require('../models/course');
    let assessmentsWithStatus = await Promise.all(assessments.map(async (a) => {
      const subtest = await Subtest.findOne({ assessment: a._id, userId });
      // Lógica de desbloqueo: si no hay cursos relacionados, canTakeTest = true
      let canTakeTest = true;
      let relatedCourseNames = [];
      if (Array.isArray(a.relatedCourses) && a.relatedCourses.length > 0) {
        // Verifica si el usuario ha firmado todos los cursos relacionados
        const signedCount = await CourseSignature.countDocuments({
          userId,
          courseId: { $in: a.relatedCourses }
        });
        canTakeTest = signedCount === a.relatedCourses.length;
        // Obtener nombres de los cursos relacionados
        const courses = await Course.find({ _id: { $in: a.relatedCourses } });
        relatedCourseNames = courses.map(c => c.name);
      }
      // Si el subtest fue reseteado (submittedAt == null) y no puede tomar el test, no mostrarlo
      // CORREGIDO: Solo ocultar si NO puede tomar el test (no ha firmado todos los cursos relacionados)
      if (subtest && subtest.submittedAt == null && !canTakeTest) {
        return null;
      }
      // Si el subtest fue reseteado pero ya firmó todos los cursos relacionados, mostrarlo (permitir reintento)
      return {
        ...a.toObject(),
        submittedAt: subtest?.submittedAt || null,
        submittedAnswers: subtest?.submittedAnswers || null,
        canTakeTest,
        relatedCourseNames
      };
    }));
    // Filtrar los assessments nulos (tests reseteados ocultos)
    assessmentsWithStatus = assessmentsWithStatus.filter(a => a !== null);
    res.json(assessmentsWithStatus);
  } catch (error) {
    console.error("Error en getAssignedAssessments:", error);
    res.status(500).json({ message: 'Error al obtener evaluaciones asignadas', error: error.message, stack: error.stack });
  }
};

// Guardar respuestas de un usuario para un assessment
exports.submitAssessment = async (req, res) => {
  const startAll = Date.now();
  try {
    const { id } = req.params; // assessmentId
    const { userId, answers } = req.body;
    if (!userId || !answers) {
      return res.status(400).json({ message: 'Faltan userId o answers' });
    }
    const t1 = Date.now();
    // Busca el subtest correspondiente
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const Subtest = require('../models/subtest');
    const subtest = await Subtest.findOne({ assessment: id, userId: userObjectId });
    const t2 = Date.now();
    if (!subtest) {
      return res.status(404).json({ message: 'No se encontró el subtest para este usuario' });
    }
    // Guarda las respuestas en el subtest
    subtest.submittedAnswers = answers;
    subtest.submittedAt = new Date();

    // --- AUTOCORRECCIÓN AUTOMÁTICA ---
    // Obtener las preguntas originales del subtest
    const questions = subtest.questions || [];
    let correctCount = 0;
    let totalQuestions = questions.length;
    let correctMap = {};
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let userAnswer = answers[i];
      let correctAnswer = q.correctAnswer;
      let isCorrect = false;
      let iaReason = undefined;
      if (q.type === 'single' || q.type === 'single-choice') {
        isCorrect = String(userAnswer).trim() === String(correctAnswer).trim();
      } else if (q.type === 'boolean') {
        const toBool = v => v === true || v === 'Verdadero' || v === 'true';
        isCorrect = toBool(userAnswer) === toBool(correctAnswer);
      } else if (q.type === 'multiple' || q.type === 'multiple-choice') {
        const toArr = v => Array.isArray(v) ? v.map(String).map(s => s.trim()) :
          typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
        const arrUser = toArr(userAnswer).sort();
        const arrCorrect = toArr(correctAnswer).sort();
        isCorrect = arrUser.length === arrCorrect.length && arrUser.every((val, idx) => val === arrCorrect[idx]);
      } else if (q.type === 'form-dynamic') {
        if (typeof correctAnswer === 'string') {
          try { correctAnswer = JSON.parse(correctAnswer); } catch {}
        }
        // Si es array, tomar el primer elemento
        if (Array.isArray(correctAnswer)) {
          correctAnswer = correctAnswer[0] || {};
        }
        if (typeof userAnswer === 'string') {
          try { userAnswer = JSON.parse(userAnswer); } catch {}
        }
        if (typeof correctAnswer === 'object' && correctAnswer && typeof userAnswer === 'object' && userAnswer) {
          const correctKeys = Object.keys(correctAnswer);
          isCorrect = correctKeys.length > 0 && correctKeys.every(key => {
            const userVal = userAnswer[key];
            const correctVal = correctAnswer[key];
            // --- Comparación inteligente para fechas ---
            // Si ambos parecen fechas, comparar como fechas
            if (typeof userVal === 'string' && typeof correctVal === 'string') {
              // Detecta formatos de fecha comunes
              const dateRegex = /^(\d{2}[-\/]\d{2}[-\/]\d{4}|\d{4}[-\/]\d{2}[-\/]\d{2})$/;
              // Permitir también ISO (yyyy-mm-dd)
              const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
              if ((dateRegex.test(userVal) || isoDateRegex.test(userVal)) && (dateRegex.test(correctVal) || isoDateRegex.test(correctVal))) {
                // Intenta parsear ambas fechas
                const parseDate = s => {
                  // MM/dd/yyyy o MM-dd-yyyy (NUEVO: primero MM/dd/yyyy)
                  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(s)) {
                    const [m, d, y] = s.split(/[\/\-]/);
                    return new Date(`${y}-${m}-${d}`);
                  }
                  // yyyy-mm-dd o yyyy/mm/dd
                  if (/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(s)) {
                    return new Date(s.replace(/[\/]/g, '-'));
                  }
                  // yyyy-mm-dd (ISO)
                  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                    return new Date(s);
                  }
                  return null;
                };
                const dateA = parseDate(userVal);
                const dateB = parseDate(correctVal);
                if (dateA && dateB && dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate()) {
                  return true;
                }
              }
            }
            // Comparación normal (string)
            return String(userVal).trim() === String(correctVal).trim();
          });
        } else {
          isCorrect = false;
        }
      } else if (q.type === 'open' || q.type === 'case') {
        // --- IA autocorrección para preguntas abiertas ---
        if (userAnswer && q.correctAnswerIA) {
          const iaResult = await isOpenAnswerCorrect(userAnswer, q.correctAnswerIA);
          isCorrect = iaResult.isCorrect;
          iaReason = iaResult.iaReason;
        } else {
          isCorrect = null;
        }
      }
      if (isCorrect === true) correctCount++;
      // Guardar razonamiento IA solo para preguntas abiertas
      correctMap[i] = (iaReason !== undefined) ? { isCorrect, iaReason } : isCorrect;
    }
    subtest.correctCount = correctCount;
    subtest.totalQuestions = totalQuestions;
    subtest.score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : null;
    subtest.correctMap = correctMap;
    // --- FIN AUTOCORRECCIÓN ---

    // Notificar en tiempo real a los trainers (socket.io)
    const { emitDbChange } = require('../socket');

    const t3 = Date.now();
    await subtest.save();
    emitDbChange();
    const t4 = Date.now();
    // Notificar por correo al trainer (nodemailer) de forma asíncrona
    (async () => {
      try {
        const User = require('../models/user');
        const assessment = await Assessment.findById(id);
        const recruiter = await User.findById(userId);
        const trainer = await User.findById(assessment.createdBy?.id);
        const subject = `El reclutador ${recruiter?.name || userId} ha realizado el test "${assessment.name}"`;
        const text = `Hola Trainer,\n\nEl reclutador ${recruiter?.name || userId} ha completado el test "${assessment.name}" el día ${new Date().toLocaleString()}.\n\nPuedes revisar las respuestas en la plataforma.`;
        await sendNotificationEmail('chriscervantesdelacruz@gmail.com', subject, text);
      } catch (notifyErr) {
        console.error('Error al notificar al trainer:', notifyErr);
      }
    })();
    const t5 = Date.now();
    const timings = {
      total: t5 - startAll,
      findSubtest: t2 - t1,
      prepareSubtest: t3 - t2,
      saveSubtest: t4 - t3,
      afterSave: t5 - t4
    };

    // Devuelve el subtest actualizado para que el frontend pueda bloquear el test instantáneamente
    res.json({ 
      message: 'Respuestas guardadas correctamente', 
      timings, 
      subtest: {
        submittedAt: subtest.submittedAt,
        submittedAnswers: subtest.submittedAnswers,
        assessment: subtest.assessment,
        userId: subtest.userId,
        correctCount: subtest.correctCount,
        totalQuestions: subtest.totalQuestions,
        score: subtest.score,
        correctMap: subtest.correctMap
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar respuestas', error: error.message });
  }
};

// Enviar recordatorio por correo a un usuario para un test pendiente
exports.sendReminderEmail = async (req, res) => {
  try {
    const { id } = req.params; // assessmentId
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'Falta userId' });
    const assessment = await Assessment.findById(id);
    if (!assessment) return res.status(404).json({ message: 'Evaluación no encontrada' });
    const User = require('../models/user');
    const user = await User.findById(userId);
    if (!user || !user.email) return res.status(404).json({ message: 'Usuario no encontrado o sin email' });

    // Calcular días restantes
    let diasRestantes = null;
    let fechaExp = assessment.expirationDate ? new Date(assessment.expirationDate) : null;
    let mensaje = '';
    if (fechaExp) {
      const hoy = new Date();
      // Solo cuenta días completos
      diasRestantes = Math.ceil((fechaExp - hoy) / (1000 * 60 * 60 * 24));
      if (diasRestantes > 1) {
        mensaje = `Te quedan ${diasRestantes} días para resolver el test "${assessment.name}".`;
      } else if (diasRestantes === 1) {
        mensaje = `Te queda 1 día para resolver el test "${assessment.name}".`;
      } else if (diasRestantes === 0) {
        mensaje = `¡Hoy es el último día para resolver el test "${assessment.name}"!`;
      } else {
        mensaje = `El test "${assessment.name}" ya expiró.`;
      }
    } else {
      mensaje = `Tienes que resolver el test "${assessment.name}" antes de que se bloquee.`;
    }
    const subject = `Recordatorio: test pendiente en la plataforma`;
    const text = `Hola ${user.name},\n\n${mensaje}\n\nPor favor ingresa a la plataforma para completarlo.\n\nSaludos.`;
    await sendNotificationEmail(user.email, subject, text);
    res.json({ message: 'Correo de recordatorio enviado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al enviar el correo de recordatorio', error: error.message });
  }
};

// Obtener resumen de notas por bloque y nota global para un usuario y branch
exports.getGradesSummary = async (req, res) => {
  try {
    const { userId, branchId } = req.query;
    if (!userId || !branchId) {
      return res.status(400).json({ message: 'Faltan parámetros userId o branchId' });
    }
    // Validar ObjectId
    const isValidUserId = /^[a-f\d]{24}$/i.test(userId);
    const isValidBranchId = /^[a-f\d]{24}$/i.test(branchId);
    if (!isValidUserId || !isValidBranchId) {
      return res.status(400).json({ message: 'userId o branchId no son válidos' });
    }
    const Subtest = require('../models/subtest');
    const Assessment = require('../models/assessment');
    const Block = require('../models/block');

    // 1. Buscar todos los assessments de la branch
    const assessments = await Assessment.find({ branch: branchId });
    const assessmentIds = assessments.map(a => a._id);
    // 2. Obtener todos los subtests del usuario para esos assessments
    const subtests = await Subtest.find({ assessment: { $in: assessmentIds }, userId });
    if (subtests.length === 0) {
      return res.json({
        blocks: [],
        notaGlobal: 0,
        testsDetail: []
      });
    }

    // 3. Agrupar subtests por bloque
    const blockScores = {}; // { blockId: [score, ...] }
    subtests.forEach(st => {
      const blockId = String(st.block);
      if (!blockScores[blockId]) blockScores[blockId] = [];
      blockScores[blockId].push(typeof st.score === 'number' ? st.score : 0);
    });

    // 4. Obtener info de los bloques y calcular promedios
    const blockIds = Object.keys(blockScores);
    const blocks = await Block.find({ _id: { $in: blockIds } });
    let notaGlobal = 0;
    const blocksSummary = blocks.map(block => {
      const scores = blockScores[String(block._id)] || [];
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const weighted = (avg * block.weight) / 100;
      notaGlobal += weighted;
      // Agrega el contador de tests (count)
      return {
        blockId: block._id,
        label: block.label,
        weight: block.weight,
        average: avg,
        weighted: weighted,
        count: scores.length
      };
    });

    // 5. Agregar detalle de cada test resuelto
    // Mapear assessmentId a nombre
    const assessmentNameMap = {};
    assessments.forEach(a => { assessmentNameMap[String(a._id)] = a.name; });
    // Mapear blockId a label
    const blockLabelMap = {};
    blocks.forEach(b => { blockLabelMap[String(b._id)] = b.label; });
    // Detalle de tests resueltos
    const testsDetail = subtests.map(st => ({
      assessmentId: st.assessment,
      assessmentName: assessmentNameMap[String(st.assessment)] || '',
      blockId: st.block,
      blockLabel: blockLabelMap[String(st.block)] || '',
      score: st.score,
      correctCount: st.correctCount,
      totalQuestions: st.totalQuestions,
      submittedAt: st.submittedAt
    }));

    res.json({
      blocks: blocksSummary,
      notaGlobal,
      testsDetail
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular el resumen de notas', error: error.message, stack: error.stack });
  }
};

// GET /api/assessments/related-to-course/:courseId
exports.getAssessmentsRelatedToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId) return res.status(400).json({ message: 'Faltan courseId' });
    const Assessment = require('../models/assessment');
    const assessments = await Assessment.find({ relatedCourses: courseId });
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ message: 'Error al buscar tests relacionados', error: err.message });
  }
};

// GET /api/assessments/:assessmentId/ready-for-user/:userId
exports.isAssessmentReadyForUser = async (req, res) => {
  try {
    const { assessmentId, userId } = req.params;
    if (!assessmentId || !userId) return res.status(400).json({ message: 'Faltan datos' });
    const Assessment = require('../models/assessment');
    const CourseSignature = require('../models/courseSignature');
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) return res.status(404).json({ message: 'Test no encontrado' });
    if (!assessment.relatedCourses || assessment.relatedCourses.length === 0) {
      return res.json({ ready: true, missingCourses: [] });
    }
    // Buscar firmas del usuario para los cursos requeridos
    const firmas = await CourseSignature.find({
      userId,
      courseId: { $in: assessment.relatedCourses }
    });
    const firmados = firmas.map(f => String(f.courseId));
    const missingCourses = assessment.relatedCourses.filter(cid => !firmados.includes(String(cid)));
    res.json({ ready: missingCourses.length === 0, missingCourses });
  } catch (err) {
    res.status(500).json({ message: 'Error al verificar firmas de cursos', error: err.message });
  }
};

// Resetear el subtest de un usuario para un assessment y guardar log
exports.resetUserSubtest = async (req, res) => {
  try {
    console.log('resetUserSubtest called');
    console.log('req.user:', req.user);
    console.log('req.params:', req.params);
    const { assessmentId, userId } = req.params;
    const adminId = req.user && req.user.id ? req.user.id : null;
    const { reason } = req.body;
    if (!adminId) {
      console.log('No autorizado: adminId missing');
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (!reason) {
      console.log('Motivo requerido: reason missing');
      return res.status(400).json({ message: 'Motivo requerido' });
    }
    // Procesar archivos adjuntos
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(f => ({ filename: f.filename, originalname: f.originalname }));
    }
    // Buscar el subtest
    const subtest = await Subtest.findOne({
      assessment: new mongoose.Types.ObjectId(assessmentId),
      userId: new mongoose.Types.ObjectId(userId)
    });
    console.log('subtest encontrado:', subtest);
    if (!subtest) {
      console.log('Subtest no encontrado');
      return res.status(404).json({ message: 'Subtest no encontrado' });
    }
    // Resetear campos
    subtest.submittedAt = null;
    subtest.submittedAnswers = null;
    subtest.score = null;
    subtest.correctCount = null;
    subtest.totalQuestions = null;
    subtest.correctMap = null;
    await subtest.save();
    // Guardar log
    await ResetLog.create({
      assessmentId,
      userId,
      adminId,
      reason,
      attachments
    });
    await emitDbChange();
    // Notificar por correo al usuario que su test fue reseteado
    try {
      const User = require('../models/user');
      const Assessment = require('../models/assessment');
      const user = await User.findById(userId);
      const assessment = await Assessment.findById(assessmentId);
      if (user && user.email && assessment) {
        const subject = `Tu test "${assessment.name}" ha sido reseteado`;
        const text = `Hola ${user.name},\n\nTu test "${assessment.name}" ha sido reseteado por un administrador. Ya puedes volver a resolverlo en la plataforma.\n\nMotivo: ${reason}\n\nSi tienes dudas, contacta a soporte.`;
        await sendNotificationEmail(user.email, subject, text);
      }
    } catch (notifyErr) {
      console.error('Error al notificar al usuario del reseteo:', notifyErr);
    }
    res.json({ message: 'Subtest reseteado y log guardado' });
  } catch (error) {
    console.error('Error completo al resetear subtest:', error);
    res.status(500).json({ message: 'Error al resetear subtest', error: error.message, stack: error.stack });
  }
};

// Obtener historial de reseteos de un assessment
exports.getResetLogs = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const logs = await ResetLog.find({ assessmentId })
      .sort({ createdAt: -1 })
      .populate('adminId', 'name email')
      .populate('userId', 'name email');
    // Agregar downloadUrl a cada attachment
    const logsWithDownloadUrl = logs.map(log => ({
      ...log.toObject(),
      attachments: (log.attachments || []).map(att => ({
        ...att,
        downloadUrl: att.filename
          ? `http://localhost:5000/uploads/download/${encodeURIComponent(att.filename)}`
          : null
      }))
    }));
    res.json(logsWithDownloadUrl);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial de reseteos', error: error.message });
  }
};

module.exports.uploadPdf = uploadPdf;