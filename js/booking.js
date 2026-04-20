// ============================================================
// booking.js — Sistema de reservas en tiempo real
// ============================================================

const MONTHS = {
  es: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"]
};
const DAYS_SHORT = {
  es: ["Do","Lu","Ma","Mi","Ju","Vi","Sa"],
  en: ["Su","Mo","Tu","We","Th","Fr","Sa"]
};
const DAY_NAMES = {
  es: ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"],
  en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
};

let currentSchedule = null;
let currentSpecialDays = {};
let calYear, calMonth;
let selectedDate = null;
let selectedSlot = null;
let selectedModality = 'online';
let bookingInProgress = false;
let dayListener = null;
let rescheduleId = null;

const DEFAULT_SCHEDULE = {
  0: { open: false, slots: [] },
  1: { open: true,  slots: ["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"] },
  2: { open: true,  slots: ["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"] },
  3: { open: true,  slots: ["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"] },
  4: { open: true,  slots: ["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"] },
  5: { open: true,  slots: ["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"] },
  6: { open: false, slots: [] }
};

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initBooking() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();

  const [schedSnap, specSnap] = await Promise.all([
    db.ref('schedule').once('value'),
    db.ref('specialDays').once('value')
  ]);
  currentSchedule    = schedSnap.val()  || DEFAULT_SCHEDULE;
  currentSpecialDays = specSnap.val()   || {};

  renderCalendar();
  setupModalityBtns();
  setupBookingForm();

  // Comprobar si venimos de un link de reprogramación
  const params = new URLSearchParams(window.location.search);
  rescheduleId = params.get('reschedule');
  if (rescheduleId) {
    showRescheduleNotice(rescheduleId);
  }
}

// ─── Modalidad ────────────────────────────────────────────────────────────────
function setupModalityBtns() {
  document.querySelectorAll('.modality-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modality-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedModality = btn.dataset.modality;
    });
  });
  // Online activo por defecto
  const onlineBtn = document.querySelector('.modality-btn[data-modality="online"]');
  if (onlineBtn) onlineBtn.classList.add('active');
}

// ─── Calendario ───────────────────────────────────────────────────────────────
function renderCalendar(year, month) {
  if (year  !== undefined) calYear  = year;
  if (month !== undefined) calMonth = month;

  const cal = document.getElementById('booking-calendar');
  if (!cal) return;

  const now      = new Date();
  const today    = toDateStr(now);
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);
  const lang     = window.currentLang || 'es';

  // Prev / Next month
  const prevYear  = calMonth === 0 ? calYear - 1 : calYear;
  const prevMonth = calMonth === 0 ? 11 : calMonth - 1;
  const nextYear  = calMonth === 11 ? calYear + 1 : calYear;
  const nextMonth = calMonth === 11 ? 0 : calMonth + 1;

  let html = `
    <div class="cal-header">
      <button class="cal-nav" onclick="renderCalendar(${prevYear},${prevMonth})">&#8249;</button>
      <span class="cal-month">${MONTHS[lang][calMonth]} ${calYear}</span>
      <button class="cal-nav" onclick="renderCalendar(${nextYear},${nextMonth})">&#8250;</button>
    </div>
    <div class="cal-grid">
      ${DAYS_SHORT[lang].map(d => `<div class="cal-day-name">${d}</div>`).join('')}
  `;

  // Padding inicio
  let startDow = firstDay.getDay();
  for (let i = 0; i < startDow; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr  = `${calYear}-${pad(calMonth+1)}-${pad(d)}`;
    const cellDate = new Date(calYear, calMonth, d);
    const dow      = cellDate.getDay();
    const isPast   = dateStr < today;
    const isToday  = dateStr === today;
    const special  = currentSpecialDays[dateStr];

    let available = false;
    if (!isPast) {
      if (special) {
        available = special.open !== false && special.slots && special.slots.length > 0;
      } else {
        available = !!(currentSchedule[dow]?.open && currentSchedule[dow]?.slots?.length);
      }
    }

    const cls = ['cal-cell',
      isPast      ? 'past'      : '',
      isToday     ? 'today'     : '',
      available   ? 'avail'     : 'unavail',
      selectedDate === dateStr ? 'sel' : ''
    ].filter(Boolean).join(' ');

    html += `<div class="${cls}"${available ? ` onclick="selectDate('${dateStr}')" role="button" tabindex="0"` : ''}>${d}</div>`;
  }

  html += `</div>
    <div class="cal-legend">
      <span class="leg avail"></span><span>${lang==='es'?'Disponible':'Available'}</span>
      <span class="leg unavail"></span><span>${lang==='es'?'No disponible':'Unavailable'}</span>
      <span class="leg booked"></span><span>${lang==='es'?'Ocupado':'Booked'}</span>
    </div>`;

  cal.innerHTML = html;
}

