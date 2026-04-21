// ============================================================
// api/send-email.js — Vercel Serverless Function
// Emails: Resend · Calendario: Google Calendar API
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'Missing RESEND_API_KEY' });

  const { type, data } = req.body;
  if (!type || !data) return res.status(400).json({ error: 'Missing type or data' });

  try {
    const emails = buildEmails(type, data);
    const results = await Promise.all(emails.map(e => sendEmail(RESEND_KEY, e)));

    // Google Calendar — errors are non-fatal, don't block email delivery
    if (type === 'booking_confirm') {
      addToGoogleCalendar(data).catch(err => console.error('GCal add error:', err.message));
    } else if (type === 'booking_reschedule') {
      updateGoogleCalendarEvent(data).catch(err => console.error('GCal update error:', err.message));
    } else if (type === 'booking_cancel') {
      deleteGoogleCalendarEvent(data).catch(err => console.error('GCal delete error:', err.message));
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('Handler error:', err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Resend ───────────────────────────────────────────────────────────────────
async function sendEmail(apiKey, { to, subject, html }) {
  // Until maritagalafate.com is verified in Resend, use their sandbox sender
  // Once domain verified: set EMAIL_FROM env var to "Marita Galafate · Psicóloga <citas@maritagalafate.com>"
  const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  
  // When using sandbox sender, Resend only allows sending to the account owner's email
  // So redirect all emails to admin until domain is verified
  const ADMIN_EMAIL = 'maritagpsicologa@gmail.com';
  const isVerified  = !!process.env.EMAIL_FROM; // assumes EMAIL_FROM is only set when domain is verified
  const actualTo    = isVerified ? to : ADMIN_EMAIL;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: actualTo, subject, html })
  });
  if (!resp.ok) {
    const e = await resp.json();
    throw new Error(`Resend error: ${JSON.stringify(e)}`);
  }
  return resp.json();
}

