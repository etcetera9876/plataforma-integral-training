const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Branch = require('../models/branch'); 


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
      console.log("Inicio de sesión:", { email, password });
  
      const user = await User.findOne({ email });
      console.log("Usuario encontrado:", user);
  
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      if (password !== user.password) {
        console.log("Contraseña incorrecta:", { inputPassword: password, userPassword: user.password });
        return res.status(400).json({ message: 'Contraseña incorrecta' });
      }
  
      // Verificar si el usuario tiene un place global
      let branch = null;
      if (user.place === "Global") {
        branch = { _id: "Global", name: "Global" }; // Simular un branch global
      } else {
        // Buscar el branch correspondiente
        branch = await Branch.findOne({ name: user.place });
        console.log("Branch encontrado:", branch);
  
        if (!branch) {
          return res.status(404).json({ message: 'Sucursal no encontrada' });
        }
      }
  
      const token = jwt.sign(
        { id: user._id, role: user.role, branchId: branch._id },
        'secreto',
        { expiresIn: '1h' }
      );
  
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          branchId: branch._id,
          hasSeenPopup: user.hasSeenPopup,
        },
      });
    } catch (error) {
      console.error("Error en login:", error.message);
      res.status(500).json({ error: error.message });
    }
  };

module.exports = { register, login };
