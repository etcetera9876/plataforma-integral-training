// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Para cargar las variables de entorno

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const conectarDB = require('./config/db');

const app = express();
app.use(express.json()); // Middleware para interpretar JSON
app.use(express.urlencoded({ extended: true })); // También ayuda a procesar formularios
app.use(cors()); // Permite cualquier origen

// Conectar a MongoDB Atlas usando el archivo de configuración
conectarDB();


// Rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);


// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

// Configuración de Socket.IO con un servidor HTTP
const http = require('http'); 
const server = http.createServer(app);
const socketIo = require('socket.io');
const io = socketIo(server, {
  cors: {
    origin: "*", // Puedes restringir al dominio de tu frontend
    methods: ["GET", "POST"]
  }
});

// Cuando un cliente se conecte
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Importar el modelo de usuario (o cualquier colección que desees observar)
const User = require('./models/user');

// Crear un Change Stream sobre la colección "users"
const changeStream = User.watch();

changeStream.on('change', (change) => {
  console.log("Cambio detectado:", JSON.stringify(change, null, 2));
  // Emite el evento a todos los clientes conectados
  io.emit('dbChange', change);
});

// Aquí se pueden agregar rutas para login, cursos, etc.

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});


