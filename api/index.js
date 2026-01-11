require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();
// Use Memory Storage (Fixes Vercel Crash)
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// --- CRITICAL CHANGE: USE 1.5 FLASH (Higher Limits: 15 RPM) ---
const MODEL_NAME = "gemini-1.5-flash"; 

app.get('/', (req, res) => {
  res.send(`Backend Online. Using safe model: ${MODEL_NAME}`);
});

app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (req.file) {
    console.log(`📂 File uploaded: ${req.file.originalname}`);
    res.json({ filename: req.file.originalname });
  } else {
    res.status(400).json({ error: "No file sent" });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text } = req.body;

  if (!API_KEY) return res.status(500).json({ error: "No API Key" });
  if (!text) return res.status(400).json({ error: "No text" });

  try {
    // Standard Request (No loop, safer)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: `Translate this fiction to casual Hindi: "${text}"` }]
      }]
    });

    const translatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (translatedText) {
      res.json({ translatedText });
    } else {
      throw new Error("No text returned");
    }

  } catch (error) {
    // HANDLE RATE LIMITS GRACEFULLY
    if (error.response && error.response.status === 429) {
      console.error("⚠️ RATE LIMIT HIT (429)");
      return res.status(429).json({ 
        error: "Too Fast!", 
        translatedText: "⚠️ You are reading too fast for the free tier. Please wait 1 minute." 
      });
    }
    
    console.error("Error:", error.message);
    res.status(500).json({ error: "Translation Failed" });
  }
});

module.exports = app;

if (require.main === module) {
    app.listen(5000, () => console.log("Server started on port 5000"));
}