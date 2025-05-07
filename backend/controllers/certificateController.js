const CourseSignature = require('../models/courseSignature');
const Course = require('../models/course');
const User = require('../models/user');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Utilidad para generar el PDF de certificado
async function generateCertificatePDF({ signature, user, course, outputPath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc.fontSize(22).text('Training Certificate', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`This certifies that`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(20).text(user.name, { align: 'center', underline: true });
    doc.moveDown();
    doc.fontSize(16).text(`has completed the course:`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(course.name, { align: 'center', underline: true });
    doc.moveDown();
    doc.fontSize(14).text(`Date of completion: ${signature.signedAt.toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text('JCS Family Platform', { align: 'center' });
    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// GET /api/certificates?branch=<branchId>
exports.getCertificatesByBranch = async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) return res.status(400).json({ message: 'Falta branch' });
    // Buscar cursos de la sucursal
    const courses = await Course.find({ branchId: branch });
    const courseIds = courses.map(c => c._id);
    // Buscar firmas de esos cursos
    const signatures = await CourseSignature.find({ courseId: { $in: courseIds } });
    // Buscar usuarios y cursos relacionados
    const userIds = signatures.map(s => s.userId);
    const users = await User.find({ _id: { $in: userIds } });
    // Mapas para acceso rápido
    const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));
    const courseMap = Object.fromEntries(courses.map(c => [String(c._id), c]));
    // Construir lista de certificados
    const certificates = await Promise.all(signatures.map(async (sig) => {
      const user = userMap[String(sig.userId)];
      const course = courseMap[String(sig.courseId)];
      if (!user || !course) return null;
      // Ruta del PDF
      const pdfFileName = `certificate-${sig._id}.pdf`;
      const pdfPath = path.join(__dirname, '../uploads', pdfFileName);
      // Si no existe, generar el PDF
      if (!fs.existsSync(pdfPath)) {
        await generateCertificatePDF({ signature: sig, user, course, outputPath: pdfPath });
      }
      return {
        id: sig._id,
        userName: user.name,
        courseName: course.name,
        signedAt: sig.signedAt,
        pdfUrl: `/api/certificates/${sig._id}/download`
      };
    }));
    res.json(certificates.filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener certificados', error: err.message });
  }
};

// GET /api/certificates/:id/download
exports.downloadCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const sig = await CourseSignature.findById(id);
    if (!sig) return res.status(404).json({ message: 'Certificado no encontrado' });
    const user = await User.findById(sig.userId);
    const course = await Course.findById(sig.courseId);
    if (!user || !course) return res.status(404).json({ message: 'Datos incompletos' });
    const pdfFileName = `certificate-${sig._id}.pdf`;
    const pdfPath = path.join(__dirname, '../uploads', pdfFileName);
    if (!fs.existsSync(pdfPath)) {
      await generateCertificatePDF({ signature: sig, user, course, outputPath: pdfPath });
    }
    res.download(pdfPath, `${user.name}-${course.name}-certificate.pdf`);
  } catch (err) {
    res.status(500).json({ message: 'Error al descargar certificado', error: err.message });
  }
};

module.exports = {
  generateCertificatePDF,
  getCertificatesByBranch: exports.getCertificatesByBranch,
  downloadCertificate: exports.downloadCertificate
};
