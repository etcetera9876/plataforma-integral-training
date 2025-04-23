const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const blockController = require('../controllers/blockController');
const assessmentController = require('../controllers/assessmentController');

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
router.get('/:id', authMiddleware, assessmentController.getAssessmentById);
router.put('/:id', authMiddleware, assessmentController.updateAssessment);
router.delete('/:id', authMiddleware, assessmentController.deleteAssessment);
router.patch('/:id/toggle-lock', authMiddleware, assessmentController.toggleLockAssessment);

module.exports = router;
