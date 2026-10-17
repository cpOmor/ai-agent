const { sendMessage } = require('../../gemini-service');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // GET: Meta WhatsApp Webhook Verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expectedToken = url.searchParams.get('verify_token') || process.env.WHATSAPP_VERIFY_TOKEN || 'trustone_wa_verify_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('WhatsApp Webhook Verified successfully');
      res.statusCode = 200;
      return res.end(challenge);
    } else {
      res.statusCode = 403;
      return res.end('Verification token mismatch');
    }
  }

  // POST: Handle incoming WhatsApp Cloud API messages
  if (req.method === 'POST') {
    const accessToken = url.searchParams.get('wa_token') || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = url.searchParams.get('wa_phone_id') || process.env.WHATSAPP_PHONE_ID;

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = typeof req.body === 'object' ? req.body : JSON.parse(body || '{}');

        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message && message.type === 'text') {
          const fromNumber = message.from;
          const userText = message.text?.body;

          // Ask Gemini AI
          const aiResponse = await sendMessage([
            { role: 'user', parts: [{ text: userText }] }
          ]);

          // Reply back via WhatsApp Cloud API
          if (accessToken && phoneNumberId) {
            await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: fromNumber,
                type: 'text',
                text: { body: aiResponse.text }
              })
            });
          }
        }

        res.statusCode = 200;
        return res.end('EVENT_RECEIVED');
      } catch (err) {
        console.error('WhatsApp webhook error:', err);
        res.statusCode = 200;
        return res.end('ERROR');
      }
    });
  }
};
