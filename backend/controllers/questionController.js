const Question = require('../models/question');
const Assessment = require('../models/assessment');

// Listar preguntas
exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener preguntas', error: err.message });
  }
};

// Crear pregunta
exports.createQuestion = async (req, res) => {
  try {
    const { statement, type, difficulty, topic, options, correctAnswer, correctAnswerIA, forms } = req.body;
    let attachment = null;
    if (req.file) {
      let fileType = 'other';
      if (req.file.mimetype.startsWith('image/')) fileType = 'image';
      else if (req.file.mimetype.startsWith('video/')) fileType = 'video';
      else if (req.file.mimetype === 'application/pdf') fileType = 'pdf';
      attachment = {
        type: fileType,
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
      };
    }
    let formsData = [];
    if (type === 'form-dynamic' && forms) {
      formsData = typeof forms === 'string' ? JSON.parse(forms) : forms;
    }
    const question = new Question({
      statement,
      type,
      difficulty,
      topic,
      options: options ? JSON.parse(options) : [],
      correctAnswer,
      correctAnswerIA: type === 'open' ? correctAnswerIA : undefined,
      attachment,
      forms: formsData,
    });
    await question.save();
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ message: 'Error al crear pregunta', error: err.message });
  }
};

// Editar pregunta (solo si no está en ningún assessment)
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    // Verificar integridad
    const used = await Assessment.findOne({ 'questions._id': id });
    if (used) {
      return res.status(400).json({ message: 'No se puede editar: la pregunta ya está en un test.' });
    }
    const { statement, type, difficulty, topic, options, correctAnswer, correctAnswerIA, forms } = req.body;
    let update = {
      statement,
      type,
      difficulty,
      topic,
      options: options ? JSON.parse(options) : [],
      correctAnswer,
      correctAnswerIA: type === 'open' ? correctAnswerIA : undefined,
    };
    if (type === 'form-dynamic' && forms) {
      update.forms = typeof forms === 'string' ? JSON.parse(forms) : forms;
    }
    if (req.file) {
      let fileType = 'other';
      if (req.file.mimetype.startsWith('image/')) fileType = 'image';
      else if (req.file.mimetype.startsWith('video/')) fileType = 'video';
      else if (req.file.mimetype === 'application/pdf') fileType = 'pdf';
      update.attachment = {
        type: fileType,
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
      };
    }
    const question = await Question.findByIdAndUpdate(id, update, { new: true });
    res.json(question);
  } catch (err) {
    res.status(400).json({ message: 'Error al editar pregunta', error: err.message });
  }
};

// Eliminar pregunta (solo si no está en ningún assessment)
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const used = await Assessment.findOne({ 'questions._id': id });
    if (used) {
      return res.status(400).json({ message: 'No se puede eliminar: la pregunta ya está en un test.' });
    }
    await Question.findByIdAndDelete(id);
    res.json({ message: 'Pregunta eliminada' });
  } catch (err) {
    res.status(400).json({ message: 'Error al eliminar pregunta', error: err.message });
  }
};

// POST /api/questions/locked
exports.getLockedStates = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids debe ser un array' });
    // Buscar assessments que usen alguna de las preguntas
    const assessments = await Assessment.find({ 'questions._id': { $in: ids } }, 'questions._id');
    const usedIds = new Set();
    assessments.forEach(a => {
      (a.questions || []).forEach(q => {
        if (ids.includes(q._id?.toString())) usedIds.add(q._id.toString());
      });
    });
    const result = {};
    ids.forEach(id => {
      result[id] = usedIds.has(id);
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error al consultar estados', error: err.message });
  }
};
