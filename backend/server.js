const http = require('http');
const socketIo = require('socket.io');
const conectarDB = require('./config/db');
const app = require('./index');
require('dotenv').config();
const Course = require('./models/course');

const server = http.createServer(app);

// Configuración de Socket.IO
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000', // Cambia esto si el frontend está en otra URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Conexión a MongoDB
conectarDB();

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
const emitPublishedCourses = async () => {
  const currentDate = new Date(); // Fecha actual UTC

  try {
    // Busca cursos cuya hora de publicación sea menor o igual a la actual
    const coursesToPublish = await Course.find({
      publicationDate: { $lte: currentDate },
    }).sort({ publicationDate: -1 }); // Ordenar por fecha de publicación, más reciente primero

    // Filtra solo los cursos que no han sido emitidos antes
    const newCourses = coursesToPublish.filter(
      (course) => !scheduledCourses.has(course._id.toString())
    );

    if (newCourses.length > 0) {
      // Emitir evento solo si hay nuevos cursos
      console.log('Emitiendo evento dbChange con cursos:', newCourses);
      io.emit('dbChange', coursesToPublish);

      // Agregar los nuevos cursos al conjunto de cursos emitidos
      newCourses.forEach((course) => scheduledCourses.add(course._id.toString()));
    }
  } catch (error) {
    console.error('Error al emitir cursos publicados:', error);
  }
};

// Verificar cursos publicados cada segundo
setInterval(emitPublishedCourses, 1000);

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});