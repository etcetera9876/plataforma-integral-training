// index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

const mongoose = require('mongoose');

// Reemplaza la cadena de conexión con la tuya
const dbURI = 'mongodb+srv://etcetera9876:sand32025@cluster0.si3ltk8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(dbURI)
  .then(() => console.log('Conectado a la base de datos'))
  .catch(err => console.error('Error conectando a la base de datos:', err));


// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

// Aquí se pueden agregar rutas para login, cursos, etc.

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});


