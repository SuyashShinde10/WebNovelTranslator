require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Allow CORS from anywhere
app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// List of models to try (in order of preference)
// If the first one fails, the code will try the next one.
const MODEL_CASCADE = [
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-1.0-pro-latest',
    'gemini-1.0-pro'
];

// Helper function to try translation with a specific model
async function tryTranslate(modelName, promptText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    const response = await axios.post(url, {
        contents: [{ parts: [{ text: promptText }] }]
    }, { headers: { 'Content-Type': 'application/json' } });
    
    return response.data.candidates[0].content.parts[0].text;
}

// --- ROUTES ---

app.get('/', (req, res) => {
    res.send("Backend is running! (Cascade Mode)");
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

    // --- THE CASCADE LOOP ---
    // Try each model one by one until success
    for (const modelName of MODEL_CASCADE) {
        try {
            console.log(`👉 Trying model: ${modelName}...`);
            const translatedText = await tryTranslate(modelName, promptText);
            
            console.log(`✅ Success with ${modelName}!`);
            return res.json({ original: text, translatedText: translatedText, lang: targetLang, usedModel: modelName });

        } catch (err) {
            console.error(`❌ ${modelName} Failed:`, err.response ? err.response.data.error.message : err.message);
            // Loop continues to the next model...
        }
    }

    // If we get here, ALL models failed
    res.status(500).json({ 
        error: 'All AI models failed', 
        details: 'Check Vercel logs. Your API Key might be invalid or has no access to any Gemini models.' 
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