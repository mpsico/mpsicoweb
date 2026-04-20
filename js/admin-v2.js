// ============================================================
// admin-v2.js — Panel de administración completo
// Incluye: 2FA por email, CRUD reservas/pacientes,
//          reset contraseña, días especiales
// ============================================================

// ─── Estado global ────────────────────────────────────────────────────────────
let allBookings = {};
let adminSchedule = {};
let adminSpecialDays = {};
let calYear, calMonth;
let bookingFilter = 'upcoming';
let otpCode = '';
let otpExpiry = 0;
let pendingUser = null;

const DAY_LABELS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTHS_ES  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DEFAULT_SCHEDULE = {
  0:{open:false,slots:[]},1:{open:true,slots:["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"]},
  2:{open:true,slots:["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"]},
  3:{open:true,slots:["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"]},
  4:{open:true,slots:["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"]},
  5:{open:true,slots:["09:00","10:00","11:00","12:00","13:00","17:00","18:00","19:00"]},
  6:{open:false,slots:[]}
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(user => {
    if (user && user.email === ADMIN_EMAIL) {
      showPanel(user);
    } else {
      showLogin();
    }
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('adm-email').value;
    const pwd   = document.getElementById('adm-pwd').value;
    const errEl = document.getElementById('login-err');
    errEl.style.display = 'none';
    try {
      const cred = await auth.signInWithEmailAndPassword(email, pwd);
      pendingUser = cred.user;
      // Send 2FA code
      await send2FACode(email);
      document.getElementById('tfa-em').textContent = email;
      showStep('2fa');
      setup2FAInputs();
    } catch (err) {
      errEl.textContent = 'Email o contraseña incorrectos.';
      errEl.style.display = 'block';
      await auth.signOut();
    }
  });

  // OTP verify
  document.getElementById('btn-otp').addEventListener('click', verifyOtp);
});

// ─── Login steps ──────────────────────────────────────────────────────────────
function showStep(step) {
  ['login','2fa','reset'].forEach(s => {
    document.getElementById(`step-${s}`).style.display = s === step ? 'block' : 'none';
  });
}

function showLogin() {
  document.getElementById('admin-login').style.display = 'flex';
  document.getElementById('admin-panel').style.display = 'none';
  showStep('login');
}

