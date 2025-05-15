const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();
const conectarDB = require('./config/db');
const Course = require('./models/course');
const { setSocketInstance, emitDbChange } = require('./socket');
const authenticateToken = require('./middlewares/authMiddleware');

// Inicializar la aplicación Express
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conectar a MongoDB Atlas
conectarDB();

// Configuración de rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const branchRoutes = require("./routes/branchRoutes");
const courseRoutes = require("./routes/courseRoutes");
const assessmentRoutes = require('./routes/assessmentRoutes');
const questionRoutes = require('./routes/questionRoutes');
const certificateRoutes = require('./routes/certificateRoutes');

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/courses", courseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/certificates', certificateRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

// Forzar descarga de archivos en /uploads/download/:filename
app.get('/uploads/download/:filename', (req, res) => {
  const filePath = path.resolve(__dirname, 'uploads', req.params.filename);
  console.log('Intentando descargar archivo:', filePath);
  res.download(filePath, req.params.filename, (err) => {
    if (err) {
      console.error('Error al descargar archivo:', err);
      res.status(404).send('Archivo no encontrado en: ' + filePath);
    }
  });
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
setSocketInstance(io);

// Programa un job con node-cron para revisar cada minuto si hay cursos programados o expirados
cron.schedule('* * * * *', async () => {
  await emitDbChange();
});

// Manejo de conexiones de Socket.IO
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});