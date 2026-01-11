require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();

// --- 1. MEMORY STORAGE (Fixes the Vercel crash) ---
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
// Use ONLY 1.5-flash. It is the fastest and has the highest free limits.
const MODEL_NAME = "gemini-1.5-flash"; 

app.get('/', (req, res) => {
  res.send(`Backend Running. Model: ${MODEL_NAME}`);
});

app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (req.file) {
    console.log(`📂 File received: ${req.file.originalname}`);
    res.json({ filename: req.file.originalname });
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text } = req.body;

  if (!API_KEY) return res.status(500).json({ error: "Server missing API Key" });
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: `Translate to Hindi (Casual): "${text}"` }]
      }]
    });

    const translatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (translatedText) {
      res.json({ translatedText });
    } else {
      throw new Error("Empty response from AI");
    }

  } catch (error) {
    // --- SPECIFIC ERROR HANDLING ---
    if (error.response) {
      const status = error.response.status;
      console.error(`❌ API Error ${status}:`, JSON.stringify(error.response.data));

      if (status === 429) {
        // RATE LIMIT ERROR
        return res.status(429).json({ 
          error: "Quota Exceeded", 
          translatedText: "⚠️ System is busy (Rate Limit). Please wait 1 minute." 
        });
      }
      
      return res.status(status).json({ error: "AI Error", details: error.response.data });
    }
    
    console.error("Server Error:", error.message);
    res.status(500).json({ error: "Server connection failed" });
  }
});

module.exports = app;

if (require.main === module) {
    const PORT = 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}