// ─── 2FA ──────────────────────────────────────────────────────────────────────
async function send2FACode(email) {
  // Generate 6-digit OTP
  otpCode = String(Math.floor(100000 + Math.random() * 900000));
  otpExpiry = Date.now() + 10 * 60 * 1000; // 10 min

  // Send via Resend
  try {
    await fetch(`${API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin_otp',
        data: { email, code: otpCode }
      })
    });
  } catch (err) {
    console.error('OTP send error:', err);
  }
}

function setup2FAInputs() {
  const inputs = document.querySelectorAll('.otp-i');
  inputs.forEach((input, i) => {
    input.value = '';
    input.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '');
      input.value = val.slice(-1);
      if (val && i < inputs.length - 1) inputs[i+1].focus();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && i > 0) inputs[i-1].focus();
    });
    input.addEventListener('paste', e => {
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if (pasted.length === 6) {
        pasted.split('').forEach((ch, idx) => { if (inputs[idx]) inputs[idx].value = ch; });
        inputs[5].focus();
        e.preventDefault();
      }
    });
  });
  inputs[0].focus();
}

function verifyOtp() {
  const inputs  = document.querySelectorAll('.otp-i');
  const entered = Array.from(inputs).map(i => i.value).join('');
  const errEl   = document.getElementById('tfa-err');

  if (Date.now() > otpExpiry) {
    errEl.textContent = 'El código ha expirado. Solicita uno nuevo.';
    errEl.style.display = 'block';
    return;
  }
  if (entered === otpCode) {
    errEl.style.display = 'none';
    showPanel(pendingUser);
  } else {
    errEl.textContent = 'Código incorrecto. Inténtalo de nuevo.';
    errEl.style.display = 'block';
  }
}

async function resendOtp() {
  const email = document.getElementById('adm-email').value;
  await send2FACode(email);
  showToast('Código reenviado', 'ok');
}

// ─── Password reset ────────────────────────────────────────────────────────────
async function sendPwdReset() {
  const email = document.getElementById('reset-email').value.trim();
  const errEl = document.getElementById('reset-err');
  errEl.style.display = 'none';
  try {
    await auth.sendPasswordResetEmail(email);
    document.getElementById('reset-ok').style.display = 'block';
  } catch (err) {
    errEl.textContent = 'Error al enviar. Verifica el email.';
    errEl.style.display = 'block';
  }
}

// ─── Panel ────────────────────────────────────────────────────────────────────
async function showPanel(user) {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  document.getElementById('adm-user').textContent = user.email;

  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  document.getElementById('dash-date').textContent = now.toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  await Promise.all([loadSchedule(), loadSpecialDays()]);
  loadAllBookings(); // real-time listener
}

function adminLogout() {
  auth.signOut();
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(`tab-${tab}`);
  if (el) el.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

  if (tab === 'dashboard') renderDashboard();
  if (tab === 'patients')  renderPatients();
  if (tab === 'schedule')  renderScheduleEditor();
  if (tab === 'specialdays') renderAdminCal();
}

// ─── Bookings: load + render ───────────────────────────────────────────────────
function loadAllBookings() {
  db.ref('bookings').on('value', snap => {
    allBookings = snap.val() || {};
    renderDashboard();
    renderBookings();
    renderPatients();
  });
}

function getBookingsFlat() {
  const rows = [];
  Object.entries(allBookings).forEach(([date, slots]) => {
    if (!slots || typeof slots !== 'object') return;
    Object.entries(slots).forEach(([slotId, booking]) => {
      if (booking && booking.time) rows.push({ date, slotId, ...booking });
    });
  });
  return rows;
}

function renderDashboard() {
  const today   = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const monEnd  = new Date(); monEnd.setDate(monEnd.getDate() + 30);

  let upcoming = 0, thisWeek = 0, total = 0;
  const patients = new Set();

  getBookingsFlat().forEach(b => {
    if (b.status !== 'confirmed') return;
    total++;
    if (b.clientEmail) patients.add(b.clientEmail);
    if (b.date >= today) upcoming++;
    if (b.date >= today && new Date(b.date) <= weekEnd) thisWeek++;
  });

  setEl('st-upcoming', upcoming);
  setEl('st-week',     thisWeek);
  setEl('st-patients', patients.size);
  setEl('st-total',    total);

  // Dashboard table
  const rows = getBookingsFlat()
    .filter(b => b.date >= today && b.status === 'confirmed')
    .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 7);

  const tbody = document.getElementById('dash-bk-body');
  if (!tbody) return;
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="5" class="no-data">No hay citas próximas.</td></tr>'; return; }

  tbody.innerHTML = rows.map(b => `<tr>
    <td>${fmtDate(b.date)}</td>
    <td><strong>${b.time}</strong></td>
    <td>${b.clientName || '—'}</td>
    <td>${b.modality === 'online' ? '🌐 Online' : '📍 Presencial'}</td>
    <td><span class="bdg bdg-g">Confirmada</span></td>
  </tr>`).join('');
}

function renderBookings() {
  const today  = new Date().toISOString().split('T')[0];
  const search = (document.getElementById('bk-search')?.value || '').toLowerCase();

  let rows = getBookingsFlat().filter(b => {
    if (bookingFilter === 'upcoming') return b.date >= today && b.status !== 'cancelled';
    if (bookingFilter === 'past')     return b.date < today;
    return true;
  });

  if (search) rows = rows.filter(b =>
    (b.clientName || '').toLowerCase().includes(search) ||
    (b.clientEmail || '').toLowerCase().includes(search) ||
    (b.clientPhone || '').includes(search)
  );

  rows.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const tbody = document.getElementById('bk-body');
  if (!tbody) return;
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="8" class="no-data">No hay reservas.</td></tr>'; return; }

  tbody.innerHTML = rows.map(b => {
    const statusBdg = b.status === 'confirmed'
      ? '<span class="bdg bdg-g">Confirmada</span>'
      : '<span class="bdg bdg-r">Cancelada</span>';
    const actions = b.status === 'confirmed' ? `
      <button class="bsm" onclick="viewBooking('${b.date}','${b.slotId}')">Ver</button>
      <button class="bsm" onclick="editBooking('${b.date}','${b.slotId}')">Editar</button>
      <button class="bsm rd" onclick="confirmCancelBooking('${b.date}','${b.slotId}')">Cancelar</button>
    ` : `<button class="bsm" onclick="viewBooking('${b.date}','${b.slotId}')">Ver</button>`;
    return `<tr>
      <td>${fmtDate(b.date)}</td>
      <td><strong>${b.time}</strong></td>
      <td>${b.clientName || '—'}</td>
      <td><a href="mailto:${b.clientEmail}" style="color:var(--g7)">${b.clientEmail || '—'}</a></td>
      <td>${b.clientPhone || '—'}</td>
      <td>${b.modality === 'online' ? '🌐 Online' : '📍 Presencial'}</td>
      <td>${statusBdg}</td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">${actions}</div></td>
    </tr>`;
  }).join('');
}

function setBkFilter(btn, filter) {
  document.querySelectorAll('.f-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  bookingFilter = filter;
  renderBookings();
}

// ─── Booking: view / edit / cancel ────────────────────────────────────────────
function viewBooking(date, slotId) {
  const b = allBookings[date]?.[slotId];
  if (!b) return;
  document.getElementById('bk-m-title').textContent = 'Detalle de cita';
  document.getElementById('bk-m-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Fecha</div><div style="font-weight:500">${fmtDate(date)}</div></div>
      <div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Hora</div><div style="font-weight:500">${b.time}</div></div>
      <div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Paciente</div><div style="font-weight:500">${b.clientName || '—'}</div></div>
      <div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Modalidad</div><div>${b.modality === 'online' ? '🌐 Online' : '📍 Presencial'}</div></div>
      <div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Email</div><div><a href="mailto:${b.clientEmail}" style="color:var(--g7)">${b.clientEmail || '—'}</a></div></div>
      <div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Teléfono</div><div><a href="tel:${b.clientPhone}" style="color:var(--g7)">${b.clientPhone || '—'}</a></div></div>
    </div>
    ${b.reason ? `<div style="background:var(--bg);border-radius:var(--r);padding:12px;font-size:13px;color:var(--t2);line-height:1.6"><strong>Motivo:</strong> ${b.reason}</div>` : ''}
    <div style="margin-top:1rem;font-size:12px;color:var(--t3)">ID: ${slotId} · Reservado: ${b.createdAt ? new Date(b.createdAt).toLocaleString('es-ES') : '—'}</div>
  `;
  document.getElementById('bk-m-foot').innerHTML = b.status === 'confirmed' ? `
    <button class="btn btn-s" onclick="closeModal('bk-modal')">Cerrar</button>
    <button class="btn btn-d" onclick="closeModal('bk-modal');confirmCancelBooking('${date}','${slotId}')">Cancelar cita</button>
  ` : '<button class="btn btn-s" onclick="closeModal(\'bk-modal\')">Cerrar</button>';
  openModal('bk-modal');
}

function editBooking(date, slotId) {
  const b = allBookings[date]?.[slotId];
  if (!b) return;
  document.getElementById('bk-m-title').textContent = 'Editar cita';
  document.getElementById('bk-m-body').innerHTML = `
    <div class="mfg"><label>Nombre</label><input type="text" id="edit-name" value="${b.clientName || ''}" /></div>
    <div class="mfg"><label>Email</label><input type="email" id="edit-email" value="${b.clientEmail || ''}" /></div>
    <div class="mfg"><label>Teléfono</label><input type="tel" id="edit-phone" value="${b.clientPhone || ''}" /></div>
    <div class="mfg"><label>Motivo</label><textarea id="edit-reason">${b.reason || ''}</textarea></div>
    <div class="mfg"><label>Modalidad</label><select id="edit-modality"><option value="online" ${b.modality==='online'?'selected':''}>Online</option><option value="presencial" ${b.modality==='presencial'?'selected':''}>Presencial</option></select></div>
  `;
  document.getElementById('bk-m-foot').innerHTML = `
    <button class="btn btn-s" onclick="closeModal('bk-modal')">Cancelar</button>
    <button class="btn btn-p" onclick="saveBookingEdit('${date}','${slotId}')">Guardar cambios</button>
  `;
  openModal('bk-modal');
}

async function saveBookingEdit(date, slotId) {
  const updates = {
    clientName:  document.getElementById('edit-name').value.trim(),
    clientEmail: document.getElementById('edit-email').value.trim(),
    clientPhone: document.getElementById('edit-phone').value.trim(),
    reason:      document.getElementById('edit-reason').value.trim(),
    modality:    document.getElementById('edit-modality').value,
  };
  await db.ref(`bookings/${date}/${slotId}`).update(updates);
  closeModal('bk-modal');
  showToast('Cita actualizada correctamente', 'ok');
}

function confirmCancelBooking(date, slotId) {
  const b = allBookings[date]?.[slotId];
  document.getElementById('cfm-title').textContent = 'Cancelar cita';
  document.getElementById('cfm-text').textContent = `¿Cancelar la cita de ${b?.clientName || 'este paciente'} el ${fmtDate(date)} a las ${b?.time}? Se notificará al cliente por email.`;
  document.getElementById('cfm-btn').onclick = () => doCancelBooking(date, slotId);
  openModal('confirm-modal');
}

async function doCancelBooking(date, slotId) {
  const snap = await db.ref(`bookings/${date}/${slotId}`).once('value');
  const b    = snap.val();
  if (!b) return;
  await db.ref(`bookings/${date}/${slotId}`).update({ status: 'cancelled', cancelledAt: Date.now() });
  closeModal('confirm-modal');
  showToast('Cita cancelada. Cliente notificado.', 'ok');

  await fetch(`${API_BASE}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'booking_cancel',
      data: {
        clientName: b.clientName, clientEmail: b.clientEmail,
        date: fmtDateLong(date, b.lang || 'es'), time: b.time,
        lang: b.lang || 'es', bookingId: slotId,
        bookingUrl: `${window.location.origin}/es/#reservar`,
        adminLink: `${window.location.origin}/admin.html`
      }
    })
  });
}

