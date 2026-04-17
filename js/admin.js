// ============================================================
// admin.js — Panel de administración
// ============================================================

let adminSchedule = {};
let adminSpecialDays = {};
let adminCalYear, adminCalMonth;
let allBookings = {};

const DAY_LABELS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// ─── Init ─────────────────────────────────────────────────────────────────────
function initAdmin() {
  checkAdminAuth();
}

function checkAdminAuth() {
  auth.onAuthStateChanged(user => {
    if (user && user.email === ADMIN_EMAIL) {
      showAdminPanel();
    } else {
      showLoginForm();
    }
  });
}

function showLoginForm() {
  document.getElementById('admin-login').style.display = 'flex';
  document.getElementById('admin-panel').style.display = 'none';

  document.getElementById('admin-login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errEl    = document.getElementById('login-error');
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      errEl.textContent = 'Email o contraseña incorrectos.';
      errEl.style.display = 'block';
    }
  });
}

async function showAdminPanel() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';

  const now = new Date();
  adminCalYear  = now.getFullYear();
  adminCalMonth = now.getMonth();

  await Promise.all([
    loadAdminSchedule(),
    loadAdminSpecialDays(),
    loadAllBookings()
  ]);

  renderScheduleEditor();
  renderAdminCalendar();
  renderUpcomingBookings();
  renderDashboardStats();
  setupAdminTabs();
}

function adminLogout() {
  auth.signOut();
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function setupAdminTabs() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(`tab-${target}`).style.display = 'block';
    });
  });
  // Activar primera tab
  document.querySelector('.admin-tab-btn')?.click();
}

// ─── Horarios ─────────────────────────────────────────────────────────────────
async function loadAdminSchedule() {
  const snap = await db.ref('schedule').once('value');
  adminSchedule = snap.val() || {};
  // Asegurar los 7 días
  for (let i = 0; i < 7; i++) {
    if (!adminSchedule[i]) adminSchedule[i] = { open: false, slots: [] };
  }
}

function renderScheduleEditor() {
  const container = document.getElementById('schedule-editor');
  if (!container) return;

  let html = '';
  for (let dow = 0; dow < 7; dow++) {
    const day = adminSchedule[dow] || { open: false, slots: [] };
    html += `
      <div class="sched-day" id="sched-day-${dow}">
        <div class="sched-day-header">
          <label class="toggle-label">
            <input type="checkbox" ${day.open ? 'checked' : ''} onchange="toggleDay(${dow}, this.checked)" />
            <span class="toggle-track"></span>
            <span class="day-name">${DAY_LABELS[dow]}</span>
          </label>
          ${day.open ? `<button class="btn-add-slot" onclick="addSlot(${dow})">+ Añadir hora</button>` : ''}
        </div>
        ${day.open ? renderSlotInputs(dow, day.slots) : `<p class="day-closed">Cerrado</p>`}
      </div>`;
  }
  container.innerHTML = html;
}

function renderSlotInputs(dow, slots) {
  if (!slots || slots.length === 0) return `<p class="no-slots-admin">Sin horas definidas. Añade una.</p>`;
  return `<div class="slot-inputs">${
    slots.map((slot, i) => `
      <div class="slot-input-row">
        <input type="time" value="${slot}" onchange="updateSlot(${dow}, ${i}, this.value)" />
        <button class="btn-del-slot" onclick="deleteSlot(${dow}, ${i})" title="Eliminar">✕</button>
      </div>`).join('')
  }</div>`;
}

function toggleDay(dow, open) {
  adminSchedule[dow] = { ...adminSchedule[dow], open };
  renderScheduleEditor();
}

function addSlot(dow) {
  if (!adminSchedule[dow].slots) adminSchedule[dow].slots = [];
  adminSchedule[dow].slots.push('09:00');
  renderScheduleEditor();
}

function updateSlot(dow, index, value) {
  adminSchedule[dow].slots[index] = value;
  // Ordenar
  adminSchedule[dow].slots.sort();
}

function deleteSlot(dow, index) {
  adminSchedule[dow].slots.splice(index, 1);
  renderScheduleEditor();
}

