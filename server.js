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
  '.txt': 'text/plain; charset=utf-8',
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

function parseRange(header, size) {
  if (!header || !header.startsWith('bytes=')) return null;
  const [startStr, endStr] = header.slice(6).split('-');
  let start = startStr === '' ? NaN : Number(startStr);
  let end = endStr === '' ? NaN : Number(endStr);
  if (Number.isNaN(start)) {
    // suffix: bytes=-N
    if (Number.isNaN(end)) return null;
    start = Math.max(0, size - end);
    end = size - 1;
  } else {
    if (Number.isNaN(end) || end >= size) end = size - 1;
  }
  if (start < 0 || start >= size || end < start) return null;
  return { start, end };
}

function send(res, status, body, type, extra = {}, method = 'GET') {
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
  if (method === 'HEAD') {
    res.end();
    return;
  }
  res.end(buf);
}

function sendFile(res, filePath, req) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found', undefined, {}, req.method);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp';
    const extra = {};
    if (isImage) {
      extra['Cache-Control'] = 'public, max-age=604800, immutable';
      extra['Accept-Ranges'] = 'bytes';
    }

    const range = isImage ? parseRange(req.headers.range, data.length) : null;
    if (range) {
      const slice = data.subarray(range.start, range.end + 1);
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': slice.length,
        'Content-Range': `bytes ${range.start}-${range.end}/${data.length}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': extra['Cache-Control'],
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(slice);
      return;
    }

    send(res, 200, data, type, extra, req.method);
  });
}

const server = http.createServer((req, res) => {
  const raw = req.url || '/';
  const pathname = raw.split('?')[0] || '/';
  const urlPath = pathname === '/' ? '/index.html' : pathname;
  let filePath = safeJoin(DIST, urlPath);

  if (!filePath) {
    send(res, 403, 'Forbidden', undefined, {}, req.method);
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!err && (stat.isFile() || fs.existsSync(filePath))) {
      sendFile(res, filePath, req);
      return;
    }
    // Missing hashed asset → 404. Unknown route → index (map deep links).
    const ext = path.extname(filePath);
    if (ext && ext !== '.html') {
      send(res, 404, 'Not found', undefined, {}, req.method);
      return;
    }
    sendFile(res, path.join(DIST, 'index.html'), req);
  });
});

server.listen(PORT, () => {
  console.log(`FIRST SHIFT listening on ${PORT}`);
});
