// models/course.js
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  createdBy: {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  assignedTo: { type: String, default: "All recruiters" },
  creationDate: { type: Date, default: Date.now },
  publicationDate: { type: Date, default: null }
});

module.exports = mongoose.model("Course", courseSchema);
