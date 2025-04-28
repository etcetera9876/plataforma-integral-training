const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middlewares/authMiddleware');
const questionController = require('../controllers/questionController');

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

router.get('/', authMiddleware, questionController.getQuestions);
router.post('/', authMiddleware, upload.single('attachment'), questionController.createQuestion);
router.put('/:id', authMiddleware, upload.single('attachment'), questionController.updateQuestion);
router.delete('/:id', authMiddleware, questionController.deleteQuestion);
router.post('/locked', authMiddleware, questionController.getLockedStates);

module.exports = router;
