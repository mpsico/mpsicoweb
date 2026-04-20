// api/test-calendar.js — Test endpoint for Google Calendar integration
// DELETE THIS FILE after verifying calendar works!
// Access: https://your-vercel-url.vercel.app/api/test-calendar

export default async function handler(req, res) {
  const results = { 
    env: {
      has_resend_key: !!process.env.RESEND_API_KEY,
      has_gcal_key: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      has_gcal_id: !!process.env.GOOGLE_CALENDAR_ID,
      email_from: process.env.EMAIL_FROM || '(not set — using sandbox)',
    },
    calendar: null,
    email: null
  };

  // Test Google Calendar
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const token = await getGoogleToken();
      if (token) {
        const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'maritagpsicologa@gmail.com');
        // Try to list next event to verify access
        const r = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?maxResults=1&orderBy=startTime&singleEvents=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await r.json();
        if (r.ok) {
          results.calendar = { ok: true, nextEvent: data.items?.[0]?.summary || '(no events)' };
        } else {
          results.calendar = { ok: false, error: data.error?.message };
        }
      } else {
        results.calendar = { ok: false, error: 'Could not get token' };
      }
    } catch (err) {
      results.calendar = { ok: false, error: err.message };
    }
  } else {
    results.calendar = { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_KEY not set' };
  }

  // Test Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: 'maritagpsicologa@gmail.com',
          subject: '✓ Test email desde la web de Marita',
          html: '<h1>¡Todo funciona!</h1><p>Este email de prueba confirma que Resend está configurado correctamente.</p>'
        })
      });
      const data = await r.json();
      results.email = r.ok ? { ok: true, id: data.id } : { ok: false, error: data.message || JSON.stringify(data) };
    } catch (err) {
      results.email = { ok: false, error: err.message };
    }
  }

  return res.status(200).json(results);
}

async function getGoogleToken() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) return null;
  let sa;
  try { sa = JSON.parse(key); } catch { return null; }
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now };
  const header  = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const payload = btoa(JSON.stringify(claim)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const msg = `${header}.${payload}`;
  const pemKey = sa.private_key.replace(/\\n/g, '\n');
  const b64 = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const cryptoKey = await crypto.subtle.importKey('pkcs8', bytes.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(msg));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt = `${msg}.${sigB64}`;
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const tokenData = await tokenResp.json();
  return tokenData.access_token || null;
}