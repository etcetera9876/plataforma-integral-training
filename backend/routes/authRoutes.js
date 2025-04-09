const express = require('express');
const { register, login } = require('../controllers/authController');
const { updatePopupStatus } = require('../controllers/userController'); // Lo agregaremos en el siguiente paso
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/updatePopupStatus', authMiddleware, updatePopupStatus);


module.exports = router;