async function saveSchedule() {
  const btn = document.getElementById('save-schedule-btn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    await db.ref('schedule').set(adminSchedule);
    showAdminMsg('schedule-msg', 'success', '✓ Horario guardado correctamente.');
  } catch (err) {
    showAdminMsg('schedule-msg', 'error', 'Error al guardar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '✓ Guardar horario';
  }
}

// ─── Días especiales ──────────────────────────────────────────────────────────
async function loadAdminSpecialDays() {
  const snap = await db.ref('specialDays').once('value');
  adminSpecialDays = snap.val() || {};
}

function renderAdminCalendar(year, month) {
  if (year  !== undefined) adminCalYear  = year;
  if (month !== undefined) adminCalMonth = month;

  const cal = document.getElementById('admin-calendar');
  if (!cal) return;

  const now      = new Date();
  const firstDay = new Date(adminCalYear, adminCalMonth, 1);
  const lastDay  = new Date(adminCalYear, adminCalMonth + 1, 0);
  const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DAYS_ES   = ["Do","Lu","Ma","Mi","Ju","Vi","Sa"];

  const prevYear  = adminCalMonth === 0 ? adminCalYear - 1 : adminCalYear;
  const prevMonth = adminCalMonth === 0 ? 11 : adminCalMonth - 1;
  const nextYear  = adminCalMonth === 11 ? adminCalYear + 1 : adminCalYear;
  const nextMonth = adminCalMonth === 11 ? 0 : adminCalMonth + 1;

  let html = `
    <div class="cal-header">
      <button class="cal-nav" onclick="renderAdminCalendar(${prevYear},${prevMonth})">&#8249;</button>
      <span class="cal-month">${MONTHS_ES[adminCalMonth]} ${adminCalYear}</span>
      <button class="cal-nav" onclick="renderAdminCalendar(${nextYear},${nextMonth})">&#8250;</button>
    </div>
    <div class="cal-grid">
      ${DAYS_ES.map(d => `<div class="cal-day-name">${d}</div>`).join('')}
  `;

  let startDow = firstDay.getDay();
  for (let i = 0; i < startDow; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${adminCalYear}-${String(adminCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const special = adminSpecialDays[dateStr];
    const today   = dateStr === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    let cls = 'cal-cell admin-cal-cell';
    if (today) cls += ' today';
    if (special) {
      if (special.open === false) cls += ' sp-closed';
      else cls += ' sp-special';
    }

    html += `<div class="${cls}" onclick="openSpecialDayEditor('${dateStr}')">${d}${special ? `<span class="sp-dot"></span>` : ''}</div>`;
  }
  html += `</div>`;

  // Lista de días especiales próximos
  const upcoming = Object.entries(adminSpecialDays)
    .filter(([date]) => date >= new Date().toISOString().split('T')[0])
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(0, 10);

  if (upcoming.length > 0) {
    html += `<div class="upcoming-special"><h4>Próximos días especiales</h4>`;
    upcoming.forEach(([date, info]) => {
      html += `<div class="sp-item">
        <span class="sp-badge ${info.open===false ? 'closed' : 'custom'}">${info.open===false ? 'Cerrado' : 'Personalizado'}</span>
        <span>${formatDateShort(date)}</span>
        ${info.label ? `<em>${info.label}</em>` : ''}
        <button onclick="deleteSpecialDay('${date}')">✕</button>
      </div>`;
    });
    html += `</div>`;
  }

  cal.innerHTML = html;
}

function openSpecialDayEditor(dateStr) {
  const existing = adminSpecialDays[dateStr] || {};
  const modal    = document.getElementById('special-day-modal');
  const dateEl   = document.getElementById('sd-date-display');
  if (!modal || !dateEl) return;

  dateEl.textContent = formatDateLong(dateStr, 'es');
  document.getElementById('sd-date').value  = dateStr;
  document.getElementById('sd-open').value  = existing.open === false ? 'closed' : 'open';
  document.getElementById('sd-label').value = existing.label || '';

  // Slots
  const slotsEl = document.getElementById('sd-slots');
  slotsEl.value = (existing.slots || []).join('\n');

  toggleSpecialDaySlots();
  modal.style.display = 'flex';
}

function toggleSpecialDaySlots() {
  const isOpen = document.getElementById('sd-open').value !== 'closed';
  document.getElementById('sd-slots-wrap').style.display = isOpen ? 'block' : 'none';
}

function closeSpecialDayModal() {
  document.getElementById('special-day-modal').style.display = 'none';
}

async function saveSpecialDay() {
  const dateStr = document.getElementById('sd-date').value;
  const isOpen  = document.getElementById('sd-open').value !== 'closed';
  const label   = document.getElementById('sd-label').value.trim();
  const slotsRaw = document.getElementById('sd-slots').value.trim();
  const slots   = slotsRaw ? slotsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

  const data = isOpen
    ? { open: true, slots, label: label || null }
    : { open: false, label: label || null };

  await db.ref(`specialDays/${dateStr}`).set(data);
  adminSpecialDays[dateStr] = data;
  closeSpecialDayModal();
  renderAdminCalendar();
  showAdminMsg('special-msg', 'success', '✓ Día especial guardado.');
}

async function deleteSpecialDay(dateStr) {
  if (!confirm(`¿Eliminar configuración especial para ${formatDateShort(dateStr)}?`)) return;
  await db.ref(`specialDays/${dateStr}`).remove();
  delete adminSpecialDays[dateStr];
  renderAdminCalendar();
}

// ─── Reservas ─────────────────────────────────────────────────────────────────
async function loadAllBookings() {
  db.ref('bookings').on('value', snap => {
    allBookings = snap.val() || {};
    renderUpcomingBookings();
  });
}

function renderUpcomingBookings(filter = 'upcoming') {
  const container = document.getElementById('bookings-list');
  if (!container) return;

  const today = new Date().toISOString().split('T')[0];
  let rows = [];

  Object.entries(allBookings).forEach(([date, slots]) => {
    Object.entries(slots).forEach(([slotId, booking]) => {
      if (filter === 'upcoming' && (date < today || booking.status === 'cancelled')) return;
      if (filter === 'past'     && (date >= today)) return;
      if (filter === 'all' && booking.status === 'cancelled' && date < today) return;
      rows.push({ date, slotId, ...booking });
    });
  });

  rows.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  if (rows.length === 0) {
    container.innerHTML = `<p class="no-bookings">No hay reservas ${filter === 'upcoming' ? 'próximas' : 'pasadas'}.</p>`;
    return;
  }

  let html = `<table class="bookings-table">
    <thead><tr>
      <th>Fecha</th><th>Hora</th><th>Cliente</th><th>Email</th><th>Modalidad</th><th>Estado</th><th>Acciones</th>
    </tr></thead><tbody>`;

  rows.forEach(b => {
    const statusClass = b.status === 'confirmed' ? 'st-confirmed' : 'st-cancelled';
    const statusLabel = b.status === 'confirmed' ? 'Confirmada' : 'Cancelada';
    html += `<tr>
      <td>${formatDateShort(b.date)}</td>
      <td><strong>${b.time}</strong></td>
      <td>${b.clientName}</td>
      <td><a href="mailto:${b.clientEmail}">${b.clientEmail}</a></td>
      <td>${b.modality === 'online' ? '🌐 Online' : '📍 Presencial'}</td>
      <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      <td class="booking-actions">
        ${b.status === 'confirmed' ? `<button class="btn-sm danger" onclick="adminCancelBooking('${b.date}','${b.slotId}')">Cancelar</button>` : ''}
        <button class="btn-sm" onclick="adminViewBooking('${b.date}','${b.slotId}')">Ver</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

async function adminCancelBooking(date, slotId) {
  if (!confirm('¿Cancelar esta cita? Se notificará al cliente por email.')) return;

  const snap    = await db.ref(`bookings/${date}/${slotId}`).once('value');
  const booking = snap.val();
  if (!booking) return;

  await db.ref(`bookings/${date}/${slotId}`).update({ status: 'cancelled', cancelledAt: Date.now() });

  await fetch(`${API_BASE}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'booking_cancel',
      data: {
        clientName:  booking.clientName,
        clientEmail: booking.clientEmail,
        date:        formatDateLong(date, booking.lang || 'es'),
        time:        booking.time,
        lang:        booking.lang || 'es',
        bookingId:   slotId,
        bookingUrl:  `${window.location.origin}/index.html#reservar`,
        adminLink:   `${window.location.origin}/admin.html`
      }
    })
  });
  showAdminMsg('bookings-msg', 'success', '✓ Cita cancelada y cliente notificado.');
}

function adminViewBooking(date, slotId) {
  const b = allBookings[date]?.[slotId];
  if (!b) return;
  alert(`CITA\n\nCliente: ${b.clientName}\nEmail: ${b.clientEmail}\nTeléfono: ${b.clientPhone||'-'}\nFecha: ${formatDateShort(date)}\nHora: ${b.time}\nModalidad: ${b.modality}\nMotivo: ${b.reason||'-'}\nEstado: ${b.status}\nReservada: ${new Date(b.createdAt).toLocaleString('es-ES')}`);
}

// ─── Stats del dashboard ───────────────────────────────────────────────────────
function renderDashboardStats() {
  const today    = new Date().toISOString().split('T')[0];
  let upcoming   = 0, thisWeek = 0, thisMonth = 0, total = 0;
  const weekEnd  = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = new Date(); monthEnd.setMonth(monthEnd.getMonth() + 1);

  Object.entries(allBookings).forEach(([date, slots]) => {
    Object.values(slots).forEach(b => {
      if (b.status !== 'confirmed') return;
      total++;
      if (date >= today) upcoming++;
      if (date >= today && new Date(date) <= weekEnd)  thisWeek++;
      if (date >= today && new Date(date) <= monthEnd) thisMonth++;
    });
  });

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-upcoming',  upcoming);
  set('stat-week',      thisWeek);
  set('stat-month',     thisMonth);
  set('stat-total',     total);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function formatDateShort(dateStr) {
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});
}

