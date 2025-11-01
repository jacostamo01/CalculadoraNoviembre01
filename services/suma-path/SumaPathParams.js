// SumaPathParams.js  (CommonJS)
'use strict';

const http = require('http');
const { logOperation } = require('./loggerClient'); // asegúrate de que exista este archivo
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // ---- CORS para Swagger/Web ----
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Normaliza el path (quita query y trailing slash)
  const urlStr = req.url || '/';
  const [pathname] = urlStr.split('?');
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // Esperado: GET /sumar/{Num1}/{Num2}
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Método no permitido' }));
  }

    //Codigo para que Render verifique que el servicio esté "vivo"
  if (req.method === 'GET' && pathname === '/health') {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  return res.end('OK');
}

  const parts = cleanPath.split('/').filter(Boolean); // p.ej. ["sumar","10","3"]
  if (parts[0] !== 'sumar' || parts.length !== 3) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Ruta inválida. Use /sumar/{Num1}/{Num2}' }));
  }

  const n1 = Number(parts[1]);
  const n2 = Number(parts[2]);
  if (!Number.isFinite(n1) || !Number.isFinite(n2)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Parámetros no numéricos' }));
    // No logueamos errores 4xx para mantener simple; puedes añadirlo si quieres.
  }

  const resultado = n1 + n2;

  // Respuesta al cliente
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, Dato1Enviado: n1, Dato2Enviado: n2, resultado }));

  // Log en BD (no bloquea; si falla no tumba el servicio)
  Promise.resolve(
    logOperation({ op: 'SUMA', num1: n1, num2: n2, result: resultado, req, statusCode: 200 })
  ).catch(() => {});
});

server.on('error', (err) => {
  // Si ves EADDRINUSE, el puerto está ocupado
  console.error('[SumaPathParams] server error:', err.code || err.message);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Suma (Path) escuchando en http://0.0.0.0:${PORT}/sumar`);
});
