const express = require('express');
const {
  getUserDetails,
  updatePopupStatus,
  getUsers,
  getUserNames,
  updateUserRole,
  getUsersByBranch, // Importa correctamente la función
  getLevelingStatus, // Importa la función para obtener el estado de nivelación
  getOldUsersByRole, // Importa la función para obtener usuarios antiguos por rol
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

// Ruta para obtener nombres de usuarios
router.post('/names', getUserNames);

// Consulta el estado de nivelación del usuario para su rol actual
router.get('/:id/leveling-status', authMiddleware, getLevelingStatus);

// GET /api/users/old-users-by-role?role=ROLE
router.get('/old-users-by-role', authMiddleware, roleMiddleware(['admin', 'trainer']), getOldUsersByRole);

module.exports = router;