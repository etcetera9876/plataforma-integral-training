const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');


exports.updatePopupStatus = async (req, res) => {
    try {
        const userId = req.user.id; // Obtén el id del usuario desde el middleware authMiddleware
        await User.updateOne({ _id: userId }, { hasSeenPopup: true });
        res.json({ message: "Estado del popup actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el estado del popup", error: error.message });
    }
};


const register = async (req, res) => {
    try {
        const { name, email, password , place, role, startDate} = req.body;

         // Verifica que se envíe "place" en la solicitud
         if (!place) {
            return res.status(400).json({ error: "El campo 'place' es obligatorio." });
        }

        //para cifrar la contrasena
        /*const hashedPassword = await bcrypt.hash(password, 10);*/
        const user = new User({ 
            name, 
            email, 
            password, /*hashedPassword*/  
            place,
            role,
            startDate: startDate ? new Date(startDate) : new Date()});  // Si no envían fecha, usa la actual
        console.log("Usuario a guardar:", user); // <-- Esto mostrará el objeto antes de guardarlo
        await user.save();

        res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Datos recibidos:", { email, password });
        
        const user = await User.findOne({ email });
        if (!user) {
            console.log("No se encontró el usuario");
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        console.log("Contraseña en BD:", user.password);
        console.log("Comparando (input vs BD):", password, "vs", user.password);
        console.log("Tipos (input vs BD):", typeof password, typeof user.password);

        // Si las contraseñas no coinciden, retorna error
        if (password !== user.password) {
            console.log("Contraseña incorrecta");
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        if (!email.endsWith('@jcsfamily.com')) {
            console.log("Correo no autorizado");
            return res.status(403).json({ error: 'Correo no autorizado' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, 'secreto', { expiresIn: '1h' });
        console.log("Token generado:", token);
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                hasSeenPopup: user.hasSeenPopup
            }
        });
    } catch (error) {
        console.error("Error en login:", error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login };
