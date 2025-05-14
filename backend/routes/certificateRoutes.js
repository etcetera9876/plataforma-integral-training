const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const authenticateToken = require('../middlewares/authMiddleware');

// Listar certificados por branch
router.get('/', authenticateToken, certificateController.getCertificatesByBranch);
// Descargar PDF de certificado
router.get('/:id/download', authenticateToken, certificateController.downloadCertificate);
// Ruta para descargar la plantilla PDF personalizada
router.get('/template/:courseId', certificateController.getCertificateTemplate);
// Sube el PDF firmado por el usuario y emite el evento certificateSigned tras guardar el archivo
router.post('/:signatureId/upload-signed', authenticateToken, async (req, res, next) => {
  // Usar el controlador existente para subir el archivo
  await certificateController.uploadSignedCertificate[0](req, res, async (err) => {
    if (err) return next(err);
    if (res.headersSent) return;
    if (!req.file) {
      return res.status(400).json({ message: 'El archivo firmado es obligatorio.' });
    }
    try {
      // Ejecutar la segunda parte del controlador (guardar en BD)
      await certificateController.uploadSignedCertificate[1](req, res);
      // Emitir el evento certificateSigned SOLO por socket, sin responder de nuevo
      const signatureId = req.params.signatureId;
      try {
        const signature = await require('../models/courseSignature').findById(signatureId);
        const user = signature ? await require('../models/user').findById(signature.userId) : null;
        const course = signature ? await require('../models/course').findById(signature.courseId) : null;
        if (signature && user && course) {
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
        }
      } catch (e) { /* ignora errores de socket */ }
      // La respuesta ya fue enviada por uploadSignedCertificate[1]
    } catch (error) {
      next(error);
    }
  });
});

module.exports = router;
