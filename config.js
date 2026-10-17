const fs = require('fs');
const path = require('path');

// Auto-load .env file if it exists locally
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const k = trimmed.substring(0, eqIdx).trim();
          const v = trimmed.substring(eqIdx + 1).trim();
          if (k && !process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  } catch (err) {
    console.error('Warning: Could not read .env file', err.message);
  }
}

// Gemini API Configuration
module.exports = {
  API_KEY: process.env.GEMINI_API_KEY || '',
  PORT: process.env.PORT || 3000,
  // Models to try in order (if one is busy/rate-limited, automatically falls back to next)
  MODELS: [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash'
  ],
  SYSTEM_INSTRUCTION: 'You are a friendly, witty, and helpful AI chat companion. You understand English, Bengali (বাংলা), and Banglish fluently. Reply naturally, warmly, and concisely in the same language or tone the user uses. Be conversational and human-like.'
};
