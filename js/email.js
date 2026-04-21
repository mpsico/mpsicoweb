// ============================================================
// EMAILJS CONFIGURATION
// ------------------------------------------------------------
// 1. Ve a https://www.emailjs.com y crea una cuenta gratis
// 2. Conecta tu Gmail (maritagpsicologa@gmail.com)
// 3. Crea dos plantillas de email (ver README.md)
// 4. Sustituye los valores de abajo
// ============================================================

const EMAILJS_CONFIG = {
  publicKey: "TU_PUBLIC_KEY",          // Account > API Keys
  serviceId: "TU_SERVICE_ID",          // Email Services > Service ID
  templateConfirmClient: "template_cliente",   // Template ID para el cliente
  templateConfirmAdmin: "template_admin",      // Template ID para ti (Marita)
  templateCancelClient: "template_cancel",     // Template ID cancelación
  templateReschedule: "template_reprog",       // Template ID reprogramación
};

// Inicializar EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

// ─── Enviar confirmación al cliente ───────────────────────────────────────────
async function sendConfirmationToClient(booking) {
  const params = {
    to_name: booking.clientName,
    to_email: booking.clientEmail,
    date: formatDateLong(booking.date, booking.lang),
    time: booking.time,
    modality: booking.modality === 'online'
      ? (booking.lang === 'es' ? 'Online (Zoom/Skype/Meet/Teams)' : 'Online (Zoom/Skype/Meet/Teams)')
      : (booking.lang === 'es' ? 'Presencial – Av. Alcalde Álvaro Domecq 18, Jerez' : 'In-person – Av. Alcalde Álvaro Domecq 18, Jerez'),
    cancel_link: `${window.location.origin}/cancel.html?id=${booking.id}`,
    reschedule_link: `${window.location.origin}/index.html?reschedule=${booking.id}`,
    psychologist_name: "Marita Galafate Domínguez",
    psychologist_email: "maritagpsicologa@gmail.com",
    psychologist_phone: "+34 697 911 679",
  };

  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateConfirmClient, params);
    console.log("✅ Email cliente enviado");
  } catch (err) {
    console.error("❌ Error email cliente:", err);
  }
}

// ─── Enviar notificación a Marita ─────────────────────────────────────────────
async function sendNotificationToAdmin(booking) {
  const params = {
    to_email: "maritagpsicologa@gmail.com",
    client_name: booking.clientName,
    client_email: booking.clientEmail,
    client_phone: booking.clientPhone || "No indicado",
    date: formatDateLong(booking.date, 'es'),
    time: booking.time,
    modality: booking.modality === 'online' ? 'Online' : 'Presencial',
    reason: booking.reason || "No indicado",
    booking_id: booking.id,
    admin_link: `${window.location.origin}/admin.html`,
  };

  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateConfirmAdmin, params);
    console.log("✅ Email admin enviado");
  } catch (err) {
    console.error("❌ Error email admin:", err);
  }
}

// ─── Enviar email de cancelación ──────────────────────────────────────────────
async function sendCancellationEmail(booking) {
  const params = {
    to_name: booking.clientName,
    to_email: booking.clientEmail,
    date: formatDateLong(booking.date, booking.lang),
    time: booking.time,
    booking_url: `${window.location.origin}/index.html#reservar`,
    psychologist_name: "Marita Galafate Domínguez",
  };

  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateCancelClient, params);
    console.log("✅ Email cancelación enviado");
  } catch (err) {
    console.error("❌ Error email cancelación:", err);
  }
}

// ─── Enviar email de reprogramación ───────────────────────────────────────────
async function sendRescheduleEmail(booking, newDate, newTime) {
  const params = {
    to_name: booking.clientName,
    to_email: booking.clientEmail,
    old_date: formatDateLong(booking.date, booking.lang),
    old_time: booking.time,
    new_date: formatDateLong(newDate, booking.lang),
    new_time: newTime,
    psychologist_name: "Marita Galafate Domínguez",
  };

  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateReschedule, params);
    console.log("✅ Email reprogramación enviado");
  } catch (err) {
    console.error("❌ Error email reprogramación:", err);
  }
}

// ─── Utilidades de fecha ──────────────────────────────────────────────────────
function formatDateLong(dateStr, lang = 'es') {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const locale = lang === 'es' ? 'es-ES' : 'en-GB';
  return date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
