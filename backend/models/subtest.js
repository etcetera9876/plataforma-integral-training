const mongoose = require('mongoose');

const SubtestSchema = new mongoose.Schema({
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block' },
  questions: [mongoose.Schema.Types.Mixed], // Flexible para distintos tipos de preguntas
  submittedAt: { type: Date },
  submittedAnswers: { type: mongoose.Schema.Types.Mixed },
  // Campos para autocorrección y puntaje
  score: { type: Number },
  correctCount: { type: Number },
  totalQuestions: { type: Number },
  correctMap: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  timer: { type: Number, min: 10 }, // minutos, opcional
});

module.exports = mongoose.model('Subtest', SubtestSchema);
