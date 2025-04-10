const mongoose = require('mongoose');

const conectarDB = async () => {
    try {
        console.log('Intentando conectar con:', process.env.MONGO_URI); // Debug
        // Simplificar conexión eliminando opciones deprecadas
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB Atlas');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error);
        process.exit(1); // Finaliza el proceso si la conexión falla
    }
};

module.exports = conectarDB;