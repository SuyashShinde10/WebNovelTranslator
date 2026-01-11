require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();
// 1. Memory Storage (Vercel Safe)
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// --- 🧠 INTELLIGENT MODEL DETECTION ---
// Instead of guessing "gemini-2.5" or "1.5", we ask Google what works.
let CACHED_MODEL_NAME = null; // Save it so we don't ask every time

async function getBestModel() {
    if (CACHED_MODEL_NAME) return CACHED_MODEL_NAME;

    try {
        console.log("🔍 Auto-detecting best AI model...");
        const response = await axios.get(`${BASE_URL}/models?key=${API_KEY}`);
        const models = response.data.models || [];

        // Filter for models that support 'generateContent'
        const validModels = models.filter(m => 
            m.supportedGenerationMethods && 
            m.supportedGenerationMethods.includes("generateContent")
        );

        // STRATEGY: Prefer 'Flash' models (fastest), then 'Pro', then anything else
        const bestModel = validModels.find(m => m.name.includes("flash")) 
                       || validModels.find(m => m.name.includes("pro"))
                       || validModels[0];

        if (!bestModel) throw new Error("No valid AI models found for this key.");

        // Clean the name (Google returns "models/gemini-1.5-flash", we just want the ID usually, 
        // but the API accepts the full string too. We'll use the full string.)
        CACHED_MODEL_NAME = bestModel.name;
        console.log(`✅ Success! Connected to AI Model: ${CACHED_MODEL_NAME.replace('models/', '')}`);
        return CACHED_MODEL_NAME;

    } catch (error) {
        console.error("❌ Model Detection Failed:", error.message);
        // Fallback if detection fails completely (Safe Default)
        return "models/gemini-1.5-flash"; 
    }
}

// --- ROUTES ---

app.get('/', async (req, res) => {
    const model = await getBestModel();
    res.send(`Backend Online. Auto-Detected Model: ${model}`);
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
        // 1. Get the working model dynamically
        const modelName = await getBestModel();
        const shortName = modelName.replace('models/', '');

        console.log(`AI Translating to hi using ${shortName}...`);

        const url = `${BASE_URL}/${modelName}:generateContent?key=${API_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: `Translate this fiction text into casual Hindi (Devanagari). Keep it natural: "${text}"` }]
            }]
        });

        const translatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (translatedText) {
            res.json({ translatedText, modelUsed: shortName });
        } else {
            throw new Error("Empty response from AI");
        }

    } catch (error) {
        // Handle Rate Limits (429) specifically
        if (error.response?.status === 429) {
            console.warn("⚠️ Rate Limit Hit. Cooling down...");
            return res.status(429).json({ 
                error: "Reading too fast", 
                translatedText: "⚠️ System busy (Auto-Throttle). Please wait 30 seconds." 
            });
        }

        console.error("Translation Error:", error.message);
        res.status(500).json({ error: "Translation Failed", details: error.message });
    }
});

module.exports = app;

// Local Start
if (require.main === module) {
    app.listen(5000, () => console.log("Server running on http://localhost:5000"));
}