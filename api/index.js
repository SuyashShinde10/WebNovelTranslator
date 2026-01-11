require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();

// 1. Memory Storage (Crucial for Vercel)
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// 2. USE THE SAFEST MODEL
// gemini-2.5-flash often returns 404 on new keys.
// gemini-1.5-flash is standard and works on all new keys.
const MODEL_NAME = "gemini-1.5-flash"; 

app.get('/', (req, res) => {
  res.send(`Backend Online. Model: ${MODEL_NAME}`);
});

app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (req.file) {
    console.log(`📂 Uploaded: ${req.file.originalname}`);
    res.json({ filename: req.file.originalname });
  } else {
    res.status(400).json({ error: "No file sent" });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text } = req.body;

  if (!API_KEY) return res.status(500).json({ error: "Missing API Key" });
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
      res.json({ translatedText });
    } else {
      throw new Error("No text returned from AI");
    }

  } catch (error) {
    // Check if Google says "Model Not Found" (404) or "Rate Limit" (429)
    if (error.response) {
      const status = error.response.status;
      console.error(`⚠️ API Error ${status}:`, JSON.stringify(error.response.data));

      if (status === 404) {
        return res.status(404).json({ error: `Model ${MODEL_NAME} not found. Check API Key.` });
      }
      if (status === 429) {
        return res.status(429).json({ error: "Too many requests. Please wait." });
      }
    }
    
    console.error("Server Error:", error.message);
    res.status(500).json({ error: "Translation Failed" });
  }
});

// 3. Export for Vercel Serverless
module.exports = app;

// 4. Local Development Fallback
if (require.main === module) {
    app.listen(5000, () => console.log("Server running on port 5000"));
}