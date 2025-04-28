const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  statement: { type: String, required: true },
  type: { type: String, enum: ['multiple', 'single', 'open', 'boolean', 'form-dynamic'], required: true },
  difficulty: { type: String, enum: ['facil', 'medio', 'dificil'], required: true },
  topic: { type: String, required: true },
  options: [{ type: String }], // solo para multiple/single
  correctAnswer: mongoose.Schema.Types.Mixed, // string o array
  correctAnswerIA: { type: String }, // solo para open
  attachment: {
    type: {
      type: String,
      enum: ['image', 'video', 'pdf', 'other'],
    },
    url: String,
    name: String,
  },
  forms: { type: Array, default: [] }, // Para formularios dinámicos
}, { timestamps: true });

module.exports = mongoose.model('Question', QuestionSchema);
