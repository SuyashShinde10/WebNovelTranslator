require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const os = require('os'); // Import OS to find the temporary directory

const app = express();

// Allow CORS from anywhere (since Vercel domains change)
app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
let ACTIVE_MODEL = 'gemini-pro';

// --- 1. MODEL DETECTION (Same as before) ---
async function findWorkingModel() {
    // ... (Keep your existing findWorkingModel logic here) ...
    // For brevity, assuming gemini-pro if checking fails on serverless boot
}
// Trigger check (Note: In serverless, this runs on every request)
findWorkingModel();

// --- 2. VERCEL STORAGE SETUP (/tmp) ---
// Vercel works differently. We cannot use a persistent 'uploads' folder.
// We must use the system's temporary directory.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use the system temp folder (works on Vercel and Localhost)
    const uploadPath = os.tmpdir(); 
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

app.get('/', (req, res) => {
    res.send("Backend is running!");
});

app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  // Return the filename so frontend can request it later
  res.json({ filename: req.file.filename, originalName: req.file.originalname });
});

app.get('/api/read-novel/:filename', (req, res) => {
    // Look in the temp folder
    const filePath = path.join(os.tmpdir(), req.params.filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found (Vercel storage is temporary!)');
    }
    
    // ... (Keep your existing Streaming Logic here) ...
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

app.post('/api/translate', async (req, res) => {
    // ... (Keep your existing Translation Logic here) ...
    // Copy the exact logic from the previous step.
     const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    let promptText = "";
    if (targetLang === 'hi') {
        promptText = `Translate the following fiction text into casual, daily-spoken Hindi (Hindustani). Do NOT use complex Sanskrit words. Text: "${text}"`;
    } else {
        promptText = `Translate the following text into ${targetLang}:\n\n"${text}"`;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${API_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: promptText }] }]
        }, { headers: { 'Content-Type': 'application/json' } });

        const translatedText = response.data.candidates[0].content.parts[0].text;
        res.json({ original: text, translatedText: translatedText, lang: targetLang });

    } catch (err) {
        res.status(500).json({ error: 'Translation failed', details: err.message });
    }
});

// --- IMPORTANT FOR VERCEL ---
// Export the app instead of listening if running on Vercel
if (process.env.VERCEL) {
    module.exports = app;
} else {
    const PORT = 5000;
    app.listen(PORT, () => {
        console.log(`Server running locally on http://localhost:${PORT}`);
    });
}