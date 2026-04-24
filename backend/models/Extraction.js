const mongoose = require('mongoose');

const ExtractionSchema = new mongoose.Schema({
    originalFileName: { type: String, required: true },
    extractedNumbers: [{
        number: { type: String, required: true },
        type: { type: String, required: true },
        country: { type: String, required: true }
    }],
    extractedText: { type: String }, // Store raw text optionally
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Extraction', ExtractionSchema);
