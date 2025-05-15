// archivo: checkSubtest.js
require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('Falta la variable de entorno MONGODB_URI');
  process.exit(1);
}

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => {
    console.error('Error de conexión a MongoDB:', err);
    process.exit(1);
  });

const Subtest = require('../models/subtest');

(async () => {
  const assessmentId = '682502a3ff65023423a7cbc1';
  const userId = '67ed8f81ca45898c0f74d08f';
  const result = await Subtest.findOne({
    assessment: new mongoose.Types.ObjectId(assessmentId),
    userId: new mongoose.Types.ObjectId(userId)
  });
  console.log('Subtest encontrado:', result);
  mongoose.disconnect();
})();