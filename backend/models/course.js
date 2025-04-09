const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  assignedTo: {
    type: [mongoose.Schema.Types.ObjectId], // Por defecto, un array de ObjectId
    ref: 'User',
    validate: {
      validator: function (value) {
        // Permitir "All recruiters" o un array de ObjectIds
        return value === "All recruiters" || Array.isArray(value);
      },
      message: 'assignedTo debe ser "All recruiters" o un array de ObjectIds',
    },
  },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  publicationDate: { type: Date, default: null },
  createdBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);