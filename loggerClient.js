// loggerClient.js
'use strict';

const http = require('http');

function logOperation({ op, num1, num2, result, req, statusCode = 200, endpoint, host = '127.0.0.1', port = 4010 }) {
  return new Promise((resolve, reject) => {
    const pathOnly = endpoint || (req?.url?.split('?')[0] || '/');
    const method = req?.method || 'GET';
    const source = method === 'POST' ? 'body' : (req?.url?.includes('?') ? 'query' : 'path');

    const payload = {
      op, num1, num2, result,
      source,
      endpoint: pathOnly,
      method,
      status_code: statusCode,
      payload: {
        query: req?.url?.split('?')[1] || null,
        headers: req?.headers || {}
      }
    };

    const body = JSON.stringify(payload);
    const options = {
      hostname: host,
      port,
      path: '/ops/log',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const request = http.request(options, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve();
        console.error('[logOperation] respuesta inesperada:', res.statusCode, buf);
        reject(new Error('HTTP ' + res.statusCode));
      });
    });

    request.on('error', (err) => {
      console.error('[logOperation] no enviado:', err.code || err.message);
      reject(err);
    });

    request.write(body);
    request.end();
  }).catch(() => {}); // no detiene el microservicio
}

module.exports = { logOperation };
