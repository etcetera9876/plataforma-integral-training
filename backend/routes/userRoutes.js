const express = require('express');
const {
    getUserDetails,
    updatePopupStatus,
    getUsers,
    updateUserRole
  } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// GET /api/users/:id → trae { role, place }
router.get('/:id', authMiddleware, getUserDetails);

// POST /api/users/updatePopupStatus → marca hasSeenPopup = true
router.post('/updatePopupStatus', authMiddleware, updatePopupStatus);

router.get('/users', authMiddleware, roleMiddleware(['admin']), getUsers);
router.put('/users/:id/role', authMiddleware, roleMiddleware(['admin']), updateUserRole);

module.exports = router;
