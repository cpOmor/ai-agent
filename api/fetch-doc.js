module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const handle = async (payload) => {
    try {
      const { url } = payload;
      if (!url) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'URL is required' }));
      }

      let fetchUrl = url;
      const gDocMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (gDocMatch && gDocMatch[1]) {
        fetchUrl = `https://docs.google.com/document/d/${gDocMatch[1]}/export?format=txt`;
      }

      const docRes = await fetch(fetchUrl);
      if (!docRes.ok) {
        throw new Error(`Failed to fetch document (HTTP ${docRes.status}). Ensure document is public.`);
      }

      const text = await docRes.text();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ text, length: text.length }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: err.message }));
    }
  };

  if (req.body && typeof req.body === 'object') {
    return handle(req.body);
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const payload = JSON.parse(body || '{}');
      handle(payload);
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    }
  });
};