// ─── Seleccionar fecha ────────────────────────────────────────────────────────
async function selectDate(dateStr) {
  selectedDate = dateStr;
  selectedSlot = null;
  renderCalendar();

  const lang       = window.currentLang || 'es';
  const slotsWrap  = document.getElementById('time-slots');
  const formWrap   = document.getElementById('booking-form-container');
  if (!slotsWrap) return;

  if (formWrap) formWrap.style.display = 'none';
  slotsWrap.innerHTML = `<p class="slots-loading">${lang==='es'?'Cargando horarios...':'Loading times...'}</p>`;

  const [y,m,d] = dateStr.split('-').map(Number);
  const dow      = new Date(y, m-1, d).getDay();
  const special  = currentSpecialDays[dateStr];
  const slots    = special ? (special.slots||[]) : (currentSchedule[dow]?.slots||[]);

  // Mostrar fecha seleccionada
  const display = document.getElementById('selected-date-display');
  if (display) {
    display.textContent = formatDateLong(dateStr, lang);
    display.style.display = 'block';
  }

  if (slots.length === 0) {
    slotsWrap.innerHTML = `<p class="no-slots">${lang==='es'?'No hay horarios disponibles.':'No available times.'}</p>`;
    return;
  }

  // Cancelar listener anterior
  if (dayListener) db.ref(`bookings/${selectedDate}`).off('value', dayListener);

  // Escuchar en tiempo real
  dayListener = db.ref(`bookings/${dateStr}`).on('value', snap => {
    const data    = snap.val() || {};
    const booked  = Object.values(data).filter(b => b.status !== 'cancelled').map(b => b.time);
    renderSlots(slots, booked);
  });
}

// ─── Renderizar slots ─────────────────────────────────────────────────────────
function renderSlots(slots, bookedTimes) {
  const lang      = window.currentLang || 'es';
  const slotsWrap = document.getElementById('time-slots');
  if (!slotsWrap) return;

  let html = `<div class="slots-grid">`;
  slots.forEach(slot => {
    const isBooked = bookedTimes.includes(slot);
    const isSel    = slot === selectedSlot;
    html += `<button
      class="slot-btn ${isBooked ? 'booked' : isSel ? 'sel-slot' : 'free'}"
      data-slot="${slot}"
      ${isBooked ? 'disabled' : `onclick="selectSlot('${slot}')"`}>
      ${slot}${isBooked ? ` <small>${lang==='es'?'Ocupado':'Booked'}</small>` : ''}
    </button>`;
  });
  html += `</div>`;
  slotsWrap.innerHTML = html;
}

