require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Allow CORS from anywhere
app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// --- 1. UPDATED MODEL LIST (Your suggestion is first!) ---
const MODEL_CASCADE = [
    'gemini-2.5-flash',       // <--- Trying your suggestion first!
    'gemini-2.0-flash',       // <--- Likely alternative
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
];

// Helper: Try to generate text with a specific model
async function tryTranslate(modelName, promptText) {
    // Ensure we strip "models/" if Google gave us the full ID
    const cleanName = modelName.replace('models/', '');
    const url = `${BASE_URL}/models/${cleanName}:generateContent?key=${API_KEY}`;
    
    const response = await axios.post(url, {
        contents: [{ parts: [{ text: promptText }] }]
    }, { headers: { 'Content-Type': 'application/json' } });
    
    return response.data.candidates[0].content.parts[0].text;
}

// Helper: Fetch ANY valid model from Google if our hardcoded list fails
async function fetchValidModel() {
    try {
        console.log("⚠️ Cascade failed. Fetching available models list from Google...");
        const response = await axios.get(`${BASE_URL}/models?key=${API_KEY}`);
        const models = response.data.models || [];
        
        // Find the first model that supports 'generateContent'
        const workingModel = models.find(m => 
            m.supportedGenerationMethods && 
            m.supportedGenerationMethods.includes('generateContent')
        );
        
        if (workingModel) return workingModel.name;
        return null;
    } catch (err) {
        console.error("Failed to fetch model list:", err.message);
        return null;
    }
}

// --- ROUTES ---

app.get('/', (req, res) => {
    res.send("Backend is running! (Checking gemini-2.5-flash first)");
});

app.post('/api/translate', async (req, res) => {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    console.log(`AI Translating to ${targetLang}...`);

    let promptText = "";
    if (targetLang === 'hi') {
        promptText = `Translate the following fiction text into casual, daily-spoken Hindi (Hindustani). Do NOT use complex Sanskrit words. Text: "${text}"`;
    } else {
        promptText = `Translate the following text into ${targetLang}:\n\n"${text}"`;
    }

    // PHASE 1: Try the Cascade (Starts with 2.5-flash)
    for (const modelName of MODEL_CASCADE) {
        try {
            console.log(`👉 Trying model: ${modelName}...`);
            const result = await tryTranslate(modelName, promptText);
            console.log(`✅ Success with ${modelName}!`);
            return res.json({ original: text, translatedText: result, lang: targetLang });
        } catch (err) {
            console.log(`❌ ${modelName} failed. Trying next...`);
            // Continue loop...
        }
    }

    // PHASE 2: Emergency Fallback (Ask Google what we can use)
    try {
        const fallbackModel = await fetchValidModel();
        if (fallbackModel) {
            console.log(`👉 Trying fallback model from account: ${fallbackModel}...`);
            const result = await tryTranslate(fallbackModel, promptText);
            console.log(`✅ Success with fallback: ${fallbackModel}!`);
            return res.json({ original: text, translatedText: result, lang: targetLang });
        }
    } catch (err) {
        console.error("❌ Fallback failed:", err.message);
    }

    // If we get here, absolutely nothing worked.
    res.status(500).json({ 
        error: 'Translation Failed', 
        details: 'No working AI models found for this API Key.' 
    });
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