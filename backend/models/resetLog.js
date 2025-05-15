const mongoose = require('mongoose');

const ResetLogSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Quien aprobó
  reason: { type: String, required: true },
  attachments: [{
    filename: String, // nombre real en disco
    originalname: String // nombre original del archivo
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResetLog', ResetLogSchema);