// ─── Seleccionar slot ─────────────────────────────────────────────────────────
function selectSlot(slot) {
  selectedSlot = slot;
  // Actualizar estilos
  document.querySelectorAll('.slot-btn.free, .slot-btn.sel-slot').forEach(btn => {
    btn.classList.toggle('sel-slot', btn.dataset.slot === slot);
    btn.classList.toggle('free',     btn.dataset.slot !== slot && !btn.disabled);
  });
  const formWrap = document.getElementById('booking-form-container');
  if (formWrap) {
    formWrap.style.display = 'block';
    setTimeout(() => formWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}

// ─── Formulario ───────────────────────────────────────────────────────────────
function setupBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  form.addEventListener('submit', handleBookingSubmit);
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  if (bookingInProgress) return;

  const lang = window.currentLang || 'es';

  if (!selectedDate || !selectedSlot) {
    showMsg('booking-msg', 'error', lang==='es' ? 'Selecciona fecha y hora.' : 'Please select date and time.');
    return;
  }

  const name     = document.getElementById('b-name').value.trim();
  const lastname = document.getElementById('b-lastname')?.value.trim() || '';
  const email    = document.getElementById('b-email').value.trim();
  const phone    = document.getElementById('b-phone')?.value.trim() || '';
  const reason   = document.getElementById('b-reason')?.value.trim() || '';
  const fullName = lastname ? `${name} ${lastname}` : name;

  if (!name || !lastname || !email || !phone) {
    showMsg('booking-msg', 'error', lang==='es' ? 'Nombre, apellidos, email y teléfono son obligatorios.' : 'Name, surname, email and phone are required.');
    return;
  }

  bookingInProgress = true;
  const btn = document.getElementById('booking-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = lang==='es' ? 'Reservando...' : 'Booking...'; }

  // ─── Bloqueo de concurrencia con transacción Firebase ────────────────────
  const slotRef = db.ref(`bookings/${selectedDate}/${selectedSlot.replace(':','')}`);

  try {
    const result = await slotRef.transaction(current => {
      if (current && current.status !== 'cancelled') {
        return; // Abortar — ya está reservado
      }
      return {
        time:         selectedSlot,
        clientName:   fullName,
        clientFirst:  name,
        clientLast:   lastname,
        clientEmail:  email,
        clientPhone:  phone,
        reason:       reason,
        modality:     selectedModality,
        status:       'confirmed',
        lang:         lang,
        createdAt:    Date.now()
      };
    });

    if (!result.committed) {
      showMsg('booking-msg', 'error', lang==='es' ? 'Esta hora ya no está disponible. Elige otra.' : 'This slot is no longer available. Please choose another.');
      resetBookingBtn();
      return;
    }

    const bookingId = result.snapshot.key;
    const bookingData = result.snapshot.val();

    // Guardar también en índice por email para cancelaciones
    await db.ref(`clients/${email.replace(/\./g,'_')}/bookings/${selectedDate}_${bookingId}`).set({
      date: selectedDate, time: selectedSlot, bookingId, status: 'confirmed'
    });

    // Detectar si es paciente nuevo (nunca ha reservado antes)
    const origin = window.location.origin;
    const clientSnap = await db.ref(`clients/${email.replace(/\./g,'_')}`).once('value');
    const isNewPatient = !clientSnap.exists();

    await fetch(`${API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booking_confirm',
        data: {
          clientName:     fullName,
          clientFirst:    name,
          clientEmail:    email,
          clientPhone:    phone,
          reason:         reason,
          date:           formatDateLong(selectedDate, lang),
          time:           selectedSlot,
          modality:       selectedModality,
          lang:           lang,
          bookingId:      bookingId,
          isNewPatient:   isNewPatient,
          cancelLink:     `${origin}/cancel.html?id=${bookingId}&date=${selectedDate}`,
          rescheduleLink: `${origin}/index.html?reschedule=${bookingId}&date=${selectedDate}`,
          adminLink:      `${origin}/admin.html`
        }
      })
    }).then(async r => {
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        console.error('Email API error:', r.status, errBody);
        // Don't block booking success if only email fails
      }
    }).catch(err => console.error('Email fetch error:', err));

    // Éxito — reserva guardada aunque falle el email
    showBookingSuccess(name, lang);

  } catch (err) {
    console.error(err);
    showMsg('booking-msg', 'error', lang==='es' ? 'Error al reservar. Inténtalo de nuevo.' : 'Booking error. Please try again.');
    resetBookingBtn();
  } finally {
    bookingInProgress = false;
  }
}

function showBookingSuccess(name, lang) {
  const formWrap = document.getElementById('booking-form-container');
  const slotsWrap = document.getElementById('time-slots');
  if (formWrap) formWrap.style.display = 'none';
  if (slotsWrap) slotsWrap.innerHTML = '';

  const success = document.getElementById('booking-success');
  if (success) {
    success.style.display = 'block';
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  selectedDate = null;
  selectedSlot = null;
  renderCalendar();
}

function resetBookingBtn() {
  const btn = document.getElementById('booking-submit-btn');
  if (btn) { btn.disabled = false; btn.textContent = lang==='es' ? 'Confirmar reserva' : 'Confirm booking'; }
}

// ─── Cancelación desde link ───────────────────────────────────────────────────
async function cancelBookingFromLink() {
  const params     = new URLSearchParams(window.location.search);
  const bookingId  = params.get('id');
  const date       = params.get('date');
  if (!bookingId || !date) return;

  const ref = db.ref(`bookings/${date}/${bookingId}`);
  const snap = await ref.once('value');
  const booking = snap.val();
  if (!booking) {
    document.getElementById('cancel-msg').textContent = 'Reserva no encontrada.';
    return;
  }

  const lang = booking.lang || 'es';
  const confirmMsg = lang === 'es'
    ? `¿Confirmas la cancelación de tu cita del ${formatDateLong(date,lang)} a las ${booking.time}?`
    : `Confirm cancellation of your session on ${formatDateLong(date,lang)} at ${booking.time}?`;

  if (!confirm(confirmMsg)) return;

  await ref.update({ status: 'cancelled', cancelledAt: Date.now() });

  // Email
  await fetch(`${API_BASE}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'booking_cancel',
      data: {
        clientName:  booking.clientName,
        clientEmail: booking.clientEmail,
        date:        formatDateLong(date, lang),
        time:        booking.time,
        lang,
        bookingId,
        bookingUrl:  `${window.location.origin}/index.html#reservar`,
        adminLink:   `${window.location.origin}/admin.html`
      }
    })
  });

  document.getElementById('cancel-msg').textContent =
    lang === 'es' ? '✓ Cita cancelada correctamente.' : '✓ Session cancelled successfully.';
}

