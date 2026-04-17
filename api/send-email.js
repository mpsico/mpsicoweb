// ============================================================
// api/send-email.js — Vercel Serverless Function
// Usa Resend: https://resend.com (gratis: 3.000 emails/mes)
// ------------------------------------------------------------
// PASOS:
// 1. Ve a https://resend.com y crea cuenta gratis
// 2. Verifica tu dominio O usa onboarding@resend.dev para pruebas
// 3. API Keys > Create API Key
// 4. En Vercel > Settings > Environment Variables añade:
//    RESEND_API_KEY = re_xxxxxxxxxxxx
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
  }

  const { type, data } = req.body;

  try {
    const emails = buildEmails(type, data);
    const results = await Promise.all(
      emails.map(email => sendWithResend(RESEND_API_KEY, email))
    );
    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Enviar con Resend ────────────────────────────────────────────────────────
async function sendWithResend(apiKey, { to, subject, html }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Marita Galafate · Psicóloga <onboarding@resend.dev>', // ← cambia por tu dominio verificado
      to,
      subject,
      html
    })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(JSON.stringify(err));
  }
  return resp.json();
}

// ─── Constructor de emails ────────────────────────────────────────────────────
function buildEmails(type, d) {
  switch (type) {
    case 'booking_confirm': return [
      emailClientConfirm(d),
      emailAdminNewBooking(d)
    ];
    case 'booking_cancel': return [
      emailClientCancel(d),
      emailAdminCancel(d)
    ];
    case 'booking_reschedule': return [
      emailClientReschedule(d),
      emailAdminReschedule(d)
    ];
    case 'contact': return [
      emailAdminContact(d),
      emailClientContactAck(d)
    ];
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

// ─── Estilos base compartidos ─────────────────────────────────────────────────
const BASE_STYLE = `
  body{margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .header{background:#0F6E56;padding:32px 40px}
  .header h1{margin:0;color:#fff;font-size:22px;font-weight:500;letter-spacing:-.3px}
  .header p{margin:6px 0 0;color:rgba(255,255,255,.7);font-size:14px}
  .body{padding:32px 40px}
  .body p{margin:0 0 16px;font-size:15px;line-height:1.65;color:#333}
  .info-box{background:#f8f9f4;border-left:3px solid #1D9E75;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0}
  .info-box .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:14px}
  .info-box .row:last-child{border-bottom:none}
  .info-box .lbl{color:#888;font-weight:400}
  .info-box .val{color:#1a1a1a;font-weight:500;text-align:right}
  .btn{display:inline-block;margin:8px 8px 8px 0;padding:12px 24px;background:#0F6E56;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500}
  .btn.outline{background:#fff;color:#0F6E56;border:1.5px solid #0F6E56}
  .footer{background:#f4f4f0;padding:20px 40px;text-align:center}
  .footer p{margin:0;font-size:12px;color:#999;line-height:1.6}
  .footer a{color:#0F6E56;text-decoration:none}
  .badge{display:inline-block;background:#E1F5EE;color:#0F6E56;font-size:12px;font-weight:500;padding:4px 12px;border-radius:100px;margin-bottom:16px}
`;

const FOOTER_HTML = `
  <div class="footer">
    <p>Marita Galafate Domínguez · Psicóloga General Sanitaria<br>
    Av. Alcalde Álvaro Domecq 18, 2ºA · Jerez de la Frontera<br>
    <a href="tel:+34697911679">+34 697 911 679</a> · <a href="mailto:maritagpsicologa@gmail.com">maritagpsicologa@gmail.com</a></p>
  </div>
`;

function wrap(headerTitle, headerSub, bodyContent) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_STYLE}</style></head><body>
  <div class="wrap">
    <div class="header"><h1>${headerTitle}</h1>${headerSub ? `<p>${headerSub}</p>` : ''}</div>
    <div class="body">${bodyContent}</div>
    ${FOOTER_HTML}
  </div></body></html>`;
}

function infoBox(rows) {
  return `<div class="info-box">${rows.map(([l,v]) => `<div class="row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`).join('')}</div>`;
}

// ─── Plantillas ES/EN ─────────────────────────────────────────────────────────
function emailClientConfirm(d) {
  const isEs = d.lang !== 'en';
  const subject = isEs ? `Cita confirmada · ${d.date} a las ${d.time}` : `Session confirmed · ${d.date} at ${d.time}`;
  const html = wrap(
    isEs ? '¡Tu cita está confirmada!' : 'Your session is confirmed!',
    isEs ? 'Marita Galafate · Psicóloga' : 'Marita Galafate · Psychologist',
    `
    <span class="badge">${isEs ? '✓ Confirmada' : '✓ Confirmed'}</span>
    <p>${isEs ? `Hola <strong>${d.clientName}</strong>, tu cita ha quedado registrada correctamente.` : `Hello <strong>${d.clientName}</strong>, your session has been successfully registered.`}</p>
    ${infoBox([
      [isEs ? 'Fecha' : 'Date', d.date],
      [isEs ? 'Hora' : 'Time', d.time],
      [isEs ? 'Modalidad' : 'Modality', d.modality === 'online' ? (isEs ? 'Online (Zoom/Skype)' : 'Online (Zoom/Skype)') : (isEs ? 'Presencial – Jerez' : 'In-person – Jerez')],
      [isEs ? 'Duración' : 'Duration', isEs ? '1 hora' : '1 hour'],
      [isEs ? 'Precio' : 'Price', 'Desde 55€'],
    ])}
    <p>${isEs ? 'Si necesitas cancelar o cambiar la cita, puedes hacerlo desde los botones de abajo hasta 24 horas antes.' : 'If you need to cancel or reschedule, use the buttons below up to 24 hours before.'}</p>
    <a class="btn outline" href="${d.cancelLink}">${isEs ? 'Cancelar cita' : 'Cancel session'}</a>
    <a class="btn outline" href="${d.rescheduleLink}">${isEs ? 'Reprogramar' : 'Reschedule'}</a>
    <p style="font-size:13px;color:#999;margin-top:24px">${isEs ? 'Si tienes preguntas, escríbeme a maritagpsicologa@gmail.com o llama al +34 697 911 679.' : 'For any questions, email maritagpsicologa@gmail.com or call +34 697 911 679.'}</p>
    `
  );
  return { to: "maritagpsicologa@gmail.com", subject, html };
}

function emailAdminNewBooking(d) {
  const newPatientBadge = d.isNewPatient
    ? `<div style="background:#fef9c3;border:.5px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;color:#78350f">
        <strong>⭐ Paciente nuevo</strong> — Primera reserva desde la web. No tiene historial previo en el sistema.
       </div>`
    : `<div style="background:#E1F5EE;border:.5px solid #9FE1CB;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;color:#085041">
        <strong>↩ Paciente recurrente</strong> — Ya ha reservado anteriormente a través de la web.
       </div>`;

  const html = wrap(
    '📅 Nueva reserva recibida',
    `De ${d.clientName}`,
    `
    ${newPatientBadge}
    <p>Se ha realizado una nueva reserva en la web.</p>
    ${infoBox([
      ['Cliente', d.clientName],
      ['Email', d.clientEmail],
      ['Teléfono', d.clientPhone || 'No indicado'],
      ['Fecha', d.date],
      ['Hora', d.time],
      ['Modalidad', d.modality === 'online' ? 'Online' : 'Presencial'],
      ['Motivo', d.reason || 'No indicado'],
      ['ID reserva', d.bookingId],
    ])}
    <a class="btn" href="${d.adminLink}">Abrir panel de admin</a>
    `
  );
  return { to: 'maritagpsicologa@gmail.com', subject: `${d.isNewPatient ? '⭐ Nuevo paciente' : 'Nueva cita'}: ${d.clientName} · ${d.date} ${d.time}`, html };
}

function emailClientCancel(d) {
  const isEs = d.lang !== 'en';
  const html = wrap(
    isEs ? 'Cita cancelada' : 'Session cancelled',
    'Marita Galafate · Psicóloga',
    `
    <p>${isEs ? `Hola <strong>${d.clientName}</strong>, tu cita del <strong>${d.date} a las ${d.time}</strong> ha sido cancelada correctamente.` : `Hello <strong>${d.clientName}</strong>, your session on <strong>${d.date} at ${d.time}</strong> has been successfully cancelled.`}</p>
    <p>${isEs ? 'Si deseas volver a reservar, puedes hacerlo en cualquier momento.' : 'If you wish to book again, you can do so at any time.'}</p>
    <a class="btn" href="${d.bookingUrl}">${isEs ? 'Reservar nueva cita' : 'Book a new session'}</a>
    `
  );
  return { to: "maritagpsicologa@gmail.com", subject: isEs ? `Cita cancelada · ${d.date}` : `Session cancelled · ${d.date}`, html };
}

function emailAdminCancel(d) {
  const html = wrap(
    '❌ Cita cancelada',
    `Por ${d.clientName}`,
    `
    <p>${d.clientName} ha cancelado su cita.</p>
    ${infoBox([
      ['Cliente', d.clientName],
      ['Fecha', d.date],
      ['Hora', d.time],
      ['ID', d.bookingId],
    ])}
    <p>El slot ha quedado libre automáticamente.</p>
    <a class="btn" href="${d.adminLink}">Ver panel de admin</a>
    `
  );
  return { to: 'maritagpsicologa@gmail.com', subject: `Cancelación: ${d.clientName} · ${d.date} ${d.time}`, html };
}

function emailClientReschedule(d) {
  const isEs = d.lang !== 'en';
  const html = wrap(
    isEs ? 'Cita reprogramada' : 'Session rescheduled',
    'Marita Galafate · Psicóloga',
    `
    <p>${isEs ? `Hola <strong>${d.clientName}</strong>, tu cita ha sido reprogramada correctamente.` : `Hello <strong>${d.clientName}</strong>, your session has been successfully rescheduled.`}</p>
    ${infoBox([
      [isEs ? 'Anterior' : 'Previous', `${d.oldDate} · ${d.oldTime}`],
      [isEs ? 'Nueva fecha' : 'New date', d.newDate],
      [isEs ? 'Nueva hora' : 'New time', d.newTime],
      [isEs ? 'Modalidad' : 'Modality', d.modality === 'online' ? 'Online' : (isEs ? 'Presencial' : 'In-person')],
    ])}
    <a class="btn outline" href="${d.cancelLink}">${isEs ? 'Cancelar cita' : 'Cancel session'}</a>
    `
  );
  return { to: "maritagpsicologa@gmail.com", subject: isEs ? `Cita reprogramada · ${d.newDate} ${d.newTime}` : `Session rescheduled · ${d.newDate} ${d.newTime}`, html };
}

function emailAdminReschedule(d) {
  const html = wrap(
    '🔄 Cita reprogramada',
    `Por ${d.clientName}`,
    `
    <p>${d.clientName} ha reprogramado su cita.</p>
    ${infoBox([
      ['Cliente', d.clientName],
      ['Anterior', `${d.oldDate} · ${d.oldTime}`],
      ['Nueva fecha', d.newDate],
      ['Nueva hora', d.newTime],
    ])}
    <a class="btn" href="${d.adminLink}">Ver panel de admin</a>
    `
  );
  return { to: 'maritagpsicologa@gmail.com', subject: `Reprogramación: ${d.clientName} · ${d.newDate} ${d.newTime}`, html };
}

function emailAdminContact(d) {
  const html = wrap(
    '💬 Nuevo mensaje de contacto',
    `De ${d.name}`,
    `
    <p>Has recibido un nuevo mensaje desde el formulario de contacto de tu web.</p>
    ${infoBox([
      ['Nombre', d.name],
      ['Email', d.email],
      ['Mensaje', ''],
    ])}
    <p style="background:#f8f9f4;padding:16px;border-radius:8px;font-size:14px;line-height:1.65">${d.message}</p>
    <a class="btn" href="mailto:${d.email}">Responder a ${d.name}</a>
    `
  );
  return { to: 'maritagpsicologa@gmail.com', subject: `Nuevo contacto web: ${d.name}`, html };
}

function emailClientContactAck(d) {
  const isEs = d.lang !== 'en';
  const html = wrap(
    isEs ? 'He recibido tu mensaje' : 'I received your message',
    'Marita Galafate · Psicóloga',
    `
    <p>${isEs ? `Hola <strong>${d.name}</strong>, gracias por ponerte en contacto.` : `Hello <strong>${d.name}</strong>, thank you for getting in touch.`}</p>
    <p>${isEs ? 'He recibido tu mensaje y te responderé en menos de 24 horas. Si tu consulta es urgente, puedes llamarme directamente al <strong>+34 697 911 679</strong>.' : 'I have received your message and will reply within 24 hours. For urgent matters, you can call me directly at <strong>+34 697 911 679</strong>.'}</p>
    <a class="btn" href="https://wa.me/34697911679">${isEs ? 'Escribir por WhatsApp' : 'Message on WhatsApp'}</a>
    `
  );
  return { to: d.email, subject: isEs ? 'He recibido tu mensaje · Marita Galafate Psicóloga' : 'Message received · Marita Galafate Psychologist', html };
}

