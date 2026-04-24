const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { parsePhoneNumberFromString, findPhoneNumbersInText } = require('libphonenumber-js/max');
require('dotenv').config();

const Extraction = require('./models/Extraction');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Set up multer for memory storage (process image on the fly)
const upload = multer({ storage: multer.memoryStorage() });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/contactExtractor';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Route to process image extraction
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const imageBuffer = req.file.buffer;

        let text = '';
        try {
            // Forward the image buffer to the Python AI Microservice for Deep Learning Extraction
            const formData = new FormData();
            formData.append('image', imageBuffer, { filename: req.file.originalname, contentType: req.file.mimetype });

            const aiResponse = await axios.post('http://127.0.0.1:8000/extract', formData, {
                headers: formData.getHeaders()
            });

            text = aiResponse.data.text;
        } catch (aiError) {
            console.warn('Python AI Microservice unavailable (Connection Refused). Falling back to native Tesseract.js...');
            const tesseract = require('tesseract.js');
            // We can directly use tesseract on the buffered image
            const result = await tesseract.recognize(imageBuffer, 'eng');
            text = result.data.text;
        }

        let rawMatches = [];

        // Split the text into isolated chunks (cells) using double spaces or newlines
        // This prevents adjacent numbers from blending together and confusing the parser
        let chunks = text.split(/(?:\s{2,}|\n+)/);

        for (let chunk of chunks) {
            chunk = chunk.trim();
            if (!chunk) continue;

            let maskedChunk = chunk;

            // 1. Extract Indian ITFS numbers (000 800 ...) FIRST
            const itfsRegex = /000[- ]?800[- ]?\d{3,4}[- ]?\d{4}/g;
            let itfsMatch;
            while ((itfsMatch = itfsRegex.exec(maskedChunk)) !== null) {
                rawMatches.push({
                    number: itfsMatch[0].replace(/[- ]/g, ' '), // Normalize spaces
                    type: 'TOLL_FREE_ITFS',
                    country: 'IN'
                });
                maskedChunk = maskedChunk.substring(0, itfsMatch.index) + 
                              " ".repeat(itfsMatch[0].length) + 
                              maskedChunk.substring(itfsMatch.index + itfsMatch[0].length);
            }

            // 1.5 Auto-detect US dashed format missing +1 (e.g. 650-543-4800)
            // OCR sometimes drops the +1, causing them to be incorrectly parsed as Indian mobile numbers
            if (/^[2-9]\d{2}-\d{3}-\d{4}$/.test(maskedChunk)) {
                maskedChunk = '+1 ' + maskedChunk;
            }

            // 2. Clean OCR literal mistakes ONLY for standard libphonenumber extraction
            let ocrCorrectedChunk = maskedChunk
                .replace(/[Oo]/g, '0')
                .replace(/[lI|]/g, '1')
                .replace(/[sS]/g, '5')
                .replace(/[Zz]/g, '2')
                .replace(/[bB]/g, '8');

            // 3. Find all standard phone numbers within the chunk
            const foundNumbers = findPhoneNumbersInText(ocrCorrectedChunk, 'IN');

            for (const match of foundNumbers) {
                // Ensure the number is strictly valid according to international standards
                if (!match.number.isValid()) continue;

                rawMatches.push({
                    number: match.number.formatInternational(),
                    type: match.number.getType() || 'UNKNOWN',
                    country: match.number.country || 'UNKNOWN'
                });
                // Replace the matched number with spaces in the ORIGINAL chunk
                maskedChunk = maskedChunk.substring(0, match.startsAt) + 
                              " ".repeat(match.endsAt - match.startsAt) + 
                              maskedChunk.substring(match.endsAt);
            }

            // 4. Extract Short Codes from the remaining masked chunk
            let blocks = maskedChunk.split(/\s+/);
            for (let block of blocks) {
                block = block.trim();
                if (!block) continue;
                
                let pureAlphaNum = block.replace(/[\s-+()]/g, '');
                let isShortCode = /^\d{3,6}$/.test(pureAlphaNum) && !/[a-zA-Z]/.test(block);
                
                if (isShortCode) {
                    rawMatches.push({
                        number: pureAlphaNum,
                        type: 'SHORT_CODE',
                        country: 'LOCAL'
                    });
                }
            }
        }

        // Remove duplicates by stringifying the object for comparison
        const uniqueSet = new Set();
        let uniqueNumbers = rawMatches.filter(item => {
            const str = JSON.stringify(item);
            if (!uniqueSet.has(str)) {
                uniqueSet.add(str);
                return true;
            }
            return false;
        });

        // Save to Database
        const extraction = new Extraction({
            originalFileName: req.file.originalname,
            extractedNumbers: uniqueNumbers,
            extractedText: text
        });

        await extraction.save();

        res.json({
            success: true,
            id: extraction._id,
            originalFileName: extraction.originalFileName,
            extractedNumbers: uniqueNumbers,
            createdAt: extraction.createdAt
        });

    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Failed to process image', details: error.message });
    }
});

// Route to fetch history (optional)
app.get('/api/history', async (req, res) => {
    try {
        const extractions = await Extraction.find().sort({ createdAt: -1 }).limit(20);
        res.json(extractions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
