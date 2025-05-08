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
    // Si hubo error en multer, termina
    if (res.headersSent) return;
    // Validar que el archivo fue subido (obligatorio)
    if (!req.file) {
      return res.status(400).json({ message: 'El archivo firmado es obligatorio.' });
    }
    // Lógica de subida exitosa
    try {
      // Ejecutar la segunda parte del controlador (guardar en BD)
      await certificateController.uploadSignedCertificate[1](req, res);
      // Si la subida fue exitosa, emitir el evento certificateSigned
      const signatureId = req.params.signatureId;
      await certificateController.emitSignedEvent(req, res);
    } catch (error) {
      next(error);
    }
  });
});

module.exports = router;
