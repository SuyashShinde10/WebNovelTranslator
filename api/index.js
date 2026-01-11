require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();
// Use Memory Storage (Critical for Vercel)
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// --- SMART MODEL SELECTION ---
const PRIMARY_MODEL = "gemini-2.5-flash";  // Try this first (Better Quality)
const BACKUP_MODEL = "gemini-1.5-flash";   // Fallback (Higher Rate Limits)

// Helper function to call AI
async function callGemini(model, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: `Translate this fiction text into casual Hindi (Devanagari). Keep it natural: "${text}"` }] }]
  });
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text;
}

app.get('/', (req, res) => {
  res.send(`Backend Online. Primary: ${PRIMARY_MODEL} | Backup: ${BACKUP_MODEL}`);
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
    // 1. TRY PRIMARY MODEL (2.5 Flash)
    console.log(`✨ Trying ${PRIMARY_MODEL}...`);
    const translation = await callGemini(PRIMARY_MODEL, text);
    console.log(`✅ Success with ${PRIMARY_MODEL}`);
    return res.json({ translatedText: translation, model: PRIMARY_MODEL });

  } catch (error) {
    console.warn(`⚠️ ${PRIMARY_MODEL} failed (Status ${error.response?.status}). Switching to backup...`);

    // 2. IF FAILED, TRY BACKUP MODEL (1.5 Flash)
    try {
      console.log(`🔄 Retrying with ${BACKUP_MODEL}...`);
      const backupTranslation = await callGemini(BACKUP_MODEL, text);
      console.log(`✅ Saved by ${BACKUP_MODEL}`);
      return res.json({ translatedText: backupTranslation, model: BACKUP_MODEL });

    } catch (backupError) {
      // 3. IF BOTH FAIL
      console.error("❌ Both models failed.");
      
      if (backupError.response?.status === 429) {
        return res.status(429).json({ 
          error: "System Busy", 
          translatedText: "⚠️ Server is busy (Rate Limit). Please wait 30 seconds." 
        });
      }
      
      return res.status(500).json({ error: "Translation Failed", details: backupError.message });
    }
  }
});

module.exports = app;

if (require.main === module) {
    app.listen(5000, () => console.log("🚀 Server running on port 5000"));
}