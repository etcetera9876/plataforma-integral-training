const express = require('express');
const { getUsers, updateUserRole } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/users', authMiddleware, roleMiddleware(['admin']), getUsers);
router.put('/users/:id/role', authMiddleware, roleMiddleware(['admin']), updateUserRole);

module.exports = router;
