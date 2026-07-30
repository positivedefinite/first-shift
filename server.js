import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent((reqPath || '/').split('?')[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

function send(res, status, body, type, extra = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body ?? '');
  // Content-Length required — WhatsApp OG crawler chokes on chunked bodies
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Content-Length': buf.length,
    'Cache-Control':
      status === 200 && type?.includes('html')
        ? 'no-cache'
        : 'public, max-age=86400',
    ...extra,
  });
  res.end(buf);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const extra = {};
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
      extra['Cache-Control'] = 'public, max-age=604800';
      extra['Accept-Ranges'] = 'bytes';
    }
    send(res, 200, data, type, extra);
  });
}

const server = http.createServer((req, res) => {
  const raw = req.url || '/';
  const urlPath = raw.split('?')[0] === '/' ? '/index.html' : raw;
  let filePath = safeJoin(DIST, urlPath);

  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!err && (stat.isFile() || fs.existsSync(filePath))) {
      sendFile(res, filePath);
      return;
    }
    // Missing hashed asset → 404. Unknown route → index (map deep links).
    const ext = path.extname(filePath);
    if (ext && ext !== '.html') {
      send(res, 404, 'Not found');
      return;
    }
    sendFile(res, path.join(DIST, 'index.html'));
  });
});

server.listen(PORT, () => {
  console.log(`FIRST SHIFT listening on ${PORT}`);
});
