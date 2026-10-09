import logger from '../utils/logger.js';

// ─── Feature 1: Smart Security Recommender ───────────────────────────────────
// POST /api/ai/security-suggest
// Body: { filename: string, sizeBytes: number }
export const getSecuritySuggestion = async (req, res) => {
  const { filename, sizeBytes } = req.body;

  if (!filename) {
    return res.status(400).json({ message: 'filename is required' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    logger.warn('GROQ_API_KEY not set — using rule-based fallback for security suggestion');
    return res.json(securityFallback(filename, sizeBytes));
  }

  const prompt = buildSecurityPrompt(filename, sizeBytes);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content:
              'You are a file security advisor for an encrypted file vault. Analyze filenames and sizes to recommend secure sharing settings. Always respond with valid JSON only — no markdown, no extra text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`Groq API error (security-suggest): ${errText}`);
      return res.json(securityFallback(filename, sizeBytes));
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(`Groq returned non-JSON for security-suggest: ${raw}`);
      return res.json(securityFallback(filename, sizeBytes));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const sensitivity = (['high', 'medium', 'low'].includes(parsed.sensitivity)
      ? parsed.sensitivity
      : 'medium');

    const suggestion = {
      sensitivity,
      downloadLimit: clamp(parseInt(parsed.downloadLimit) || 5, 1, 50),
      expiresInMinutes: snapExpiry(parseInt(parsed.expiresInMinutes) || 1440),
      reason: parsed.reason || 'AI analysis complete.',
      badge: buildSecurityBadge(sensitivity),
    };

    logger.info(`AI security suggestion for "${filename}": ${suggestion.sensitivity}`);
    return res.json(suggestion);
  } catch (error) {
    logger.error(`getSecuritySuggestion error: ${error.message}`);
    return res.json(securityFallback(filename, sizeBytes));
  }
};

// ─── Feature 2: Passphrase Hint Generator ────────────────────────────────────
// POST /api/ai/passphrase-hint
// Body: { passphrase: string }
export const getPassphraseHint = async (req, res) => {
  const { passphrase } = req.body;

  if (!passphrase || passphrase.trim().length < 3) {
    return res.status(400).json({ message: 'passphrase must be at least 3 characters' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    logger.warn('GROQ_API_KEY not set — using rule-based fallback for passphrase hint');
    return res.json(hintFallback(passphrase));
  }

  const prompt = buildHintPrompt(passphrase);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content:
              'You are a creative security hint writer. Given a passphrase, you create a cryptic, memorable, and poetic hint that helps the recipient remember the passphrase WITHOUT revealing it. The hint must NOT contain the actual passphrase or any direct part of it. Respond only with the hint text — no quotes, no explanation.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`Groq API error (passphrase-hint): ${errText}`);
      return res.json(hintFallback(passphrase));
    }

    const data = await response.json();
    const hint = data.choices?.[0]?.message?.content?.trim() || '';

    if (!hint) {
      return res.json(hintFallback(passphrase));
    }

    logger.info(`Passphrase hint generated successfully`);
    return res.json({ hint });
  } catch (error) {
    logger.error(`getPassphraseHint error: ${error.message}`);
    return res.json(hintFallback(passphrase));
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSecurityPrompt(filename, sizeBytes) {
  const sizeMB = sizeBytes ? (sizeBytes / (1024 * 1024)).toFixed(2) : 'unknown';
  return `Analyze this file for an encrypted vault and suggest secure sharing settings.

File name: "${filename}"
File size: ${sizeMB} MB

Respond ONLY with this exact JSON:
{
  "sensitivity": "high" | "medium" | "low",
  "downloadLimit": <integer 1-50>,
  "expiresInMinutes": <one of: 15, 30, 60, 360, 1440, 10080>,
  "reason": "<one concise sentence explaining your choice>"
}

Sensitivity guide:
- high: financial, legal, medical, identity, credentials (tax, passport, contract, salary, bank, ssn, kyc, id, health, medical, confidential, private, secret) → 1 download, 60 min
- low: casual media, memes, entertainment (meme, fun, cat, dog, photo, wallpaper, game, music) → 10 downloads, 10080 min (7 days)
- medium: everything else → 5 downloads, 1440 min (24 hours)`;
}

function buildHintPrompt(passphrase) {
  return `Create a cryptic, poetic, and memorable hint for this passphrase: "${passphrase}"

Rules:
- Do NOT include the passphrase or any of its words directly
- Keep it under 15 words
- Make it feel like a riddle or poem
- It should jog the memory of someone who already knows the passphrase`;
}

function securityFallback(filename, sizeBytes) {
  const name = filename.toLowerCase();
  const highKW = ['tax', 'passport', 'id', 'ssn', 'secret', 'confidential', 'contract',
    'legal', 'salary', 'medical', 'health', 'bank', 'credential', 'password',
    'private', 'personal', 'invoice', 'kyc', 'nda', 'finance', 'statement'];
  const lowKW = ['meme', 'fun', 'cat', 'dog', 'music', 'video', 'photo', 'wallpaper',
    'game', 'funny', 'clip', 'reel', 'selfie', 'pic'];

  let sensitivity = 'medium';
  if (highKW.some((kw) => name.includes(kw))) sensitivity = 'high';
  else if (lowKW.some((kw) => name.includes(kw))) sensitivity = 'low';

  const presets = {
    high:   { downloadLimit: 1,  expiresInMinutes: 60,    reason: 'Sensitive filename detected — strict limits applied.' },
    medium: { downloadLimit: 5,  expiresInMinutes: 1440,  reason: 'Standard file — balanced settings recommended.' },
    low:    { downloadLimit: 10, expiresInMinutes: 10080, reason: 'Non-sensitive media — relaxed limits applied.' },
  };

  return { sensitivity, ...presets[sensitivity], badge: buildSecurityBadge(sensitivity) };
}

function hintFallback(passphrase) {
  const len = passphrase.length;
  const hints = [
    `Where your memory begins, ${len} steps away.`,
    `The key lives in the quiet corner of your mind.`,
    `Something only you would whisper in the dark.`,
    `A secret between you and time.`,
  ];
  return { hint: hints[len % hints.length] };
}

function buildSecurityBadge(sensitivity) {
  const map = {
    high:   '🔴 High Sensitivity',
    medium: '🟡 Medium Sensitivity',
    low:    '🟢 Low Sensitivity',
  };
  return map[sensitivity] || map.medium;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function snapExpiry(minutes) {
  const valid = [15, 30, 60, 360, 1440, 10080];
  return valid.reduce((prev, curr) =>
    Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev
  );
}
