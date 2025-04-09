const User = require('../models/user');
const mongoose = require("mongoose");

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

// Listar todos los usuarios
async function getUsers(req, res) {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Actualizar rol del usuario
async function updateUserRole(req, res) {
  // Lógica para actualizar el rol
}

// Listar usuarios por sucursal
async function getUsersByBranch(req, res) { // Asegúrate de que esta función esté definida
  try {
    const { branchId } = req.params;
    console.log("Branch ID recibido:", branchId);

    if (!branchId) {
      return res.status(400).json({ message: "Branch ID is required" });
    }

    const users = await User.find({ place: branchId });
    console.log("Usuarios encontrados:", users);
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users by branch:", error);
    res.status(500).json({ message: "Could not fetch users for this branch" });
  }
}

// Endpoint para obtener nombres de usuarios por ID
const getUserNames = async (req, res) => {
  try {
    const { userIds } = req.body;

    // Filtrar valores inválidos (no ObjectId)
    const validUserIds = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validUserIds.length === 0) {
      return res.status(400).json({ message: "No se proporcionaron IDs válidos" });
    }

    const users = await User.find({ _id: { $in: validUserIds } }).select("_id name");
    const userNames = users.reduce((acc, user) => {
      acc[user._id] = user.name;
      return acc;
    }, {});

    res.json(userNames);
  } catch (error) {
    console.error("Error al obtener nombres de usuarios:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};



// Exportar todas las funciones
module.exports = {
  getUserDetails,
  getUserNames,
  updatePopupStatus,
  getUsers,
  updateUserRole,
  getUsersByBranch, // Exporta la función de forma explícita
};