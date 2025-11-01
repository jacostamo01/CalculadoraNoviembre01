// server.js — Logger / CRUD (Ready for Render)
'use strict';

const http = require('http');
const { URL } = require('url');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 3000;

// ====== POOL MySQL por variables de entorno ======
const pool = mysql.createPool({
  host: process.env.DB_HOST,                       
  port: Number(process.env.DB_PORT || '3306'),
  user: process.env.root,                   
  password: process.env.root,                
  database: process.env.backend_ms,                 
  waitForConnections: true,
  connectionLimit: 10,
  ssl: (process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : undefined
});

// ---------- helpers ----------
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-HTTP-Method-Override'
  };
}

function send(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders(),
  });
  if (code === 204) return res.end();
  res.end(JSON.stringify(data));
}

function notFound(res) {
  return send(res, 404, { ok: false, error: 'Ruta no encontrada' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

// ---------- servidor ----------
const server = http.createServer(async (req, res) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...corsHeaders() });
    return res.end();
  }

  // URL
  const u = new URL(req.url, `http://${req.headers.host}`);
  const path = u.pathname;                          // ej: /ops/log/123/delete
  const parts = path.split('/').filter(Boolean);    // ["ops","log","123","delete"]

  try {
    // ====== HEALTHCHECK (Render) ======
    if (path === '/health' && req.method === 'GET') {
      // opcional: ping rápido a la BD para validar conexión
      try { await pool.query('SELECT 1'); } catch { /* ignora si quieres */ }
      return send(res, 200, { ok: true, message: 'Logger activo' });
    }

    // ====== CREATE LOG ======
    if (path === '/ops/log' && req.method === 'POST') {
      try {
        const b = await readBody(req);
        const op = b.op || 'CRUD';
        const source = b.source || 'crud';
        const endpoint = b.endpoint || path;
        const method = b.method || req.method;
        const status = b.status_code ?? 201;
        const ip = req.socket.remoteAddress || null;

        await pool.execute(
          `INSERT INTO operations_log
           (op,num1,num2,result,source,endpoint,method,status_code,client_ip,payload_json)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            op,
            b.num1 ?? null,
            b.num2 ?? null,
            b.result ?? null,
            source,
            endpoint,
            method,
            status,
            ip,
            b.payload ? JSON.stringify(b.payload) : null
          ]
        );

        return send(res, 201, { ok: true, message: 'Log registrado' });
      } catch (err) {
        console.error('Error al registrar log:', err.message);
        return send(res, 400, { ok: false, error: 'JSON inválido o error de BD' });
      }
    }

    // ====== LIST LOGS ======
    if (path === '/ops/log' && req.method === 'GET') {
      const op = u.searchParams.get('op');
      const page = Math.max(1, +(u.searchParams.get('page') || 1));
      const limit = Math.min(200, Math.max(1, +(u.searchParams.get('limit') || 20)));
      const offset = (page - 1) * limit;

      const params = [];
      let where = '';
      if (op) { where = 'WHERE op = ?'; params.push(op); }

      const [rows] = await pool.query(
        `SELECT id,op,num1,num2,result,source,endpoint,method,status_code,client_ip,created_at,payload_json
         FROM operations_log ${where}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return send(res, 200, { ok: true, data: rows, meta: { page, limit } });
    }

    // ====== GET BY ID ======
    if (parts[0] === 'ops' && parts[1] === 'log' && parts.length === 3 && req.method === 'GET') {
      const id = Number(parts[2]);
      if (!Number.isInteger(id)) return send(res, 400, { ok:false, error:'id inválido' });
      const [rows] = await pool.query(
        `SELECT id,op,num1,num2,result,source,endpoint,method,status_code,client_ip,created_at,payload_json
         FROM operations_log WHERE id=? LIMIT 1`, [id]
      );
      if (!rows.length) return send(res, 404, { ok:false, error:'No encontrado' });
      return send(res, 200, { ok:true, data: rows[0] });
    }

    // ====== DELETE ======
    if (parts[0] === 'ops' && parts[1] === 'log' && parts.length === 3 && req.method === 'DELETE') {
      const id = Number(parts[2]);
      if (!Number.isInteger(id)) return send(res, 400, { ok:false, error:'id inválido' });
      const [r] = await pool.execute(`DELETE FROM operations_log WHERE id=?`, [id]);
      if (r.affectedRows === 0) return send(res, 404, { ok:false, error:'No encontrado' });
      return send(res, 204);
    }

    // ====== DELETE (POST compat) ======
    if (parts[0] === 'ops' && parts[1] === 'log' && parts[3] === 'delete' && req.method === 'POST') {
      const id = Number(parts[2]);
      if (!Number.isInteger(id)) return send(res, 400, { ok:false, error:'id inválido' });
      const [r] = await pool.execute(`DELETE FROM operations_log WHERE id=?`, [id]);
      if (r.affectedRows === 0) return send(res, 404, { ok:false, error:'No encontrado' });
      return send(res, 204);
    }

    // Ping simple (opcional)
    if (path === '/ping') {
      return send(res, 200, { ok: true, message: 'Logger activo' });
    }

    return notFound(res);

  } catch (e) {
    console.error('Error interno:', e);
    return send(res, 500, { ok: false, error: 'Error interno del servidor' });
  }
});

server.on('error', (err) => {
  console.error('Error del servidor logger:', err.code || err.message);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
