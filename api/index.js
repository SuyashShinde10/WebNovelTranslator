require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();

// --- 1. MEMORY STORAGE (Required for Vercel) ---
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// --- 2. MODEL STRATEGY ---
// Primary: The one you want (High Quality, Low Limit: 5 RPM)
const PRIMARY_MODEL = "gemini-2.5-flash"; 
// Backup: The standard one (Good Quality, Higher Limit: 15 RPM)
const BACKUP_MODEL = "gemini-1.5-flash";   

// Helper to call Google AI
async function translateWithModel(modelName, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
  const response = await axios.post(url, {
    contents: [{ 
      parts: [{ text: `Translate this fiction text into casual Hindi (Devanagari). Keep it natural: "${text}"` }] 
    }]
  });
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text;
}

app.get('/', (req, res) => {
  res.send(`Backend Online. Primary: ${PRIMARY_MODEL} | Backup: ${BACKUP_MODEL}`);
});

app.post('/api/upload', upload.single('novelPdf'), (req, res) => {
  if (req.file) {
    console.log(`📂 PDF Received: ${req.file.originalname}`);
    res.json({ filename: req.file.originalname });
  } else {
    res.status(400).json({ error: "No file uploaded" });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text } = req.body;

  if (!API_KEY) return res.status(500).json({ error: "Missing API Key" });
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    // PHASE 1: Try your preferred model (2.5)
    console.log(`✨ Trying Primary (${PRIMARY_MODEL})...`);
    const translation = await translateWithModel(PRIMARY_MODEL, text);
    console.log(`✅ Success with ${PRIMARY_MODEL}`);
    return res.json({ translatedText: translation, model: PRIMARY_MODEL });

  } catch (primaryError) {
    // If 2.5 fails (usually Error 429 Rate Limit), switch to 1.5
    console.warn(`⚠️ ${PRIMARY_MODEL} failed (Status: ${primaryError.response?.status}). Switching to Backup...`);

    try {
      // PHASE 2: Try Backup model (1.5)
      console.log(`🔄 Retrying with Backup (${BACKUP_MODEL})...`);
      const backupTranslation = await translateWithModel(BACKUP_MODEL, text);
      console.log(`✅ Saved by ${BACKUP_MODEL}`);
      return res.json({ translatedText: backupTranslation, model: BACKUP_MODEL });

    } catch (backupError) {
      // PHASE 3: If both fail, tell the user to wait
      console.error("❌ Both models failed.");
      
      if (backupError.response?.status === 429) {
        return res.status(429).json({ 
          error: "Rate Limit Hit", 
          translatedText: "⚠️ You are reading too fast! Please wait 30 seconds for quota reset." 
        });
      }
      
      return res.status(500).json({ 
        error: "Translation Failed", 
        details: backupError.message 
      });
    }
  }
});

// Export for Vercel
module.exports = app;

if (require.main === module) {
    app.listen(5000, () => console.log("Server running on port 5000"));
}