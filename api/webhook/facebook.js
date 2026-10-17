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

  // GET: Meta Webhook Verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expectedToken = url.searchParams.get('verify_token') || process.env.FB_VERIFY_TOKEN || 'trustone_verify_token_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('Facebook Webhook Verified successfully');
      res.statusCode = 200;
      return res.end(challenge);
    } else {
      res.statusCode = 403;
      return res.end('Verification token mismatch');
    }
  }

  // POST: Handle incoming Messenger messages
  if (req.method === 'POST') {
    const pageAccessToken = url.searchParams.get('page_token') || process.env.FB_PAGE_ACCESS_TOKEN;

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = typeof req.body === 'object' ? req.body : JSON.parse(body || '{}');

        if (data.object === 'page') {
          for (const entry of data.entry || []) {
            const webhookEvent = entry.messaging?.[0];
            if (webhookEvent && webhookEvent.message && webhookEvent.message.text) {
              const senderPsid = webhookEvent.sender.id;
              const userText = webhookEvent.message.text;

              // Generate AI reply
              const aiResponse = await sendMessage([
                { role: 'user', parts: [{ text: userText }] }
              ]);

              // Send response back via Meta Graph API
              if (pageAccessToken) {
                await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    recipient: { id: senderPsid },
                    message: { text: aiResponse.text }
                  })
                });
              }
            }
          }
          res.statusCode = 200;
          return res.end('EVENT_RECEIVED');
        } else {
          res.statusCode = 404;
          return res.end('Not Found');
        }
      } catch (err) {
        console.error('Facebook webhook error:', err);
        res.statusCode = 200;
        return res.end('ERROR');
      }
    });
  }
};