// ─── Google Calendar ──────────────────────────────────────────────────────────
async function getGoogleToken() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) return null;

  let sa;
  try { sa = JSON.parse(key); } catch { return null; }

  const now   = Math.floor(Date.now() / 1000);
  const claim = { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now };

  // Build JWT (using Web Crypto API available in Vercel Edge/Node)
  const header  = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const payload = btoa(JSON.stringify(claim)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const msg     = `${header}.${payload}`;

  // Sign with RSA-SHA256
  const pemKey = sa.private_key.replace(/\\n/g, '\n');
  const keyDer = pemToDer(pemKey);
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
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

function pemToDer(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function buildCalEvent(d) {
  // d.rawDate = 'YYYY-MM-DD', d.time = 'HH:MM'
  const dateStr = d.rawDate || d.date;
  const time    = d.time || '09:00';

  // Validate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.error('buildCalEvent: invalid date format:', dateStr);
    return null;
  }

  // Build dateTime string directly in Madrid local time
  // Google Calendar API accepts "YYYY-MM-DDTHH:MM:SS" with a separate timeZone field
  // This avoids all UTC conversion issues on the server
  const [hh, mm] = time.split(':');
  const startLocal = `${dateStr}T${hh.padStart(2,'0')}:${mm.padStart(2,'0')}:00`;
  const endH = String(parseInt(hh) + 1).padStart(2, '0');
  const endLocal = `${dateStr}T${endH}:${mm.padStart(2,'0')}:00`;

  return {
    summary: `${d.modality === 'online' ? '🌐' : '📍'} ${d.clientName} — Consulta psicológica`,
    description: [
      `Paciente: ${d.clientName}`,
      `Email: ${d.clientEmail}`,
      `Teléfono: ${d.clientPhone || 'No indicado'}`,
      `Modalidad: ${d.modality === 'online' ? 'Online (Zoom/Skype)' : 'Presencial – Jerez de la Frontera'}`,
      d.reason ? `Motivo: ${d.reason}` : '',
      `ID reserva: ${d.bookingId}`,
    ].filter(Boolean).join('\n'),
    start: { dateTime: startLocal, timeZone: 'Europe/Madrid' },
    end:   { dateTime: endLocal,   timeZone: 'Europe/Madrid' },
    location: d.modality === 'presencial'
      ? 'Av. Alcalde Álvaro Domecq 18, 2ºA, Jerez de la Frontera'
      : 'Online (Zoom/Skype)',
    reminders: {
      useDefault: false,
      overrides: [{ method: 'email', minutes: 1440 }, { method: 'popup', minutes: 30 }]
    },
    extendedProperties: { private: { bookingId: String(d.bookingId) } }
  };
}

async function addToGoogleCalendar(d) {
  const token = await getGoogleToken();
  if (!token) return;
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'maritagpsicologa@gmail.com');
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events?sendUpdates=none`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildCalEvent(d))
  });
}

async function updateGoogleCalendarEvent(d) {
  const token = await getGoogleToken();
  if (!token) return;
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'maritagpsicologa@gmail.com');
  // Find existing event by bookingId
  const listResp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?privateExtendedProperty=bookingId%3D${d.bookingId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const list = await listResp.json();
  const existing = list.items?.[0];
  if (!existing) { await addToGoogleCalendar({ ...d, date: d.newDate, time: d.newTime }); return; }
  const updated = buildCalEvent({ ...d, date: d.newDate, time: d.newTime });
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${existing.id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  });
}

async function deleteGoogleCalendarEvent(d) {
  const token = await getGoogleToken();
  if (!token) return;
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'maritagpsicologa@gmail.com');
  const listResp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?privateExtendedProperty=bookingId%3D${d.bookingId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const list = await listResp.json();
  const existing = list.items?.[0];
  if (!existing) return;
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${existing.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

// ─── Email builder ────────────────────────────────────────────────────────────
function buildEmails(type, d) {
  switch (type) {
    case 'booking_confirm':    return [emailClientConfirm(d),    emailAdminNewBooking(d)];
    case 'booking_cancel':     return [emailClientCancel(d),     emailAdminCancel(d)];
    case 'booking_reschedule': return [emailClientReschedule(d), emailAdminReschedule(d)];
    case 'contact':            return [emailAdminContact(d),     emailClientContactAck(d)];
    case 'admin_otp':          return [emailAdminOtp(d)];
    default: throw new Error(`Unknown email type: ${type}`);
  }
}

// ─── Unified responsive email template ───────────────────────────────────────
const LOGO_SVG = `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 2px">
  <tr>
    <td style="vertical-align:middle;padding-right:10px">
      <!-- MG monogram SVG -->
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 48 48" fill="none">
        <path d="M6 38 L6 10 L17 26 L28 10 L28 38" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M44 16 C39 11 32 12 32 24 C32 36 39 36 44 32 L44 24 L38 24" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </td>
    <td style="vertical-align:middle">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;letter-spacing:2px;color:rgba(255,255,255,0.92);line-height:1.1">MARITA GALAFATE</div>
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:8px;letter-spacing:3px;color:rgba(255,255,255,0.5);margin-top:2px">PSICÓLOGA SANITARIA</div>
    </td>
  </tr>
</table>`;

function wrap({ title, subtitle, body, accentColor = '#0F6E56', icon = '' }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title}</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @media only screen and (max-width: 600px) {
    .email-wrap { width: 100% !important; }
    .email-body { padding: 24px 20px !important; }
    .email-header { padding: 28px 20px !important; }
    .info-table td { display: block !important; width: 100% !important; }
    .info-label { padding-bottom: 2px !important; }
    .info-value { padding-top: 0 !important; padding-bottom: 10px !important; }
    .btn-table { width: 100% !important; }
    .btn-cell { display: block !important; width: 100% !important; padding: 6px 0 !important; }
    .btn-link { display: block !important; text-align: center !important; width: 100% !important; box-sizing: border-box !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eef0eb;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0eb;padding:32px 16px">
  <tr>
    <td align="center">
      <!-- Card -->
      <table class="email-wrap" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);max-width:560px">

        <!-- Header -->
        <tr>
          <td class="email-header" style="background:linear-gradient(135deg,#04342C 0%,${accentColor} 100%);padding:32px 40px;text-align:center">
            ${LOGO_SVG}
            ${icon ? `<div style="font-size:32px;margin:18px 0 10px">${icon}</div>` : '<div style="margin-top:20px"></div>'}
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:500;letter-spacing:-0.3px;line-height:1.25;font-family:Georgia,'Times New Roman',serif">${title}</h1>
            ${subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif">${subtitle}</p>` : ''}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="email-body" style="padding:36px 40px">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8faf7;border-top:1px solid #eaede8;padding:24px 40px;text-align:center">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#444;letter-spacing:0.3px">Marita Galafate Domínguez</p>
            <p style="margin:0 0 12px;font-size:12px;color:#999;line-height:1.7">
              Psicóloga General Sanitaria · Jerez de la Frontera<br>
              Av. Alcalde Álvaro Domecq 18, 2ºA · 11405 Cádiz
            </p>
            <p style="margin:0;font-size:12px;color:#bbb">
              <a href="tel:+34697911679" style="color:#0F6E56;text-decoration:none">+34 697 911 679</a>
              &nbsp;·&nbsp;
              <a href="mailto:maritagpsicologa@gmail.com" style="color:#0F6E56;text-decoration:none">maritagpsicologa@gmail.com</a>
              &nbsp;·&nbsp;
              <a href="https://maritagalafate.com" style="color:#0F6E56;text-decoration:none">maritagalafate.com</a>
            </p>
            <p style="margin:14px 0 0;font-size:11px;color:#ccc">© 2026 Marita Galafate Domínguez. Todos los derechos reservados.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Shared components ────────────────────────────────────────────────────────