// ─── Aviso de reprogramación ──────────────────────────────────────────────────
async function showRescheduleNotice(bookingId) {
  const params = new URLSearchParams(window.location.search);
  const date   = params.get('date');
  if (!date) return;

  const snap = await db.ref(`bookings/${date}/${bookingId}`).once('value');
  const old  = snap.val();
  if (!old) return;

  const notice = document.getElementById('reschedule-notice');
  if (notice) {
    const lang = window.currentLang || 'es';
    notice.style.display = 'block';
    notice.innerHTML = lang === 'es'
      ? `<strong>Reprogramando cita</strong><br>Cita actual: ${formatDateLong(date,lang)} a las ${old.time}.<br>Elige una nueva fecha y hora.`
      : `<strong>Rescheduling session</strong><br>Current: ${formatDateLong(date,lang)} at ${old.time}.<br>Choose a new date and time.`;
  }

  // Al confirmar nueva reserva, cancelar la anterior
  const origSubmit = handleBookingSubmit;
  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.stopImmediatePropagation();
    // Cancelar cita anterior
    await db.ref(`bookings/${date}/${bookingId}`).update({ status: 'cancelled', cancelledAt: Date.now() });
    const oldBooking = snap.val();

    // Enviar email reprogramación
    const lang = window.currentLang || 'es';
    await fetch(`${API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booking_reschedule',
        data: {
          clientName:  oldBooking.clientName,
          clientEmail: oldBooking.clientEmail,
          oldDate:     formatDateLong(date, lang),
          oldTime:     oldBooking.time,
          newDate:     formatDateLong(selectedDate, lang),
          newTime:     selectedSlot,
          modality:    selectedModality,
          lang,
          cancelLink:  `${window.location.origin}/cancel.html?id=${bookingId}&date=${selectedDate}`,
          adminLink:   `${window.location.origin}/admin.html`
        }
      })
    });
  }, { once: true });
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

function pad(n) { return String(n).padStart(2,'0'); }

function formatDateLong(dateStr, lang='es') {
  const [y,m,d] = dateStr.split('-').map(Number);
  const date = new Date(y, m-1, d);
  const locale = lang === 'es' ? 'es-ES' : 'en-GB';
  return date.toLocaleDateString(locale, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function showMsg(containerId, type, msg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `form-msg ${type}`;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}