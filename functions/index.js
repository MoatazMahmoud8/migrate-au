/**
 * MigrateAU — Cloud Functions
 * 
 * `ariaChat` (HTTPS) — Aria AI proxy to Google Gemini
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const SYSTEM_PROMPT = `You are Aria 🇦🇺 — Senior Australian Migration Consultant AI.

## SCOPE: Australian Migration Only
- Skilled visas: 189, 190, 491, 482, 186, 485, 494
- Family visas: 820/801, 309/100, 143
- Student visa 500, Visitor visa 600
- Points system, ANZSCO codes, Skills assessments
- English tests (IELTS, PTE, TOEFL, CAE, OET)
- State nominations & invitation trends
- EOI strategy, document validity, age-bracket points

Off-topic: "I'm focused on Australian migration."

## GOLDEN PATH (5 Stages)
1. **PREPARATION** — Skills assessment, English test, docs
2. **EXPRESSION** — EOI, points optimisation
3. **LODGEMENT** — Visa application
4. **SETTLEMENT** — Arrival, PR obligations
5. **CITIZENSHIP** — Eligibility, test, passport

Always tell user: "📍 Stage X: [Name]" and "🚀 Next Step: [action]"

Use Markdown, tables, bullet points.
End with: "⚖️ Consult MARA for formal advice."`;

function setCorsHeaders(req, res) {
  const origin = req.get('origin') || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Vary', 'Origin');
}

exports.ariaChat = onRequest(
  {
    region: 'us-central1',
    secrets: [GEMINI_API_KEY],
    cors: true,
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { message, history } = req.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'message required' });
        return;
      }

      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        res.status(500).json({ error: 'API key not set' });
        return;
      }

      // Sanitize history (last 20 turns)
      const chatHistory = (Array.isArray(history) ? history : [])
        .filter(m => m && (m.role === 'user' || m.role === 'model'))
        .slice(-20)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      // Call Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        systemInstruction: SYSTEM_PROMPT,
      });

      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message);
      const reply = result.response.text();

      res.status(200).json({ reply });
    } catch (err) {
      console.error('[ariaChat] error:', err?.message);
      res.status(500).json({
        error: 'Aria is temporarily unavailable. Please try again.',
      });
    }
  }
);
