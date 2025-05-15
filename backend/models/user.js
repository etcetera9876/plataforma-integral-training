const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    place: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['Recruiter', 'Manager', 'Trainer', 'Supervisor', 'Admin'], 
        default: 'Recruiter' 
    },
    startDate: { type: Date, required: true },
    hasSeenPopup: { type: Boolean, default: false },
    isOldUser: { type: Boolean, default: false }, // Indica si es usuario antiguo
    levelingStatus: [{
        role: {
            type: String,
            enum: ['Recruiter', 'Manager', 'Trainer', 'Supervisor', 'Admin'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'expired'],
            default: 'pending'
        },
        assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
        assignedAt: { type: Date, default: Date.now },
        completedAt: { type: Date }
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