function infoBox(rows) {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td class="info-label" style="padding:11px 20px;font-size:13px;color:#888;font-weight:400;white-space:nowrap;border-bottom:1px solid #eef0eb;width:40%">${label}</td>
      <td class="info-value" style="padding:11px 20px;font-size:13px;color:#1a1a1a;font-weight:500;border-bottom:1px solid #eef0eb;text-align:right">${value}</td>
    </tr>`).join('');
  return `<table class="info-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8faf7;border:1px solid #dceede;border-radius:10px;overflow:hidden;margin:20px 0">
    ${rowsHtml}
  </table>`;
}

function badge(text, type = 'green') {
  const colors = { green: ['#E1F5EE','#085041','#9FE1CB'], yellow: ['#fef9c3','#78350f','#fde68a'], red: ['#fee2e2','#991b1b','#fecaca'] };
  const [bg, fg, border] = colors[type] || colors.green;
  return `<div style="display:inline-block;background:${bg};color:${fg};border:1px solid ${border};font-size:12px;font-weight:500;padding:5px 14px;border-radius:100px;margin-bottom:18px;font-family:'Helvetica Neue',Arial,sans-serif">${text}</div>`;
}

function btn(text, url, style = 'solid') {
  if (style === 'outline') {
    return `<a class="btn-link" href="${url}" style="display:inline-block;margin:4px 8px 4px 0;padding:12px 24px;background:#ffffff;color:#0F6E56;text-decoration:none;border-radius:100px;font-size:13px;font-weight:500;border:2px solid #0F6E56;font-family:'Helvetica Neue',Arial,sans-serif">${text}</a>`;
  }
  return `<a class="btn-link" href="${url}" style="display:inline-block;margin:4px 8px 4px 0;padding:12px 24px;background:#0F6E56;color:#ffffff;text-decoration:none;border-radius:100px;font-size:13px;font-weight:500;border:2px solid #0F6E56;font-family:'Helvetica Neue',Arial,sans-serif">${text}</a>`;
}

function alertBox(text, type = 'green') {
  const colors = { green: ['#E1F5EE','#085041','#9FE1CB'], yellow: ['#fef9c3','#78350f','#fde68a'] };
  const [bg, fg, border] = colors[type] || colors.green;
  return `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:13px;color:${fg};line-height:1.5;font-family:'Helvetica Neue',Arial,sans-serif">${text}</div>`;
}

