const express = require('express');
const {
  getUserDetails,
  updatePopupStatus,
  getUsers,
  updateUserRole,
  getUsersByBranch, // Importa correctamente la función
} = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');


const router = express.Router();

// GET /api/users/:id → trae { role, place }
router.get('/:id', authMiddleware, getUserDetails);

// POST /api/users/updatePopupStatus → marca hasSeenPopup = true
router.post('/updatePopupStatus', authMiddleware, updatePopupStatus);

// GET /api/users/branch/:branchId/users → lista usuarios por sucursal
router.get('/branch/:branchId/users', getUsersByBranch);

// GET /api/users → lista todos los usuarios (solo para admin)
router.get('/users', authMiddleware, roleMiddleware(['admin']), getUsers);

// PUT /api/users/:id/role → actualiza el rol de un usuario (solo para admin)
router.put('/users/:id/role', authMiddleware, roleMiddleware(['admin']), updateUserRole);

module.exports = router;