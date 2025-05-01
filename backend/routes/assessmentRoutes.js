const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const blockController = require('../controllers/blockController');
const assessmentController = require('../controllers/assessmentController');
const multer = require("multer");
const path = require("path");

// Configuración de multer para guardar archivos en /uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueSuffix);
  }
});
const upload = multer({ storage });

// Bloques
router.post('/blocks', authMiddleware, blockController.createBlock);
router.get('/blocks/:branchId', authMiddleware, blockController.getBlocksByBranch);
// Ruta adicional para compatibilidad con el frontend
router.get('/blocks/branch/:branchId', authMiddleware, blockController.getBlocksByBranch);
router.put('/blocks/:id', authMiddleware, blockController.updateBlock);
router.delete('/blocks/:id', authMiddleware, blockController.deleteBlock);

// Evaluaciones (assessments)
router.post('/', authMiddleware, assessmentController.createAssessment);
router.get('/', authMiddleware, assessmentController.getAssessments);

// Evaluaciones asignadas a un usuario y branch
router.get('/assigned', authMiddleware, assessmentController.getAssignedAssessments);

router.get('/:id', authMiddleware, assessmentController.getAssessmentById);
router.put('/:id', authMiddleware, assessmentController.updateAssessment);
router.delete('/:id', authMiddleware, assessmentController.deleteAssessment);
router.patch('/:id/toggle-lock', authMiddleware, assessmentController.toggleLockAssessment);

// Guardar subtests personalizados para un assessment
router.post('/:id/subtests', authMiddleware, assessmentController.saveSubtests);

// Obtener subtests de un assessment
router.get('/:id/subtests', authMiddleware, assessmentController.getSubtests);

// Generar tests personalizados para múltiples usuarios
router.post('/generate-multi', authMiddleware, assessmentController.generateMultiAssessments);

// Convierte PDF a imagen (POST: { pdfFile: "nombre.pdf" })
router.post('/convert-pdf-to-image', assessmentController.convertPdfToImage);

// Endpoint para subir archivos PDF a /uploads
router.post("/upload", upload.single("file"), assessmentController.uploadPdf);

module.exports = router;
