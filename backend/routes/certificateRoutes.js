const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const authenticateToken = require('../middlewares/authMiddleware');

// Listar certificados por branch
router.get('/', authenticateToken, certificateController.getCertificatesByBranch);
// Descargar PDF de certificado
router.get('/:id/download', authenticateToken, certificateController.downloadCertificate);

module.exports = router;
