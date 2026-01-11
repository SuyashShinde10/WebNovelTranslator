require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Allow CORS from anywhere
app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// --- SMART MODEL DETECTION ---
// We will look for these preferred models in order
const PREFERRED_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
let activeModel = 'gemini-1.5-flash'; // Default fallback

async function autoDetectModel() {
    try {
        console.log("🔍 Auto-detecting best AI model...");
        // Ask Google: "What models do I have access to?"
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await axios.get(listUrl);
        const availableModels = response.data.models || [];

        // Find the first model that supports 'generateContent'
        const bestModel = availableModels.find(m => 
            m.supportedGenerationMethods && 
            m.supportedGenerationMethods.includes('generateContent') &&
            PREFERRED_MODELS.some(pref => m.name.includes(pref))
        );

        if (bestModel) {
            // Google returns "models/gemini-1.5-flash", we want just "gemini-1.5-flash"
            activeModel = bestModel.name.replace('models/', '');
            console.log(`✅ Success! Switched to AI Model: ${activeModel}`);
        } else {
            console.log("⚠️ Could not auto-detect. Using default:", activeModel);
            console.log("Available models were:", availableModels.map(m => m.name));
        }
    } catch (err) {
        console.error("❌ Auto-detect failed. Using default.", err.message);
    }
}
// Run detection when server starts
autoDetectModel();


// --- ROUTES ---

app.get('/', (req, res) => {
    res.send(`Backend is running! Active Model: ${activeModel}`);
});

app.post('/api/translate', async (req, res) => {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    console.log(`AI Translating to ${targetLang} using ${activeModel}...`);

    let promptText = "";
    if (targetLang === 'hi') {
        promptText = `Translate the following fiction text into casual, daily-spoken Hindi (Hindustani). Do NOT use complex Sanskrit words. Text: "${text}"`;
    } else {
        promptText = `Translate the following text into ${targetLang}:\n\n"${text}"`;
    }

    try {
        // Use the ACTIVE MODEL we found earlier
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${API_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: promptText }] }]
        }, { headers: { 'Content-Type': 'application/json' } });

        const translatedText = response.data.candidates[0].content.parts[0].text;
        res.json({ original: text, translatedText: translatedText, lang: targetLang });

    } catch (err) {
        console.error("AI API Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ error: 'Translation failed', details: err.message });
    }
});

// VERCEL EXPORT
if (process.env.VERCEL) {
    module.exports = app;
} else {
    const PORT = 5000;
    app.listen(PORT, () => {
        console.log(`Server running locally on http://localhost:${PORT}`);
    });
}