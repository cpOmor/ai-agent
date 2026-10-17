const fs = require('fs');
const path = require('path');

const CHANNELS_FILE = path.join(process.cwd(), 'channels.json');

function getChannels() {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      return JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    whatsapp: {
      enabled: true,
      phoneNumber: '+8801895613801',
      verifyToken: 'trustone_wa_verify_2026'
    },
    facebook: {
      enabled: false,
      pageId: '',
      verifyToken: 'trustone_verify_token_2026'
    },
    telegram: {
      enabled: false,
      botUsername: '',
      botToken: ''
    }
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method === 'GET') {
    const data = getChannels();
    // Mask sensitive tokens for safe client display
    const safeData = {
      whatsapp: {
        ...data.whatsapp,
        accessToken: data.whatsapp?.accessToken ? '••••••••' : ''
      },
      facebook: {
        ...data.facebook,
        pageAccessToken: data.facebook?.pageAccessToken ? '••••••••' : ''
      },
      telegram: {
        ...data.telegram,
        botToken: data.telegram?.botToken ? '••••••••' : ''
      }
    };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(safeData));
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = typeof req.body === 'object' ? req.body : JSON.parse(body || '{}');
        const current = getChannels();
        const updated = {
          ...current,
          whatsapp: { ...current.whatsapp, ...payload.whatsapp },
          facebook: { ...current.facebook, ...payload.facebook },
          telegram: { ...current.telegram, ...payload.telegram }
        };

        try {
          fs.writeFileSync(CHANNELS_FILE, JSON.stringify(updated, null, 2), 'utf8');
        } catch(wErr) {
          // Vercel read-only filesystem fallback
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: true, channels: updated }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
  }
};
