const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const conectarDB = require('./config/db');
const Course = require('./models/course');

// Inicializar la aplicación Express
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Conectar a MongoDB Atlas
conectarDB();

// Configuración de rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const branchRoutes = require("./routes/branchRoutes");
const courseRoutes = require("./routes/courseRoutes");
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/courses", courseRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

// Configuración de Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000', // Cambia esto si el frontend está en otra URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Manejo de conexiones de Socket.IO
io.on('connection', (socket) => {
  console.log(`Nuevo cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Manejador de cursos publicados ya emitidos
const scheduledCourses = new Set(); // Para rastrear cursos ya emitidos

// Función para emitir eventos `dbChange`
const emitPublishedAndExpiredCourses = async () => {
  const currentDate = new Date();

  try {
    // Cursos para publicar (publicados y no expirados)
    const coursesToPublish = await Course.find({
      publicationDate: { $lte: currentDate }, // Publicar si la fecha ya pasó
      $or: [{ expirationDate: null }, { expirationDate: { $gte: currentDate } }], // No expirados
    }).sort({ createdAt: -1 }); // Ordenar por fecha de creación descendente

    // Emitir solo los cursos válidos
    io.emit("dbChange", coursesToPublish); // Actualiza el dashboard en tiempo real
  } catch (error) {
    console.error("Error al manejar cursos publicados y expirados:", error);
  }
};

// Ejecutar cada segundo para manejar publicaciones y expiraciones
setInterval(emitPublishedAndExpiredCourses, 1000);

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});