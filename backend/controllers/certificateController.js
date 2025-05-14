const CourseSignature = require('../models/courseSignature');
const Course = require('../models/course');
const User = require('../models/user');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const multer = require('multer');

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
    // Buscar todos los CourseSignature que correspondan a cursos de la sucursal (aunque el curso ya no exista)
    // 1. Buscar todos los cursos (existentes) de la sucursal
    const courses = await Course.find({ branchId: branch });
    const courseIds = courses.map(c => String(c._id));
    // 2. Buscar todas las firmas que tengan courseId de la sucursal (aunque el curso ya no exista)
    const signatures = await CourseSignature.find({});
    // 3. Filtrar firmas que correspondan a branch (por courseId en courseIds o por branchId guardado en CourseSignature si lo agregas en el futuro)
    //    y además incluir firmas de cursos eliminados que alguna vez pertenecieron a la sucursal
    //    (esto asume que solo se pueden firmar cursos de la sucursal actual)
    const filteredSignatures = signatures.filter(sig => courseIds.includes(String(sig.courseId)) || (sig.courseName && sig.courseId && !courses.find(c => String(c._id) === String(sig.courseId))));
    // 4. Buscar usuarios
    const userIds = filteredSignatures.map(s => s.userId);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));
    const courseMap = Object.fromEntries(courses.map(c => [String(c._id), c]));
    // 5. Construir lista de certificados
    const certificates = await Promise.all(filteredSignatures.map(async (sig) => {
      const user = userMap[String(sig.userId)];
      const course = courseMap[String(sig.courseId)];
      const userName = user ? user.name : sig.userName || sig.name;
      const courseName = course ? course.name : sig.courseName;
      const eliminado = !course; // true si el curso ya no existe
      // Ruta del PDF
      const pdfFileName = `certificate-${sig._id}.pdf`;
      const pdfPath = path.join(__dirname, '../uploads', pdfFileName);
      // Si no existe, generar el PDF solo si hay datos de usuario y curso
      if (!fs.existsSync(pdfPath) && user && course) {
        await generateCertificatePDF({ signature: sig, user, course, outputPath: pdfPath });
      }
      return {
        id: sig._id,
        userName,
        courseName,
        signedAt: sig.signedAt,
        pdfUrl: `/api/certificates/${sig._id}/download`,
        signedFileUrl: sig.signedFileUrl,
        eliminado
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

// GET /api/certificates/template/:courseId
// Genera y envía una plantilla PDF personalizada con el nombre del curso y formato profesional
exports.getCertificateTemplate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.query.userId; // Permitir pasar userId por query

    const Course = require('../models/course');
    const User = require('../models/user');
    const course = await Course.findById(courseId);
    if (!course) {
      console.error('[TEMPLATE] Curso no encontrado:', courseId);
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    let employeeName = '___________________________________________';
    let employeeDate = '____________________________';
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        employeeName = user.name;
       
      } else {
        console.error('[TEMPLATE] Usuario no encontrado:', userId);
      }
      // Fecha de firma: hoy
      const today = new Date();
      employeeDate = today.toLocaleDateString();
    }
    // Fecha de publicación o creación del curso
    let trainingDate = '___________________________';
    if (course.publicationDate) {
      trainingDate = new Date(course.publicationDate).toLocaleDateString();
    } else if (course.createdAt) {
      trainingDate = new Date(course.createdAt).toLocaleDateString();
    }
   
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    // Logo centrado, sin estirar (mantener aspect ratio)
    try {
      const logoPath = path.join(__dirname, '../../frontend/src/assets/logo-jcs.png');
      const pageWidth = doc.page.width;
      const logoDisplayWidth = 180;
      const x = (pageWidth - logoDisplayWidth) / 2;
      doc.image(logoPath, x, 40, { width: logoDisplayWidth });
      doc.moveDown(10);
    } catch (e) {
      console.warn('[TEMPLATE] No se pudo cargar el logo:', e.message);
    }
    // Título con fuente BreeSerif
    const breeSerifFontPath = path.join(__dirname, '../../frontend/fonts/BreeSerif-Regular.ttf');
    doc.registerFont('BreeSerif', breeSerifFontPath);
    doc.font('BreeSerif').fontSize(25).text('Training Acknowledgment Form', {
      align: 'center',
      underline: true
    });
    doc.moveDown(1);
    // Resto del texto en fuente normal
    doc.font('Helvetica').fontSize(13).text(`Employee Name: ${employeeName}`, { align: 'left' });
    doc.moveDown(0.5);
    doc.text(`Course Title: ${course.name}`, { align: 'left' });
    doc.moveDown(0.5);
    doc.text(`Date of Training: ${trainingDate}`, { align: 'left' });
    doc.moveDown(1.5);
    doc.fontSize(12).text(`I hereby acknowledge that I have received and understood the materials presented in the "${course.name}" course. I understand it is my responsibility to adhere to JCS Family's policies and procedures as outlined in the training.`, {
      align: 'left',
      lineGap: 4
    });
    doc.moveDown(1);
    doc.text(`I also understand that if I have any questions regarding the course content or company policies, I will seek clarification from the Human Resources Department.`, {
      align: 'left',
      lineGap: 4
    });
    doc.moveDown(2);
    doc.text(`Employee Signature:  ____________________________`, { align: 'left' });
    doc.moveDown(0.5);
    doc.text(`Date:  ${employeeDate}`, { align: 'left' });
    doc.moveDown(2);
    doc.fontSize(10).fillColor('gray').text('This form is a simple way to document that an employee has received training and understands the associated expectations.', {
      align: 'left',
      lineGap: 2
    });
    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error al generar plantilla', error: err.message });
  }
};

// POST /api/certificates/:signatureId/upload-signed
// Sube un PDF firmado y lo asocia al CourseSignature correspondiente
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB máximo
});