// ─── Patients ─────────────────────────────────────────────────────────────────
function renderPatients() {
  const search = (document.getElementById('pat-search')?.value || '').toLowerCase();
  const map = {};

  getBookingsFlat().forEach(b => {
    const email = b.clientEmail;
    if (!email) return;
    if (!map[email]) map[email] = { name: b.clientName, email, phone: b.clientPhone || '—', bookings: [] };
    map[email].bookings.push(b);
  });

  let patients = Object.values(map);
  if (search) patients = patients.filter(p =>
    p.name?.toLowerCase().includes(search) ||
    p.email.toLowerCase().includes(search) ||
    p.phone.includes(search)
  );
  patients.sort((a,b) => (a.name||'').localeCompare(b.name||''));

  const lbl = document.getElementById('pat-count-lbl');
  if (lbl) lbl.textContent = `${patients.length} paciente${patients.length !== 1 ? 's' : ''} registrados`;

  const tbody = document.getElementById('pat-body');
  if (!tbody) return;
  if (!patients.length) { tbody.innerHTML = '<tr><td colspan="6" class="no-data">No se encontraron pacientes.</td></tr>'; return; }

  tbody.innerHTML = patients.map(p => {
    const confirmed = p.bookings.filter(b => b.status !== 'cancelled');
    const last = [...p.bookings].sort((a,b) => b.date.localeCompare(a.date))[0];
    const initials = (p.name || '??').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--g1);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:var(--g7);flex-shrink:0">${initials}</div>
        <strong>${p.name || '—'}</strong>
      </div></td>
      <td><a href="mailto:${p.email}" style="color:var(--g7)">${p.email}</a></td>
      <td><a href="tel:${p.phone}" style="color:var(--g7)">${p.phone}</a></td>
      <td><span class="bdg bdg-g">${confirmed.length} cita${confirmed.length !== 1 ? 's' : ''}</span></td>
      <td>${last ? fmtDate(last.date) + ' · ' + last.time : '—'}</td>
      <td><div style="display:flex;gap:4px">
        <button class="bsm" onclick="viewPatient('${p.email}')">Ver historial</button>
        <a class="bsm" href="mailto:${p.email}">Email</a>
        <a class="bsm" href="tel:${p.phone}">Llamar</a>
      </div></td>
    </tr>`;
  }).join('');
}

function viewPatient(email) {
  const map = {};
  getBookingsFlat().forEach(b => {
    if (b.clientEmail === email) {
      if (!map[email]) map[email] = { name: b.clientName, email, phone: b.clientPhone || '—', bookings: [] };
      map[email].bookings.push(b);
    }
  });
  const p = map[email];
  if (!p) return;

  const sorted   = [...p.bookings].sort((a,b) => b.date.localeCompare(a.date));
  const initials = (p.name||'??').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const confirmed = p.bookings.filter(b => b.status !== 'cancelled').length;

  document.getElementById('pat-m-title').textContent = p.name || 'Paciente';
  document.getElementById('pat-m-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:.5px solid var(--border)">
      <div style="width:52px;height:52px;border-radius:50%;background:var(--g1);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:500;color:var(--g7);flex-shrink:0">${initials}</div>
      <div>
        <h3 style="font-size:18px;font-weight:500;margin-bottom:3px">${p.name}</h3>
        <p style="font-size:13px;color:var(--t3)">${confirmed} cita${confirmed!==1?'s':''} confirmadas</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Email</div><a href="mailto:${p.email}" style="color:var(--g7);font-size:14px">${p.email}</a></div>
      <div><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Teléfono</div><a href="tel:${p.phone}" style="color:var(--g7);font-size:14px">${p.phone}</a></div>
    </div>
    <h4 style="font-size:13px;font-weight:500;margin-bottom:.75rem">Historial de citas</h4>
    <div style="display:flex;flex-direction:column;gap:.5rem">
      ${sorted.map(b => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${b.status==='cancelled'?'#fef2f2':'var(--bg)'};border-radius:var(--r);font-size:13px">
          <div><strong>${fmtDate(b.date)}</strong> · ${b.time} · ${b.modality==='online'?'Online':'Presencial'}</div>
          <span class="bdg ${b.status==='confirmed'?'bdg-g':'bdg-r'}">${b.status==='confirmed'?'Confirmada':'Cancelada'}</span>
        </div>
      `).join('')}
    </div>
  `;
  openModal('pat-modal');
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
async function loadSchedule() {
  const snap = await db.ref('schedule').once('value');
  adminSchedule = snap.val() || DEFAULT_SCHEDULE;
  for (let i = 0; i < 7; i++) {
    if (!adminSchedule[i]) adminSchedule[i] = { open: false, slots: [] };
  }
}

function renderScheduleEditor() {
  const container = document.getElementById('sched-editor');
  if (!container) return;
  container.innerHTML = '';
  for (let dow = 0; dow < 7; dow++) {
    const day = adminSchedule[dow] || { open: false, slots: [] };
    const div = document.createElement('div');
    div.className = 'sday';
    div.innerHTML = `
      <div class="sday-hdr">
        <label class="tog-lbl">
          <input type="checkbox" ${day.open ? 'checked' : ''} onchange="toggleDay(${dow}, this.checked)" />
          <span style="font-size:14px;font-weight:500">${DAY_LABELS[dow]}</span>
        </label>
        ${day.open ? `<button class="btn-add-slot" onclick="addSlot(${dow})">+ Añadir hora</button>` : ''}
      </div>
      ${day.open ? renderSlotInputs(dow, day.slots) : '<p style="font-size:13px;color:var(--t3)">Cerrado</p>'}
    `;
    container.appendChild(div);
  }
}

function renderSlotInputs(dow, slots) {
  if (!slots?.length) return '<p style="font-size:13px;color:var(--t3)">Sin horas definidas.</p>';
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:.5rem">${
    slots.map((slot, i) => `<div class="slot-inp-row">
      <input type="time" value="${slot}" onchange="updateSlot(${dow},${i},this.value)" />
      <button class="btn-del-slot" onclick="deleteSlot(${dow},${i})" title="Eliminar">✕</button>
    </div>`).join('')
  }</div>`;
}

