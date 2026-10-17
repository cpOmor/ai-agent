const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const kPath = path.join(process.cwd(), 'knowledge.json');

  if (req.method === 'GET') {
    try {
      const data = fs.existsSync(kPath) ? fs.readFileSync(kPath, 'utf8') : '{}';
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(data);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = typeof req.body === 'object' ? req.body : JSON.parse(body || '{}');
        let current = {};
        if (fs.existsSync(kPath)) {
          current = JSON.parse(fs.readFileSync(kPath, 'utf8'));
        }
        const updated = { ...current, ...payload };
        try {
          fs.writeFileSync(kPath, JSON.stringify(updated, null, 2), 'utf8');
        } catch(wErr) {
          // On Vercel read-only filesystem, return current updated memory
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: true, knowledge: updated }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
  }
};
