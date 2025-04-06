// backend/controllers/userController.js
const User = require('../models/user');

// Obtener detalles de un usuario por ID
async function getUserDetails(req, res) {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('role place');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo datos del usuario', error: error.message });
  }
}

// Actualizar estado del popup
async function updatePopupStatus(req, res) {
  try {
    const userId = req.user.id;
    await User.updateOne({ _id: userId }, { hasSeenPopup: true });
    res.json({ message: 'Estado del popup actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado del popup', error: error.message });
  }
}

// (Opcional) Listar todos los usuarios
async function getUsers(req, res) {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateUserRole(req, res) {
  /* ... tu código existente ... */
}

module.exports = {
  getUserDetails,
  updatePopupStatus,
  getUsers,
  updateUserRole
};
