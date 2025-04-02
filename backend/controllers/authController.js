const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const register = async (req, res) => {
    try {
        const { name, email, password , place, startDate} = req.body;

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
        res.json({ token });
    } catch (error) {
        console.error("Error en login:", error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login };
