
// api/ask.js — Vercel Serverless Function
// La clé API Gemini reste côté serveur, jamais exposée au navigateur

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages array' });
  }

  // ✅ La clé API est lue depuis les variables d'environnement Vercel
  // Elle n'apparaît JAMAIS dans le code côté client
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  // Convert messages format to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API error:', data.error);
      return res.status(502).json({ error: data.error.message });
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini response:', JSON.stringify(data));
      return res.status(502).json({ error: 'Empty or unexpected response from Gemini' });
    }

    const answer = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ answer });

  } catch (err) {
    console.error('Network error calling Gemini:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
