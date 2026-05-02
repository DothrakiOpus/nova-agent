import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── CLAUDE PROXY ──────────────────────────────────────────
app.post('/api/claude', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Claude API failed' });
  }
});

// ── ELEVENLABS PROXY ──────────────────────────────────────
app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.85,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs error:', response.status, errText);
      return res.status(502).json({ error: 'ElevenLabs API error', status: response.status });
    }
    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    res.status(500).json({ error: 'ElevenLabs API failed' });
  }
});

// ── SERVE NOVA FRONTEND ───────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

export default app;