// Mock upload server for the Field Capture app.
// Env: PORT (default 4000), FAIL_RATE 0..1 (default 0.3), LATENCY_MS (default 800).
import express from 'express';
import multer from 'multer';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 4000);
const FAIL_RATE = Number(process.env.FAIL_RATE ?? 0.3);
const LATENCY_MS = Number(process.env.LATENCY_MS ?? 800);
const UPLOAD_DIR = fileURLToPath(new URL('./uploads/', import.meta.url));

const app = express();
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 50 * 1024 * 1024 } });

/** Idempotency key -> stored upload. In memory, so it resets when the server restarts. */
const uploadsByKey = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const key = req.get('Idempotency-Key') ?? '-';
    const note = res.locals.note ? ` (${res.locals.note})` : '';
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} key=${key} -> ${res.statusCode} in ${Date.now() - startedAt}ms${note}`,
    );
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/uploads', (_req, res) => {
  res.json([...uploadsByKey.values()]);
});

app.post('/uploads', upload.single('file'), async (req, res) => {
  await sleep(LATENCY_MS);

  const key = req.get('Idempotency-Key');
  const discardFile = () => (req.file ? rm(req.file.path, { force: true }) : Promise.resolve());

  if (!key || !req.file) {
    await discardFile();
    res.status(400).json({ error: 'Idempotency-Key header and a "file" field are required' });
    return;
  }

  const existing = uploadsByKey.get(key);
  if (existing) {
    await discardFile();
    res.locals.note = 'duplicate, already stored';
    res.status(200).json({ ...existing, duplicate: true });
    return;
  }

  if (Math.random() < FAIL_RATE) {
    // Half of the simulated failures happen after the file was stored, like a response
    // lost on the way back. The client's retry then exercises the duplicate path above.
    const storedBeforeFailing = Math.random() < 0.5;
    if (storedBeforeFailing) {
      uploadsByKey.set(key, toRecord(key, req));
    } else {
      await discardFile();
    }
    res.locals.note = storedBeforeFailing ? 'simulated failure after storing' : 'simulated failure';
    res.status(500).json({ error: 'Simulated server error' });
    return;
  }

  const record = toRecord(key, req);
  uploadsByKey.set(key, record);
  res.locals.note = `stored ${record.type} ${record.size} bytes`;
  res.status(201).json(record);
});

function toRecord(key, req) {
  return {
    id: key,
    type: req.body.type,
    createdAt: Number(req.body.createdAt),
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storedAs: req.file.filename,
    receivedAt: new Date().toISOString(),
  };
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock upload server on http://0.0.0.0:${PORT} (FAIL_RATE=${FAIL_RATE}, LATENCY_MS=${LATENCY_MS})`);
});
