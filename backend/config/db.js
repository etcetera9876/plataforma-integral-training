const mongoose = require('mongoose');


const conectarDB = async () => {
    try {
        console.log('Intentando conectar con:', process.env.MONGO_URI); // Debug
        await mongoose.connect(process.env.MONGO_URI, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });
        console.log('✅ Conectado a MongoDB Atlas');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error);
        process.exit(1);
    }
};


module.exports = conectarDB;
                