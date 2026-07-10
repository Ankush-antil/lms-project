const mongoose = require('mongoose');

const researchContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const ResearchContact = mongoose.model('ResearchContact', researchContactSchema);
module.exports = ResearchContact;
