'use strict';

const http = require('http');
const { logOperation } = require('./loggerClient'); // archivo de acceso a la BD
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

  // Esperado: GET /dividir/{Num1}/{Num2}
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Método no permitido' }));
  }

  const parts = cleanPath.split('/').filter(Boolean); // p.ej. ["dividir","9","3"]
  if (parts[0] !== 'dividir' || parts.length !== 3) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Ruta inválida. Use /dividir/{Num1}/{Num2}' }));
  }

  const n1 = Number(parts[1]);
  const n2 = Number(parts[2]);

  // Validaciones de números
  if (!Number.isFinite(n1) || !Number.isFinite(n2)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Parámetros no numéricos' }));
  }

  // Evitar división por cero
  if (n2 === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'División por cero no permitida' }));
  }

  const resultado = n1 / n2;

  // Respuesta al cliente
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, Dato1Enviado: n1, Dato2Enviado: n2, resultado }));

  // Log en BD (no bloquea; si falla no tumba el servicio)
  Promise.resolve(
    logOperation({ op: 'DIV', num1: n1, num2: n2, result: resultado, req, statusCode: 200 })
  ).catch((e) => {
    // opcional: deja traza para depurar el microservicio de logs
    console.error('[DIV] logOperation error:', e && (e.sqlMessage || e.message || e));
  });
});

server.on('error', (err) => {
  // Si ves EADDRINUSE, el puerto está ocupado
  console.error('[DivisionPathParams] server error:', err.code || err.message);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DIVISION (path) escuchando en http://127.0.0.1:${PORT}/dividir`);
});
