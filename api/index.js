require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();

// --- CRITICAL FIX FOR VERCEL ---
// Use memoryStorage instead of diskStorage.
// This stores the file in RAM instead of trying to create a folder (which causes the crash).
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash"; // Or 'gemini-1.5-flash' if 2.5 is not available

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send(`Backend Running. Mode: Serverless (Memory Storage). Model: ${MODEL_NAME}`);
});

// Upload Route (Now uses RAM, won't crash Vercel)
app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (req.file) {
    // In memory storage, we don't have a path, but we have the buffer.
    // Since we just need to confirm upload for the UI:
    console.log(`📂 File Received in Memory: ${req.file.originalname}`);
    res.json({ filename: req.file.originalname });
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
});

// Translate Route
app.post('/api/translate', async (req, res) => {
  const { text, targetLang } = req.body;

  if (!API_KEY) return res.status(500).json({ error: "Server missing API Key" });
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ 
          text: `Translate this fiction text into casual Hindi (Devanagari). Keep the flow natural: "${text}"` 
        }]
      }]
    });

    const translatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (translatedText) {
      res.json({ translatedText });
    } else {
      throw new Error("Empty response from AI");
    }

  } catch (error) {
    console.error("❌ AI Error Details:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(JSON.stringify(error.response.data, null, 2));
      res.status(500).json({ error: "AI Model Error", details: error.response.data });
    } else {
      console.error(error.message);
      res.status(500).json({ error: "Server Error", details: error.message });
    }
  }
});

// Vercel requires exporting the app, not just listening
// If running locally, it listens. If on Vercel, it exports.
if (require.main === module) {
    const PORT = 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}

module.exports = app;