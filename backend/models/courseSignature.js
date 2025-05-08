const mongoose = require('mongoose');

const CourseSignatureSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  name: { type: String, required: true },
  signedAt: { type: Date, default: Date.now },
  signedFileUrl: { type: String, default: null }, // Ruta del PDF firmado subido por el usuario
  courseName: { type: String, default: null }, // Nombre del curso al momento de firmar
  userName: { type: String, default: null } // Nombre del usuario al momento de firmar
});

module.exports = mongoose.model('CourseSignature', CourseSignatureSchema);