function formatDateLong(dateStr, lang='es') {
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString(lang==='es'?'es-ES':'en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

function showAdminMsg(containerId, type, msg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `admin-msg ${type}`;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ─── Pacientes ────────────────────────────────────────────────────────────────
async function renderPatients(searchTerm = '') {
  const container = document.getElementById('patients-list');
  if (!container) return;

  container.innerHTML = '<p style="color:var(--text3);font-size:13px">Cargando pacientes...</p>';

  // Recopilar todos los pacientes únicos de las reservas
  const patientsMap = {};
  Object.entries(allBookings).forEach(([date, slots]) => {
    Object.entries(slots).forEach(([slotId, booking]) => {
      const email = booking.clientEmail;
      if (!email) return;
      if (!patientsMap[email]) {
        patientsMap[email] = {
          name:    booking.clientName,
          email:   booking.clientEmail,
          phone:   booking.clientPhone || '—',
          bookings: []
        };
      }
      patientsMap[email].bookings.push({ date, time: booking.time, status: booking.status, modality: booking.modality });
    });
  });

  let patients = Object.values(patientsMap);

  // Filtrar por búsqueda
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    patients = patients.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s) ||
      p.phone.includes(s)
    );
  }

  // Ordenar por nombre
  patients.sort((a, b) => a.name.localeCompare(b.name));

  if (patients.length === 0) {
    container.innerHTML = '<p class="no-bookings">No se encontraron pacientes.</p>';
    return;
  }

  let html = `<table class="bookings-table">
    <thead><tr>
      <th>Nombre</th><th>Email</th><th>Teléfono</th><th>Citas totales</th><th>Última cita</th><th>Acciones</th>
    </tr></thead><tbody>`;

  patients.forEach(p => {
    const confirmed = p.bookings.filter(b => b.status !== 'cancelled');
    const sorted    = [...p.bookings].sort((a,b) => b.date.localeCompare(a.date));
    const last      = sorted[0];
    html += `<tr>
      <td><strong>${p.name}</strong></td>
      <td><a href="mailto:${p.email}">${p.email}</a></td>
      <td><a href="tel:${p.phone}">${p.phone}</a></td>
      <td><span class="status-badge st-confirmed">${confirmed.length} cita${confirmed.length !== 1 ? 's' : ''}</span></td>
      <td>${last ? formatDateShort(last.date) + ' · ' + last.time : '—'}</td>
      <td class="booking-actions">
        <button class="btn-sm" onclick="viewPatientDetail('${p.email}')">Ver historial</button>
        <a class="btn-sm" href="mailto:${p.email}">Email</a>
        <a class="btn-sm" href="tel:${p.phone}">Llamar</a>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;

  document.getElementById('patients-count').textContent = `${patients.length} paciente${patients.length !== 1 ? 's' : ''}`;
}

function viewPatientDetail(email) {
  const patientsMap = {};
  Object.entries(allBookings).forEach(([date, slots]) => {
    Object.entries(slots).forEach(([slotId, booking]) => {
      if (booking.clientEmail === email) {
        if (!patientsMap[email]) patientsMap[email] = { name: booking.clientName, email, phone: booking.clientPhone || '—', bookings: [] };
        patientsMap[email].bookings.push({ date, time: booking.time, status: booking.status, modality: booking.modality });
      }
    });
  });

  const p = patientsMap[email];
  if (!p) return;

  const sorted = [...p.bookings].sort((a,b) => b.date.localeCompare(a.date));
  const lines  = sorted.map(b =>
    `${formatDateShort(b.date)} ${b.time} · ${b.modality === 'online' ? 'Online' : 'Presencial'} · ${b.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}`
  ).join('\n');

  alert(`PACIENTE: ${p.name}\nEmail: ${p.email}\nTeléfono: ${p.phone}\n\nHISTORIAL DE CITAS:\n${lines}`);
}