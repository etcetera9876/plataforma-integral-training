const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  assignedTo: { 
    type: [mongoose.Schema.Types.Mixed], // Permite almacenar ObjectId o un string como "All recruiters"
    required: true,
  },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  publicationDate: { type: Date, default: null },
  expirationDate: { type: Date, default: null },
  isLocked: { type: Boolean, default: false },
  description: { type: String, default: "" },
  resources: [
    {
      type: { type: String, enum: ["image", "video", "link", "document", "pdf", "word", "excel", "ppt"], required: false },
      url: { type: String },
      name: { type: String },
    }
  ],
  createdBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Course", courseSchema);