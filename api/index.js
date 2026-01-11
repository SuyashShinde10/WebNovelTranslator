require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Allow CORS from anywhere
app.use(cors({ origin: "*" }));
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// Default route
app.get('/', (req, res) => {
    res.send("Backend is running!");
});

// Translation Route
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

    try {
        // Using gemini-pro which is generally stable
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
        
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

// VERCEL EXPORT (Important!)
if (process.env.VERCEL) {
    module.exports = app;
} else {
    const PORT = 5000;
    app.listen(PORT, () => {
        console.log(`Server running locally on http://localhost:${PORT}`);
    });
}