function p(text) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#444;font-family:'Helvetica Neue',Arial,sans-serif">${text}</p>`;
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function emailClientConfirm(d) {
  const isEs = d.lang !== 'en';
  const body = `
    ${badge(isEs ? '✓ Cita confirmada' : '✓ Session confirmed')}
    ${p(isEs
      ? `Hola <strong style="color:#1a1a1a">${d.clientName}</strong>, tu cita ha quedado registrada correctamente.`
      : `Hello <strong style="color:#1a1a1a">${d.clientName}</strong>, your session has been successfully registered.`
    )}
    ${infoBox([
      [isEs ? 'Fecha' : 'Date', d.date],
      [isEs ? 'Hora' : 'Time', d.time],
      [isEs ? 'Modalidad' : 'Modality', d.modality === 'online' ? 'Online (Zoom / Skype)' : (isEs ? 'Presencial – Jerez de la Frontera' : 'In-person – Jerez de la Frontera')],
      [isEs ? 'Duración' : 'Duration', isEs ? '1 hora' : '1 hour'],
      [isEs ? 'Precio' : 'Price', 'Desde 55 €'],
    ])}
    ${p(isEs
      ? 'Si necesitas cancelar o cambiar la cita, puedes hacerlo desde los botones de abajo hasta 24 horas antes.'
      : 'If you need to cancel or reschedule, use the buttons below up to 24 hours before.'
    )}
    <div style="margin:24px 0 8px">
      ${btn(isEs ? '❌ Cancelar cita' : '❌ Cancel session', d.cancelLink, 'outline')}
      ${btn(isEs ? '🔄 Reprogramar' : '🔄 Reschedule', d.rescheduleLink, 'outline')}
    </div>
    ${p(`<span style="font-size:13px;color:#aaa">${isEs ? 'Preguntas: escríbeme a' : 'Questions: email me at'} <a href="mailto:maritagpsicologa@gmail.com" style="color:#0F6E56">maritagpsicologa@gmail.com</a> ${isEs ? 'o llama al' : 'or call'} <a href="tel:+34697911679" style="color:#0F6E56">+34 697 911 679</a>.</span>`)}
  `;
  return {
    to: d.clientEmail,
    subject: isEs ? `✓ Cita confirmada · ${d.date} a las ${d.time}` : `✓ Session confirmed · ${d.date} at ${d.time}`,
    html: wrap({ title: isEs ? '¡Tu cita está confirmada!' : 'Your session is confirmed!', subtitle: isEs ? 'Marita Galafate · Psicóloga General Sanitaria' : 'Marita Galafate · Clinical Psychologist', body, icon: '📅' })
  };
}

function emailAdminNewBooking(d) {
  const alert = d.isNewPatient
    ? alertBox('<strong>⭐ Paciente nuevo</strong> — Primera reserva desde la web. No tiene historial previo.', 'yellow')
    : alertBox('<strong>↩ Paciente recurrente</strong> — Ya ha reservado anteriormente.', 'green');
  const body = `
    ${alert}
    ${p('Se ha realizado una nueva reserva en la web.')}
    ${infoBox([
      ['Cliente', d.clientName],
      ['Email', d.clientEmail],
      ['Teléfono', d.clientPhone || 'No indicado'],
      ['Fecha', d.date],
      ['Hora', d.time],
      ['Modalidad', d.modality === 'online' ? '🌐 Online' : '📍 Presencial'],
      ['Motivo', d.reason || 'No indicado'],
      ['ID reserva', d.bookingId],
    ])}
    <div style="margin:24px 0 8px">
      ${btn('📋 Abrir panel admin', d.adminLink)}
    </div>
  `;
  return {
    to: 'maritagpsicologa@gmail.com',
    subject: `${d.isNewPatient ? '⭐ Nuevo paciente' : '📅 Nueva cita'}: ${d.clientName} · ${d.date} ${d.time}`,
    html: wrap({ title: 'Nueva reserva recibida', subtitle: `De ${d.clientName}`, body, icon: '📅' })
  };
}