exports.uploadSignedCertificate = [
  upload.single('signedFile'),
  async (req, res) => {
    try {
      const { signatureId } = req.params;
      if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });
      // Validar que sea PDF
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: 'El archivo debe ser PDF' });
      }
      // Guardar la ruta en el CourseSignature
      const signature = await CourseSignature.findById(signatureId);
      if (!signature) return res.status(404).json({ message: 'Firma no encontrada' });
      // Si ya había un archivo, puedes eliminarlo si lo deseas
      signature.signedFileUrl = `/uploads/${req.file.filename}`;
      await signature.save();
      res.json({ message: 'Archivo subido correctamente', signedFileUrl: signature.signedFileUrl });
    } catch (err) {
      res.status(500).json({ message: 'Error al subir archivo firmado', error: err.message });
    }
  }
];

// POST /api/certificates/:signatureId/emit-signed-event
// Emite el evento certificateSigned para actualización en tiempo real tras subir el archivo firmado
exports.emitSignedEvent = async (req, res) => {
  try {
    const { signatureId } = req.params;
    const signature = await CourseSignature.findById(signatureId);
    if (!signature) return res.status(404).json({ message: 'Firma no encontrada' });
    const user = await User.findById(signature.userId);
    const course = await Course.findById(signature.courseId);
    if (!user || !course) return res.status(404).json({ message: 'Datos incompletos' });
    const certificado = {
      id: signature._id,
      userName: user.name,
      courseName: course.name,
      signedAt: signature.signedAt,
      pdfUrl: `/api/certificates/${signature._id}/download`,
      signedFileUrl: signature.signedFileUrl
    };
    const { ioInstance } = require('../socket');
    const branchIdStr = course && course.branchId ? String(course.branchId) : undefined;
    if (ioInstance) {
      ioInstance.emit('certificateSigned', { ...certificado, branchId: branchIdStr });
    }
    res.json({ message: 'Evento emitido' });
  } catch (err) {
    res.status(500).json({ message: 'Error al emitir evento', error: err.message });
  }
};

module.exports = {
  generateCertificatePDF,
  getCertificatesByBranch: exports.getCertificatesByBranch,
  downloadCertificate: exports.downloadCertificate,
  getCertificateTemplate: exports.getCertificateTemplate,
  uploadSignedCertificate: exports.uploadSignedCertificate,
  emitSignedEvent: exports.emitSignedEvent
};
