const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { sendMessage } = require('./gemini-service');

const PUBLIC_DIR = path.join(__dirname, 'public');

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoint: /api/chat
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const history = payload.history || [];

        if (!history.length) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'History cannot be empty' }));
          return;
        }

        const customKey = req.headers['x-gemini-key'];
        const result = await sendMessage(history, null, customKey);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('API Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API endpoint: /api/knowledge (GET)
  if (req.method === 'GET' && req.url === '/api/knowledge') {
    const kPath = path.join(__dirname, 'knowledge.json');
    try {
      const data = fs.existsSync(kPath) ? fs.readFileSync(kPath, 'utf8') : '{}';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API endpoint: /api/knowledge (POST)
  if (req.method === 'POST' && req.url === '/api/knowledge') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const kPath = path.join(__dirname, 'knowledge.json');
        let current = {};
        if (fs.existsSync(kPath)) {
          current = JSON.parse(fs.readFileSync(kPath, 'utf8'));
        }
        const updated = { ...current, ...payload };
        fs.writeFileSync(kPath, JSON.stringify(updated, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, knowledge: updated }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API endpoint: /api/fetch-doc (POST) to import Google Doc or URL
  if (req.method === 'POST' && req.url === '/api/fetch-doc') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { url } = JSON.parse(body || '{}');
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'URL is required' }));
          return;
        }

        let fetchUrl = url;
        const gDocMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (gDocMatch && gDocMatch[1]) {
          const docId = gDocMatch[1];
          fetchUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        }

        const docRes = await fetch(fetchUrl);
        if (!docRes.ok) {
          throw new Error(`Failed to fetch document (HTTP ${docRes.status}). Make sure the Google Doc is shared as 'Anyone with the link can view'.`);
        }

        const text = await docRes.text();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text, length: text.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static file serving: default to index.html
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallback);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
    } else {
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

function startServer(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is currently busy. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🏥 Trust One Hospital AI Assistant Server is running!`);
    console.log(`👉 Open in browser: http://localhost:${port}`);
    console.log(`======================================================\n`);
  });
}

if (!process.env.VERCEL) {
  startServer(config.PORT);
}

module.exports = server;

