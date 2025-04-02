// index.js
require('dotenv').config();  // Para cargar las variables de entorno
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Conectar a MongoDB Atlas
connectDB();

// Middleware para leer JSON
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);

// Reemplaza la cadena de conexión con la tuya
const dbURI = 'mongodb+srv://etcetera9876:sand32025@cluster0.si3ltk8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(dbURI)
.then(() => console.log('🟢 Conectado a la base de datos'))
.catch(err => console.error('🔴 Error al conectar a MongoDB:', err));


// Aquí se pueden agregar rutas para login, cursos, etc.

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});


