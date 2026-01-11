require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
// UPDATED: Using the specific model you requested
const MODEL_NAME = "gemini-2.5-flash"; 

// --- CHECK API KEY ---
if (!API_KEY) {
  console.error("❌ CRITICAL: GEMINI_API_KEY is missing in .env file.");
} else {
  console.log(`✅ API Key loaded. Target Model: ${MODEL_NAME}`);
}

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send(`Backend Running. Model: ${MODEL_NAME}`);
});

app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (req.file) {
    console.log(`📂 File Uploaded: ${req.file.originalname}`);
    res.json({ filename: req.file.originalname });
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text, targetLang } = req.body;

  if (!API_KEY) return res.status(500).json({ error: "Server missing API Key" });
  if (!text) return res.status(400).json({ error: "No text provided" });

  console.log(`🔄 Sending to ${MODEL_NAME}...`);

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
      console.log("✅ Translation Success!");
      res.json({ translatedText });
    } else {
      throw new Error("Empty response from AI");
    }

  } catch (error) {
    console.error("❌ AI Error Details:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(JSON.stringify(error.response.data, null, 2));
      
      // If 404, it means 'gemini-2.5-flash' might be restricted on your key
      if (error.response.status === 404) {
        console.error("⚠️ HINT: This account might not have access to gemini-2.5-flash yet.");
      }
      
      res.status(500).json({ 
        error: "AI Model Error", 
        details: error.response.data 
      });
    } else {
      console.error(error.message);
      res.status(500).json({ error: "Server Error", details: error.message });
    }
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));