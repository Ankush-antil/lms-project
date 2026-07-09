const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');

router.post('/chat', protect, async (req, res, next) => {
    try {
        const { prompt, image } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required' });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'Groq API Key is not configured on the server' });
        }

        // Call Groq API using native fetch on OpenAI compatible endpoint
        const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

        // Select model and format content based on whether an image is provided
        const model = image ? 'qwen/qwen3.6-27b' : 'llama-3.3-70b-versatile';
        const messageContent = image 
            ? [
                { type: 'text', text: prompt },
                {
                    type: 'image_url',
                    image_url: {
                        url: image
                    }
                }
              ]
            : prompt;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: messageContent
                    }
                ],
                response_format: {
                    type: 'json_object'
                },
                temperature: 0.2
            })
        });

        if (!response.ok) {
            let detailMsg = `Groq API returned status ${response.status}`;
            try {
                const errJson = await response.json();
                if (errJson.error?.message) {
                    detailMsg = errJson.error.message;
                }
            } catch (_) {}
            return res.status(response.status).json({ message: detailMsg });
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content;
        
        if (!responseText) {
            return res.status(500).json({ message: 'Empty response returned from Groq API' });
        }

        res.json({ text: responseText });
    } catch (err) {
        console.error('[GROQ CHAT ERROR]', err.message);
        res.status(500).json({
            message: err.message || 'Groq API execution failed'
        });
    }
});

module.exports = router;