function toggleDay(dow, open) { adminSchedule[dow] = { ...adminSchedule[dow], open }; renderScheduleEditor(); }
function addSlot(dow) { if (!adminSchedule[dow].slots) adminSchedule[dow].slots = []; adminSchedule[dow].slots.push('09:00'); renderScheduleEditor(); }
function updateSlot(dow, i, val) { adminSchedule[dow].slots[i] = val; adminSchedule[dow].slots.sort(); }
function deleteSlot(dow, i) { adminSchedule[dow].slots.splice(i, 1); renderScheduleEditor(); }

async function saveSchedule() {
  await db.ref('schedule').set(adminSchedule);
  showToast('Horario guardado correctamente', 'ok');
}

// ─── Special days ─────────────────────────────────────────────────────────────
async function loadSpecialDays() {
  const snap = await db.ref('specialDays').once('value');
  adminSpecialDays = snap.val() || {};
}

function renderAdminCal(year, month) {
  if (year  !== undefined) calYear  = year;
  if (month !== undefined) calMonth = month;
  const cal = document.getElementById('adm-cal');
  if (!cal) return;

  const now      = new Date();
  const today    = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);
  const prevYear = calMonth === 0 ? calYear-1 : calYear;
  const prevMon  = calMonth === 0 ? 11 : calMonth-1;
  const nextYear = calMonth === 11 ? calYear+1 : calYear;
  const nextMon  = calMonth === 11 ? 0 : calMonth+1;

  let html = `<div class="cal-hdr">
    <button class="cal-nav" onclick="renderAdminCal(${prevYear},${prevMon})">&#8249;</button>
    <span class="cal-mo">${MONTHS_ES[calMonth]} ${calYear}</span>
    <button class="cal-nav" onclick="renderAdminCal(${nextYear},${nextMon})">&#8250;</button>
  </div>
  <div class="cal-grid">
    ${['Lu','Ma','Mi','Ju','Vi','Sa','Do'].map(d => `<div class="cal-dn">${d}</div>`).join('')}`;

  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  for (let i = 0; i < startDow; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${calYear}-${pad(calMonth+1)}-${pad(d)}`;
    const sp = adminSpecialDays[dateStr];
    const isToday = dateStr === today;
    let cls = 'cal-cell acal-cell';
    if (isToday) cls += ' today';
    if (sp) cls += sp.open === false ? ' sp-closed' : ' sp-special';
    html += `<div class="${cls}" onclick="openSpModal('${dateStr}')">${d}${sp ? '<span class="sp-dot"></span>' : ''}</div>`;
  }

  html += `</div>`;

  const upcoming = Object.entries(adminSpecialDays)
    .filter(([date]) => date >= today)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(0, 8);

  if (upcoming.length) {
    html += `<div style="margin-top:1.5rem"><h4 style="font-size:13px;font-weight:500;color:var(--t2);margin-bottom:.5rem">Próximos días especiales</h4>`;
    upcoming.forEach(([date, info]) => {
      html += `<div class="sp-item">
        <span class="sp-badge ${info.open===false?'closed':'custom'}">${info.open===false?'Cerrado':'Personalizado'}</span>
        <span>${fmtDate(date)}</span>
        ${info.label ? `<em>${info.label}</em>` : ''}
        <button onclick="deleteSpecialDay('${date}')" style="font-size:11px;color:#991b1b;cursor:pointer;background:none;border:none;font-family:inherit">✕</button>
      </div>`;
    });
    html += `</div>`;
  }

  cal.innerHTML = html;
}

function openSpModal(dateStr) {
  const existing = adminSpecialDays[dateStr] || {};
  document.getElementById('sp-date-disp').textContent = fmtDateLong(dateStr, 'es');
  document.getElementById('sp-date').value  = dateStr;
  document.getElementById('sp-open').value  = existing.open === false ? 'closed' : 'open';
  document.getElementById('sp-label').value = existing.label || '';
  document.getElementById('sp-slots').value = (existing.slots || []).join('\n');
  toggleSpSlots();
  openModal('sp-modal');
}

function toggleSpSlots() {
  const isOpen = document.getElementById('sp-open').value !== 'closed';
  document.getElementById('sp-slots-wrap').style.display = isOpen ? 'block' : 'none';
}

async function saveSpecialDay() {
  const dateStr = document.getElementById('sp-date').value;
  const isOpen  = document.getElementById('sp-open').value !== 'closed';
  const label   = document.getElementById('sp-label').value.trim();
  const slotsRaw = document.getElementById('sp-slots').value.trim();
  const slots   = slotsRaw ? slotsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const data = isOpen ? { open: true, slots, label: label || null } : { open: false, label: label || null };
  await db.ref(`specialDays/${dateStr}`).set(data);
  adminSpecialDays[dateStr] = data;
  closeModal('sp-modal');
  renderAdminCal();
  showToast('Día especial guardado', 'ok');
}

async function deleteSpecialDay(dateStr) {
  await db.ref(`specialDays/${dateStr}`).remove();
  delete adminSpecialDays[dateStr];
  renderAdminCal();
  showToast('Día especial eliminado', 'info');
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('m-ov')) {
    e.target.classList.remove('open');
  }
});

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3500);
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function pad(n) { return String(n).padStart(2, '0'); }

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function fmtDateLong(dateStr, lang = 'es') {
  if (!dateStr) return '—';
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}