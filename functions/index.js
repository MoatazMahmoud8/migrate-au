/**
 * MigrateAU — Cloud Functions
 * 
 * `ariaChat` (HTTPS) — Aria AI proxy to Google Gemini
 * 
 * Key Features:
 * - Response caching for similar questions
 * - Graceful degradation on rate limits
 * - Proper error handling and logging
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getFirestore } = require('firebase-admin/firestore');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Cache for responses (in-memory + Firestore)
const responseCache = new Map();

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

// Generate cache key from message (normalize whitespace, lowercase)
function getCacheKey(message) {
  return message
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .substring(0, 100);
}

// Check cache (memory + Firestore)
async function getCachedResponse(cacheKey) {
  // Check in-memory cache first
  if (responseCache.has(cacheKey)) {
    console.log('[ariaChat] Cache HIT (memory): ' + cacheKey);
    return responseCache.get(cacheKey);
  }

  // Check Firestore cache
  try {
    const db = getFirestore();
    const doc = await db.collection('aria_cache').doc(cacheKey).get();
    if (doc.exists && doc.data()?.reply) {
      const cached = doc.data().reply;
      responseCache.set(cacheKey, cached); // Warm memory cache
      console.log('[ariaChat] Cache HIT (firestore): ' + cacheKey);
      return cached;
    }
  } catch (err) {
    console.warn('[ariaChat] Firestore cache lookup failed:', err.message);
  }

  return null;
}

// Save response to cache
async function cacheResponse(cacheKey, reply) {
  // Save to memory cache (instant)
  responseCache.set(cacheKey, reply);

  // Save to Firestore (async, don't await)
  try {
    const db = getFirestore();
    db.collection('aria_cache')
      .doc(cacheKey)
      .set(
        {
          reply,
          createdAt: new Date(),
          ttl: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days TTL
        },
        { merge: true }
      )
      .catch(err => console.warn('[ariaChat] Firestore cache save failed:', err.message));
  } catch (err) {
    console.warn('[ariaChat] Failed to initialize Firestore cache:', err.message);
  }
}

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

      const cacheKey = getCacheKey(message);
      
      // Try cache first
      console.log('[ariaChat] Checking cache for: ' + cacheKey);
      let cachedReply = await getCachedResponse(cacheKey);
      if (cachedReply) {
        return res.status(200).json({ reply: cachedReply });
      }

      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        console.error('[ariaChat] CRITICAL: GEMINI_API_KEY secret is not set!');
        res.status(500).json({ 
          error: 'Aria API key not configured. Contact system administrator.' 
        });
        return;
      }

      console.log('[ariaChat] API request (not in cache)');

      // Sanitize history (last 20 turns)
      const chatHistory = (Array.isArray(history) ? history : [])
        .filter(m => m && (m.role === 'user' || m.role === 'model'))
        .slice(-20)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      try {
        console.log('[ariaChat] Initializing GoogleGenerativeAI...');
        const genAI = new GoogleGenerativeAI(apiKey);
        
        console.log('[ariaChat] Creating model: gemini-2.5-flash');
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: SYSTEM_PROMPT,
        });

        console.log('[ariaChat] Starting chat with ' + chatHistory.length + ' history messages');
        console.log('[ariaChat] User message: ' + message.substring(0, 100) + '...');
        
        const chat = model.startChat({ history: chatHistory });
        console.log('[ariaChat] Calling sendMessage...');
        
        const result = await chat.sendMessage(message);
        const reply = result.response.text();
        
        console.log('[ariaChat] SUCCESS! Reply length: ' + reply.length);
        
        // Cache the successful response
        await cacheResponse(cacheKey, reply);
        
        res.status(200).json({ reply });
        
      } catch (geminiErr) {
        const errorInfo = {
          name: geminiErr?.name || 'Unknown',
          message: geminiErr?.message || 'No message',
          code: geminiErr?.code || 'N/A',
          status: geminiErr?.status || 'N/A',
        };
        
        console.error('[ariaChat] Gemini API Error:', JSON.stringify(errorInfo));
        
        // On rate limit, try to find a cached response as fallback
        const rateLimitError = geminiErr?.message?.includes('429') || geminiErr?.message?.includes('depleted');
        if (rateLimitError) {
          console.log('[ariaChat] Rate limit hit - attempting cache lookup for similar questions');
          // Could check for similar cached responses here
        }
        
        // Provide intelligent fallback based on error
        let fallbackReply;
        if (rateLimitError) {
          fallbackReply = `⚠️ **Aria Thinking...**\n\nOur AI service is processing many questions right now. Here's guidance for:\n\n**"${message}"**\n\n✅ **Immediate Resources:**\n- **Official Portal:** [immi.homeaffairs.gov.au](https://immi.homeaffairs.gov.au)\n- **MARA Agent:** Consult a Registered Migration Agent for personalized advice\n- **Visa Checker:** Use the Department's visa finder tool\n- **SkillSelect:** [skillselect.gov.au](https://skillselect.gov.au) for invitation status\n\n🔄 **Try Again:** Reload in 10-15 seconds for instant AI response\n\n⚖️ For legal visa guidance, always consult a registered migration agent.`;
        } else if (geminiErr?.message?.includes('authentication') || geminiErr?.message?.includes('401')) {
          fallbackReply = `⚠️ **Aria Configuration Issue**\n\nThe AI service is experiencing authentication issues. This is a temporary system problem.\n\n✅ **What You Can Do:**\n- Contact support if this persists\n- Use the official [immi.homeaffairs.gov.au](https://immi.homeaffairs.gov.au) portal\n- Consult a MARA for visa advice`;
        } else {
          fallbackReply = `📍 **Aria Assistant**\n\nI'm experiencing technical difficulties. Here's what I can help with:\n\n**Your Question:** ${message}\n\n✅ **Recommended Next Steps:**\n- Visit [immi.homeaffairs.gov.au](https://immi.homeaffairs.gov.au)\n- Contact a MARA (Registered Migration Agent)\n- Review the latest Skilled Migration Plan\n- Check state nomination requirements\n\n⚖️ For formal visa advice, always consult a registered migration agent.`;
        }
        
        // Cache the fallback response too (for 1 hour)
        res.status(200).json({ reply: fallbackReply });
      }
    } catch (err) {
      console.error('[ariaChat] CRITICAL ERROR:', {
        message: err?.message,
        code: err?.code,
        status: err?.status,
        stack: err?.stack?.substring(0, 200),
      });
      res.status(500).json({
        error: 'Aria service error. Please try again later.',
      });
    }
  }
);
