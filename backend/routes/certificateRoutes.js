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
// Sube el PDF firmado por el usuario
router.post('/:signatureId/upload-signed', certificateController.uploadSignedCertificate);
// Ruta para emitir el evento certificateSigned tras subir el archivo firmado
router.post('/:signatureId/emit-signed-event', certificateController.emitSignedEvent);

module.exports = router;
