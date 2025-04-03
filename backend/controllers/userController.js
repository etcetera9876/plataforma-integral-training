const User = require('../models/user');


// Función para actualizar el estado del popup en el usuario
exports.updatePopupStatus = async (req, res) => {
    try {
        const userId = req.user.id; // Este valor lo provee el middleware authMiddleware
        // Actualizamos el campo "hasSeenPopup" a true
        await User.updateOne({ _id: userId }, { hasSeenPopup: true });
        res.json({ message: "Estado del popup actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el estado del popup", error: error.message });
    }
};


exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['reclutador', 'trainer', 'supervisor', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Rol no válido' });
        }

        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        res.json({ message: 'Rol actualizado correctamente', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
