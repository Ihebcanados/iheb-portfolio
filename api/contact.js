/**
 * Contact form endpoint — Vercel Serverless Function (Node.js 18+).
 *
 * Sends the message to your inbox through Resend (https://resend.com).
 * Required environment variables (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY      API key from resend.com
 * Optional:
 *   CONTACT_TO_EMAIL    where messages are delivered (default: iheb6410@gmail.com)
 *   CONTACT_FROM_EMAIL  verified sender, e.g. "Portfolio <hello@yourdomain.com>"
 *                       (default: Resend's test sender, which can only deliver to the
 *                        address that owns the Resend account)
 *
 * If RESEND_API_KEY is missing the endpoint answers 503 and the page offers the
 * visitor a pre-filled email instead. It never reports success unless Resend accepted
 * the message.
 */

const MAX = { name: 100, email: 200, subject: 150, message: 5000 };
const MIN_FILL_MS = 3000; // humans take longer than 3 s to fill the form
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // best-effort, per warm instance

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > 20000) throw new Error('too_large');
    chunks.push(buf);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (s) => s.replace(/[\r\n]+/g, ' ').trim();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_PER_WINDOW;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Use POST.' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'The message could not be read. Please try again.' });
  }

  // Spam traps: hidden field must be empty, and the form must not be submitted instantly.
  const startedAt = Number(body.startedAt || 0);
  if (body.website || (startedAt && Date.now() - startedAt < MIN_FILL_MS)) {
    return json(res, 400, { ok: false, error: 'The message looked automated and was not sent. If you are a person, wait a moment and try again.' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return json(res, 429, { ok: false, error: 'Too many messages. Try again later.' });

  const data = {};
  for (const key of Object.keys(MAX)) {
    const value = typeof body[key] === 'string' ? body[key].trim() : '';
    if (!value) return json(res, 400, { ok: false, error: `The ${key} field is required.` });
    if (value.length > MAX[key]) return json(res, 400, { ok: false, error: `The ${key} field is too long.` });
    data[key] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
    return json(res, 400, { ok: false, error: 'Enter a valid email address.' });
  }
  if (data.message.length < 10) {
    return json(res, 400, { ok: false, error: 'The message is too short.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json(res, 503, { ok: false, code: 'not_configured', error: 'Email delivery is not configured.' });
  }

  const to = process.env.CONTACT_TO_EMAIL || 'iheb6410@gmail.com';
  const from = process.env.CONTACT_FROM_EMAIL || 'Portfolio <onboarding@resend.dev>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject: `Portfolio: ${oneLine(data.subject)}`,
        text: `From: ${oneLine(data.name)} <${data.email}>\n\n${data.message}`,
        html: `<p><strong>From:</strong> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`,
      }),
    });
    if (!r.ok) {
      console.error('Resend rejected the message', r.status, await r.text().catch(() => ''));
      return json(res, 502, { ok: false, error: 'The email service rejected the message.' });
    }
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('Resend request failed', err);
    return json(res, 502, { ok: false, error: 'The email service could not be reached.' });
  }
};