function emailClientCancel(d) {
  const isEs = d.lang !== 'en';
  const body = `
    ${badge(isEs ? '✕ Cita cancelada' : '✕ Session cancelled', 'red')}
    ${p(isEs
      ? `Hola <strong style="color:#1a1a1a">${d.clientName}</strong>, tu cita del <strong>${d.date} a las ${d.time}</strong> ha sido cancelada correctamente.`
      : `Hello <strong style="color:#1a1a1a">${d.clientName}</strong>, your session on <strong>${d.date} at ${d.time}</strong> has been successfully cancelled.`
    )}
    ${p(isEs
      ? 'Si deseas volver a reservar una cita, puedes hacerlo en cualquier momento desde la web.'
      : 'If you wish to book a new session, you can do so at any time from the website.'
    )}
    <div style="margin:24px 0 8px">
      ${btn(isEs ? 'Reservar nueva cita' : 'Book a new session', d.bookingUrl)}
    </div>
  `;
  return {
    to: d.clientEmail,
    subject: isEs ? `Cita cancelada · ${d.date}` : `Session cancelled · ${d.date}`,
    html: wrap({ title: isEs ? 'Cita cancelada' : 'Session cancelled', subtitle: 'Marita Galafate · Psicóloga', body, icon: '❌', accentColor: '#7f1d1d' })
  };
}

function emailAdminCancel(d) {
  const body = `
    ${p(`<strong style="color:#1a1a1a">${d.clientName}</strong> ha cancelado su cita. El slot ha quedado libre automáticamente.`)}
    ${infoBox([
      ['Cliente', d.clientName],
      ['Email', d.clientEmail],
      ['Fecha', d.date],
      ['Hora', d.time],
      ['ID reserva', d.bookingId],
    ])}
    <div style="margin:24px 0 8px">
      ${btn('Ver panel de admin', d.adminLink)}
    </div>
  `;
  return {
    to: 'maritagpsicologa@gmail.com',
    subject: `❌ Cancelación: ${d.clientName} · ${d.date} ${d.time}`,
    html: wrap({ title: 'Cita cancelada', subtitle: `Por ${d.clientName}`, body, icon: '❌', accentColor: '#7f1d1d' })
  };
}

function emailClientReschedule(d) {
  const isEs = d.lang !== 'en';
  const body = `
    ${badge(isEs ? '🔄 Cita reprogramada' : '🔄 Session rescheduled')}
    ${p(isEs
      ? `Hola <strong style="color:#1a1a1a">${d.clientName}</strong>, tu cita ha sido reprogramada correctamente.`
      : `Hello <strong style="color:#1a1a1a">${d.clientName}</strong>, your session has been successfully rescheduled.`
    )}
    ${infoBox([
      [isEs ? 'Fecha anterior' : 'Previous date', `${d.oldDate} · ${d.oldTime}`],
      [isEs ? 'Nueva fecha' : 'New date', d.newDate],
      [isEs ? 'Nueva hora' : 'New time', d.newTime],
      [isEs ? 'Modalidad' : 'Modality', d.modality === 'online' ? 'Online (Zoom / Skype)' : (isEs ? 'Presencial' : 'In-person')],
    ])}
    <div style="margin:24px 0 8px">
      ${btn(isEs ? '❌ Cancelar cita' : '❌ Cancel session', d.cancelLink, 'outline')}
    </div>
  `;
  return {
    to: d.clientEmail,
    subject: isEs ? `🔄 Cita reprogramada · ${d.newDate} ${d.newTime}` : `🔄 Session rescheduled · ${d.newDate} ${d.newTime}`,
    html: wrap({ title: isEs ? 'Cita reprogramada' : 'Session rescheduled', subtitle: 'Marita Galafate · Psicóloga', body, icon: '🔄' })
  };
}

