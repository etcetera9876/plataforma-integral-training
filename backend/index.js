// index.js
const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');
require('dotenv').config(); // Para cargar las variables de entorno

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');


const app = express();
app.use(express.json()); // Middleware para interpretar JSON
app.use(express.urlencoded({ extended: true })); // También ayuda a procesar formularios
app.use(cors()); // Permite cualquier origen

// Conectar a MongoDB Atlas usando el archivo de configuración
conectarDB();


// Rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/auth', userRoutes);


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


