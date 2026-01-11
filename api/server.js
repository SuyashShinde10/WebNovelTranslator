require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// --- 1. SMART AI CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
let ACTIVE_MODEL = 'gemini-pro'; // Default fallback

// Function to find a working model automatically
async function findWorkingModel() {
    console.log("🔍 Auto-detecting best AI model...");
    try {
        // Ask Google for list of available models
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const models = response.data.models;
        
        // Find the first model that supports text generation (generateContent)
        // We prefer 'gemini-1.5' or 'gemini-pro'
        const bestModel = models.find(m => 
            m.supportedGenerationMethods.includes('generateContent') && 
            m.name.includes('gemini')
        );

        if (bestModel) {
            // Google returns names like "models/gemini-pro", we need just "gemini-pro"
            ACTIVE_MODEL = bestModel.name.replace('models/', '');
            console.log(`✅ Success! Connected to AI Model: ${ACTIVE_MODEL}`);
        } else {
            console.log("⚠️ No specific Gemini model found in list. Using default 'gemini-pro'.");
        }
    } catch (err) {
        console.error("❌ Auto-detect failed. Check your API Key in .env file.");
        console.error("Error details:", err.response ? err.response.data : err.message);
    }
}

// Run the check immediately on startup
findWorkingModel();


// --- 2. MULTER SETUP ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + safeName);
  }
});
const upload = multer({ storage: storage });

// --- ROUTES ---

// Upload Route
app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ filename: req.file.filename, originalName: req.file.originalname });
});

// Stream PDF Route
app.get('/api/read-novel/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'application/pdf' };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'application/pdf' });
        fs.createReadStream(filePath).pipe(res);
    }
});

// --- 3. TRANSLATION ROUTE (Uses Auto-Detected Model) ---
app.post('/api/translate', async (req, res) => {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    console.log(`AI Translating to ${targetLang} using ${ACTIVE_MODEL}...`);

    let promptText = "";
    if (targetLang === 'hi') {
        promptText = `Translate the following fiction text into casual, daily-spoken Hindi (Hindustani). Do NOT use complex Sanskrit words. Text: "${text}"`;
    } else {
        promptText = `Translate the following text into ${targetLang}:\n\n"${text}"`;
    }

    try {
        // We use the ACTIVE_MODEL variable we found at startup
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${API_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: promptText }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const translatedText = response.data.candidates[0].content.parts[0].text;
        res.json({ original: text, translatedText: translatedText, lang: targetLang });

    } catch (err) {
        console.error("AI API Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ 
            error: 'Translation failed', 
            details: err.response ? JSON.stringify(err.response.data) : err.message 
        });
    }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});