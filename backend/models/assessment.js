const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  type: { type: String, enum: ['open', 'multiple', 'match'], required: true }, // abierta, opción múltiple, relacionar
  text: { type: String, required: true },
  options: [String], // solo para opción múltiple o relacionar
  answer: mongoose.Schema.Types.Mixed, // puede ser string, array, objeto, según el tipo
  materialRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: false }, // opcional, referencia a material
  attachments: [{
    type: { type: String, enum: ['image', 'video', 'file'] },
    url: String,
    name: String
  }], // imágenes, videos o archivos adjuntos
});


const AssessmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true }, // <-- Agregado para filtrar por sucursal
  assignedTo: [{ type: mongoose.Schema.Types.Mixed }], // Permite ObjectId o string
  components: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Block', required: true }],
  block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block' }, // Nuevo campo para guardar el bloque principal del test
  publicationDate: Date,
  expirationDate: Date,
  isLocked: { type: Boolean, default: false },
  createdBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

module.exports = mongoose.model('Assessment', AssessmentSchema);