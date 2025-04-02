const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://etcetera9876:sand32025@cluster0.si3ltk8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';


const conectarDB = async () => {
    try {
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
                