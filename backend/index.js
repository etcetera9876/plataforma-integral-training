// index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config(); // Para cargar las variables de entorno

const Usuario = require('./models/user'); // Importamos el modelo

const app = express();
app.use(express.json()); // Middleware para interpretar JSON
app.use(express.urlencoded({ extended: true })); // También ayuda a procesar formularios




// Reemplaza la cadena de conexión con la tuya
const dbURI = 'mongodb+srv://etcetera9876:sand32025@cluster0.si3ltk8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(dbURI)
.then(() => console.log('🟢 Conectado a la base de datos'))
.catch(err => console.error('🔴 Error al conectar a MongoDB:', err));


// Middlewares
app.use(cors()); // Permite cualquier origen

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de autenticación
app.use('/api/auth', require('./routes/authRoutes'));

// Rutas de usuarios protegidas (con validación de rol)
app.use('/api/users', require('./routes/userRoutes'));

// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});


// Aquí se pueden agregar rutas para login, cursos, etc.

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});


