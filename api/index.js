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

// --- CRITICAL FIX: USE THE STABLE MODEL ---
// gemini-3-flash does not exist.
// gemini-2.5-flash has strict rate limits.
// gemini-1.5-flash is the best for free tier apps.
const MODEL_NAME = "gemini-1.5-flash"; 

app.get('/', (req, res) => {
  res.send(`Backend Online. Using model: ${MODEL_NAME}`);
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
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    console.log(`🔄 Sending to ${MODEL_NAME}...`);
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: `Translate this fiction text into casual Hindi (Devanagari). Keep it natural: "${text}"` }]
      }]
    });

    const translatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (translatedText) {
      console.log("✅ Translation Success");
      res.json({ translatedText });
    } else {
      throw new Error("No text returned from AI");
    }

  } catch (error) {
    // Check for Rate Limits (429) or Model Not Found (404)
    if (error.response) {
      const status = error.response.status;
      console.error(`⚠️ API Error ${status}:`, JSON.stringify(error.response.data));

      if (status === 429) {
        return res.status(429).json({ 
          error: "Too Many Requests", 
          translatedText: "⚠️ Reading too fast! Please wait 30 seconds." 
        });
      }
      if (status === 404) {
        return res.status(404).json({ error: "Model Not Found (Check API Key)" });
      }
    }
    
    console.error("Server Error:", error.message);
    res.status(500).json({ error: "Translation Failed" });
  }
});

module.exports = app;

if (require.main === module) {
    app.listen(5000, () => console.log("Server started on port 5000"));
}