const http = require('http');
const { logOperation } = require('./loggerClient');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Solo aceptar GET en /sumar
  const [path, queryString] = req.url.split('?');
  if (req.method !== 'GET' || path !== '/sumar') {
    res.writeHead(404);
    return res.end(JSON.stringify({ ok: false, error: 'Ruta o método no válido' }));
  }

  // Leer los parámetros de la URL
  const params = new URLSearchParams(queryString);
  const n1 = Number(params.get('num1'));
  const n2 = Number(params.get('num2'));

  // Validar los parámetros
  if (!Number.isFinite(n1) || !Number.isFinite(n2)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'num1 y num2 deben ser numéricos' }));
  }

  const resultado = n1 + n2;

  // Responder al cliente
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    ok: true,
    Dato1Enviado: n1,
    Dato2Enviado: n2,
    resultado
  }));

  // Registrar la operación
  logOperation({
    op: 'SUMA',
    num1: n1,
    num2: n2,
    result: resultado,
    req,
    statusCode: 200
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Suma (Query) escuchando en http://127.0.0.1:${PORT}/sumar`);
});

