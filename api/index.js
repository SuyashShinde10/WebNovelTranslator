require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();

// --- 1. CRITICAL FIX FOR VERCEL ---
// Use memoryStorage instead of diskStorage.
// This keeps the file in RAM (buffer) instead of trying to write to the read-only disk.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
// Fallback to 1.5-flash if 2.5 is not available on your key
const MODEL_NAME = "gemini-1.5-flash"; 

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send(`Backend Running (Serverless Mode). Model: ${MODEL_NAME}`);
});

// Upload Route (Now safe for Vercel)
app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (req.file) {
    // We don't have a file path on disk anymore, just the original name.
    // This is fine because we are just passing the 'success' signal to the UI.
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
          text: `Translate this fiction text into casual Hindi (Devanagari). Keep it readable: "${text}"` 
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
      console.error(JSON.stringify(error.response.data, null, 2));
      res.status(500).json({ error: "AI Model Error", details: error.response.data });
    } else {
      console.error(error.message);
      res.status(500).json({ error: "Server Error", details: error.message });
    }
  }
});

// Export app for Vercel
module.exports = app;

// Listen only if running locally
if (require.main === module) {
    const PORT = 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}