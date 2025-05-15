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
async function getUsersByBranch(req, res) {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ message: "Branch ID is required" });
    }
    let users = [];
    const Branch = require('../models/branch');
    // Si branchId es un ObjectId válido, busca el nombre del branch
    if (mongoose.Types.ObjectId.isValid(branchId)) {
      const branch = await Branch.findById(branchId);
      if (branch) {
        users = await User.find({ place: branch.name });
      } else {
        // Si no existe el branch, intenta buscar usuarios por place igual al branchId (por compatibilidad)
        users = await User.find({ place: branchId });
      }
    } else {
      // Si no es ObjectId, úsalo directamente como nombre del branch
      users = await User.find({ place: branchId });
    }
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

// Consulta el estado de nivelación del usuario para su rol actual
async function getLevelingStatus(req, res) {
  try {
    const userId = req.params.id;
    const User = require('../models/user');
    const Assessment = require('../models/assessment');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    // Solo usuarios antiguos requieren test de nivelación
    if (!user.isOldUser) {
      return res.json({ status: 'no-leveling-required', message: 'El usuario es nuevo y no requiere test de nivelación.' });
    }
    const currentRole = user.role;
    // Busca el status de nivelación para el rol actual
    const leveling = (user.levelingStatus || []).find(ls => ls.role === currentRole);
    if (!leveling) {
      return res.json({ status: 'no-leveling-required', message: 'El usuario no requiere test de nivelación para este rol.' });
    }
    // Si no hay assessment asignado, no requiere test
    if (!leveling.assessmentId) {
      return res.json({ status: 'no-leveling-required', message: 'El usuario no tiene test de nivelación asignado.' });
    }
    // Busca el assessment
    const assessment = await Assessment.findById(leveling.assessmentId);
    if (!assessment) {
      return res.json({ status: 'no-leveling-required', message: 'El test de nivelación asignado no existe.' });
    }
    // Verifica fechas
    const now = new Date();
    const pub = assessment.publicationDate;
    const exp = assessment.expirationDate;
    let isAvailable = true;
    if ((pub && now < pub) || (exp && now > exp)) {
      isAvailable = false;
    }
    // Respuesta según estado
    if (leveling.status === 'pending' && isAvailable) {
      return res.json({ status: 'pending', assessment, leveling });
    } else if (leveling.status === 'pending' && !isAvailable) {
      return res.json({ status: 'expired', assessment, leveling });
    } else if (leveling.status === 'completed') {
      return res.json({ status: 'completed', assessment, leveling });
    } else {
      return res.json({ status: leveling.status, assessment, leveling });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al consultar el estado de nivelación', error: error.message });
  }
}

// Listar usuarios antiguos (isOldUser: true) y por rol
async function getOldUsersByRole(req, res) {
  try {
    const { role } = req.query;
    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }
    const users = await User.find({ isOldUser: true, role }).select('_id name email');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch old users for this role", error: error.message });
  }
}

// Exportar todas las funciones
module.exports = {
  getUserDetails,
  getUserNames,
  updatePopupStatus,
  getUsers,
  updateUserRole,
  getUsersByBranch, // Exporta la función de forma explícita
  getLevelingStatus,
  getOldUsersByRole,
};