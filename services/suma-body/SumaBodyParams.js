'use strict';
const http = require('http');
const { logOperation } = require('./loggerClient');
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const [pathname] = req.url.split('?');

  // === BODY: POST /sumar  (JSON) ===
  if (req.method === 'POST' && pathname === '/sumar') {
    try {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', () => {
        let payload = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }));
        }

        // Acepta num1/num2 o Num1/Num2
        const n1 = Number(payload.num1 ?? payload.Num1);
        const n2 = Number(payload.num2 ?? payload.Num2);

        if (!Number.isFinite(n1) || !Number.isFinite(n2)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Parámetros inválidos (num1/num2)' }));
        }

        const result = n1 + n2;

        // Respuesta JSON para el front
        const body = { ok: true, op: 'SUMA', num1: n1, num2: n2, result };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));

        // Log (no bloqueante)
        try {
          logOperation({ op: 'SUMA', num1: n1, num2: n2, result, req, statusCode: 200, endpoint: '/sumar', source: 'ms' });
        } catch (_) {}
      });
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Error interno', detail: err.message }));
    }
  }


  if (req.method === 'GET' && pathname === '/sumar') {
    const msg = { ok: false, error: 'Usa POST /sumar con JSON: { "num1": 1, "num2": 2 }' };
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(msg));
  }

  //Codigo para que Render verifique que el servicio esté "vivo"
  if (req.method === 'GET' && pathname === '/health') {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  return res.end('OK');
}

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'No encontrado' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Suma (Body) escuchando en http://0.0.0.0:${PORT}/sumar`);
});