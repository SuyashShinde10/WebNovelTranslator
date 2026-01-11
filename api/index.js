require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
// SWITCH to 'v1' for better stability with newer models in 2026
const BASE_URL = "https://generativelanguage.googleapis.com/v1"; 

// --- UPDATED MODEL LIST (2026 Standards) ---
const MODEL_CASCADE = [
    'gemini-3-flash',        // 🚀 Newest/Fastest (Late 2025 release)
    'gemini-2.5-flash',      // ✅ Stable Workhorse
    'gemini-2.0-flash',      // 👴 Legacy fallback
];

async function tryTranslate(modelName, promptText) {
    const cleanName = modelName.replace('models/', '');
    const url = `${BASE_URL}/models/${cleanName}:generateContent?key=${API_KEY}`;
    
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: promptText }] }]
        }, { headers: { 'Content-Type': 'application/json' } });

        // SAFETY CHECK: Ensure the API actually returned a candidate
        if (!response.data.candidates || response.data.candidates.length === 0) {
            throw new Error("Blocked by safety filters or empty response.");
        }

        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        // Extract the real error message from Google's API response
        const apiMessage = error.response?.data?.error?.message || error.message;
        throw new Error(`[${cleanName}] Error: ${apiMessage}`);
    }
}

app.post('/api/translate', async (req, res) => {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    console.log(`\n--- Starting Translation to ${targetLang} ---`);

    let promptText = "";
    if (targetLang === 'hi') {
        promptText = `Translate this fiction text into casual, daily-spoken Hindi (Hindustani). Avoid complex Sanskrit words. Text: "${text}"`;
    } else {
        promptText = `Translate this text into ${targetLang}:\n\n"${text}"`;
    }

    // PHASE 1: Try the Cascade
    for (const modelName of MODEL_CASCADE) {
        try {
            console.log(`👉 Trying model: ${modelName}...`);
            const result = await tryTranslate(modelName, promptText);
            console.log(`✅ Success with ${modelName}!`);
            
            return res.json({ 
                original: text, 
                translatedText: result, 
                usedModel: modelName 
            });

        } catch (err) {
            console.warn(`⚠️ ${err.message}`); 
            // Loop continues to the next model...
        }
    }

    // PHASE 2: Ultimate Failure
    console.error("❌ All models failed.");
    res.status(500).json({ 
        error: 'Translation Failed', 
        details: 'All AI models (Gemini 3, 2.5) failed. Check server logs for API Key issues.' 
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