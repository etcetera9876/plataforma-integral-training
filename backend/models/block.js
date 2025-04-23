const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
  label: { type: String, required: true }, // Nombre del bloque
  type: { type: String, required: true }, // Identificador generado automáticamente
  weight: { type: Number, required: true }, // Peso (%)
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
});

module.exports = mongoose.model('Block', BlockSchema);