const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  assignedTo: { type: [String], required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  publicationDate: { type: Date, default: null },
  createdBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now }, // Generar automáticamente la fecha de creación
});

module.exports = mongoose.model("Course", courseSchema);