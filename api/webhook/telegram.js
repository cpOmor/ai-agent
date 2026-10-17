const { sendMessage } = require('../../gemini-service');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // GET: Health check & Webhook setting helper
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || process.env.TELEGRAM_BOT_TOKEN;
    const action = url.searchParams.get('action');

    if (action === 'set' && token) {
      const webhookUrl = `${url.origin}/api/webhook/telegram?token=${encodeURIComponent(token)}`;
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
        const data = await tgRes.json();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: true, result: data, webhookUrl }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'active',
      channel: 'Telegram Bot Webhook',
      webhookUrl: `${url.origin}/api/webhook/telegram`
    }));
  }

  // POST: Handle incoming Telegram updates
  if (req.method === 'POST') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || process.env.TELEGRAM_BOT_TOKEN;

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const update = typeof req.body === 'object' ? req.body : JSON.parse(body || '{}');
        const message = update.message || update.edited_message;

        if (!message || !message.text) {
          res.statusCode = 200;
          return res.end('OK (No text message)');
        }

        const chatId = message.chat.id;
        const userText = message.text;

        // If it's the /start command
        let replyText = '';
        if (userText === '/start') {
          replyText = '🏥 স্বাগতম ট্রাস্ট ওয়ান হসপিটাল এআই হেল্পডেস্কে! আমি আপনাকে হাসপাতালের ডাক্তারদের তালিকা, সময়সূচি এবং সিরিয়াল বুকিং সংক্রান্ত তথ্য দিয়ে সাহায্য করতে পারি। আপনার প্রশ্নটি লিখুন।\n\nহটলাইন ও সিরিয়াল: +8801895613801';
        } else {
          // Ask Gemini AI
          const aiResponse = await sendMessage([
            { role: 'user', parts: [{ text: userText }] }
          ]);
          replyText = aiResponse.text;
        }

        // Send reply to Telegram
        if (token) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: replyText
            })
          });
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error('Telegram webhook error:', err);
        res.statusCode = 200; // Always return 200 to Telegram so it doesn't retry infinitely
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
  }
};
