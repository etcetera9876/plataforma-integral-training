const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    place: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['recruiter', 'manager', 'trainer', 'supervisor', 'admin'], 
        default: 'recruiter' 
    },
    startDate: { type: Date, required: true },
    hasSeenPopup: { type: Boolean, default: false } // Agregamos esta propiedad
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