function emailAdminReschedule(d) {
  const body = `
    ${p(`<strong style="color:#1a1a1a">${d.clientName}</strong> ha reprogramado su cita.`)}
    ${infoBox([
      ['Cliente', d.clientName],
      ['Fecha anterior', `${d.oldDate} · ${d.oldTime}`],
      ['Nueva fecha', d.newDate],
      ['Nueva hora', d.newTime],
    ])}
    <div style="margin:24px 0 8px">
      ${btn('Ver panel de admin', d.adminLink)}
    </div>
  `;
  return {
    to: 'maritagpsicologa@gmail.com',
    subject: `🔄 Reprogramación: ${d.clientName} · ${d.newDate} ${d.newTime}`,
    html: wrap({ title: 'Cita reprogramada', subtitle: `Por ${d.clientName}`, body, icon: '🔄' })
  };
}

function emailAdminContact(d) {
  const body = `
    ${p('Has recibido un nuevo mensaje desde el formulario de contacto de tu web.')}
    ${infoBox([['Nombre', d.name], ['Email', d.email]])}
    <div style="background:#f8faf7;border:1px solid #e2e8df;border-radius:10px;padding:16px 20px;margin:0 0 20px">
      <p style="margin:0;font-size:14px;line-height:1.75;color:#333;font-family:'Helvetica Neue',Arial,sans-serif">${d.message}</p>
    </div>
    <div style="margin:24px 0 8px">
      ${btn(`Responder a ${d.name}`, `mailto:${d.email}`)}
    </div>
  `;
  return {
    to: 'maritagpsicologa@gmail.com',
    subject: `💬 Nuevo contacto web: ${d.name}`,
    html: wrap({ title: 'Nuevo mensaje de contacto', subtitle: `De ${d.name}`, body, icon: '💬' })
  };
}

function emailClientContactAck(d) {
  const isEs = d.lang !== 'en';
  const body = `
    ${p(isEs
      ? `Hola <strong style="color:#1a1a1a">${d.name}</strong>, gracias por ponerte en contacto.`
      : `Hello <strong style="color:#1a1a1a">${d.name}</strong>, thank you for getting in touch.`
    )}
    ${p(isEs
      ? 'He recibido tu mensaje y te responderé en <strong>menos de 24 horas</strong>. Si tu consulta es urgente, puedes llamarme directamente.'
      : 'I have received your message and will reply within <strong>24 hours</strong>. For urgent matters, you can call me directly.'
    )}
    <div style="margin:24px 0 8px">
      ${btn(isEs ? 'WhatsApp' : 'WhatsApp', 'https://wa.me/34697911679')}
      ${btn(isEs ? 'Llamar' : 'Call', 'tel:+34697911679', 'outline')}
    </div>
  `;
  return {
    to: d.email,
    subject: isEs ? 'He recibido tu mensaje · Marita Galafate Psicóloga' : 'Message received · Marita Galafate Psychologist',
    html: wrap({ title: isEs ? 'He recibido tu mensaje' : 'I received your message', subtitle: 'Marita Galafate · Psicóloga', body, icon: '💬' })
  };
}

function emailAdminOtp(d) {
  const body = `
    ${p('Has iniciado sesión en el panel de administración. Usa este código para completar la verificación en dos pasos:')}
    <div style="text-align:center;margin:28px 0">
      <div style="display:inline-block;background:#f0fbf7;border:2px solid #9FE1CB;border-radius:14px;padding:22px 48px">
        <div style="font-size:42px;font-weight:700;letter-spacing:10px;color:#0F6E56;font-family:'Courier New',Courier,monospace">${d.code}</div>
      </div>
    </div>
    <p style="font-size:13px;color:#aaa;text-align:center;margin:0 0 8px;font-family:'Helvetica Neue',Arial,sans-serif">Este código caduca en <strong style="color:#666">10 minutos</strong>.</p>
    <p style="font-size:12px;color:#ccc;text-align:center;margin:0;font-family:'Helvetica Neue',Arial,sans-serif">Si no has intentado acceder al panel, ignora este email.</p>
  `;
  return {
    to: d.email,
    subject: `🔐 ${d.code} — Código de verificación · Panel Admin`,
    html: wrap({ title: 'Verificación en dos pasos', subtitle: 'Panel Admin · Marita Galafate', body, icon: '🔐' })
  };
}