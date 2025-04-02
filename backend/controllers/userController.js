const User = require('../models/User');

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
