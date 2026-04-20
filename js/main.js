// ============================================================
// main.js — Navegación, idioma, animaciones, contacto
// ============================================================

window.currentLang = localStorage.getItem('lang') || 'es';

document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(window.currentLang);
  setupNavScroll();
  setupMobileMenu();
  setupScrollAnimations();
  setupContactForm();
  setupSmoothScroll();
  setupWhatsApp();

  if (typeof initBooking === 'function') initBooking();
  if (typeof cancelBookingFromLink === 'function') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) cancelBookingFromLink();
  }
});

// ─── Idioma ───────────────────────────────────────────────────────────────────
function switchLang(lang) {
  window.currentLang = lang;
  localStorage.setItem('lang', lang);
  applyLanguage(lang);
  if (typeof renderCalendar === 'function') renderCalendar();
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;

  // Nav
  setEl('nav-about',       t('nav.about'));
  setEl('nav-specialties', t('nav.specialties'));
  setEl('nav-booking',     t('nav.booking'));
  setEl('nav-reviews',     t('nav.reviews'));
  setEl('nav-contact',     t('nav.contact'));
  document.querySelectorAll('.nav-book-btn').forEach(el => el.textContent = t('nav.bookBtn'));

  // Lang toggle
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Hero
  setEl('hero-badge',    t('hero.badge'));
  setEl('hero-title1',   t('hero.title1'));
  setEl('hero-title2',   t('hero.title2'));
  setEl('hero-subtitle', t('hero.subtitle'));
  setEl('hero-cta1',     t('hero.ctaPrimary'));
  setEl('hero-cta2',     t('hero.ctaSecondary'));
  setEl('hero-stat1-num', t('hero.stat1num'));
  setEl('hero-stat1-lbl', t('hero.stat1lbl'));
  setEl('hero-stat2-num', t('hero.stat2num'));
  setEl('hero-stat2-lbl', t('hero.stat2lbl'));
  setEl('hero-stat3-num', t('hero.stat3num'));
  setEl('hero-stat3-lbl', t('hero.stat3lbl'));

  // About
  setEl('about-label',    t('about.label'));
  setEl('about-title',    t('about.title'));
  setEl('about-p1',       t('about.p1'));
  setEl('about-p2',       t('about.p2'));
  setEl('about-cert-title', t('about.certTitle'));
  for (let i = 1; i <= 6; i++) setEl(`about-cert${i}`, t(`about.cert${i}`));

  // Modalities
  setEl('mod-label',           t('modalities.label'));
  setEl('mod-title',           t('modalities.title'));
  setEl('mod-online-title',    t('modalities.onlineTitle'));
  setEl('mod-online-badge',    t('modalities.onlineBadge'));
  setEl('mod-online-desc',     t('modalities.onlineDesc'));
  setEl('mod-online-f1',       t('modalities.onlineFeature1'));
  setEl('mod-online-f2',       t('modalities.onlineFeature2'));
  setEl('mod-online-f3',       t('modalities.onlineFeature3'));
  setEl('mod-online-f4',       t('modalities.onlineFeature4'));
  setEl('mod-online-cta',      t('modalities.onlineCta'));
  setEl('mod-presencial-title',t('modalities.presencialTitle'));
  setEl('mod-presencial-desc', t('modalities.presencialDesc'));
  setEl('mod-presencial-f1',   t('modalities.presencialFeature1'));
  setEl('mod-presencial-f2',   t('modalities.presencialFeature2'));
  setEl('mod-presencial-f3',   t('modalities.presencialFeature3'));
  setEl('mod-presencial-f4',   t('modalities.presencialFeature4'));
  setEl('mod-presencial-cta',  t('modalities.presencialCta'));
  setEl('mod-price',           t('modalities.price'));

  // Specialties
  setEl('spec-label', t('specialties.label'));
  setEl('spec-title', t('specialties.title'));
  const items = t('specialties.items');
  if (Array.isArray(items)) {
    items.forEach((item, i) => {
      setEl(`spec-title-${i}`, item.title);
      setEl(`spec-desc-${i}`,  item.desc);
    });
  }

  // Booking
  setEl('booking-label',        t('booking.label'));
  setEl('booking-title',        t('booking.title'));
  setEl('booking-subtitle',     t('booking.subtitle'));
  setEl('booking-modality-lbl', t('booking.modalityLabel'));
  setEl('b-online-btn',         t('booking.online'));
  setEl('b-presencial-btn',     t('booking.presencial'));
  setEl('booking-form-title',   t('booking.formTitle'));
  setEl('b-name-label',         t('booking.nameLabel'));
  setEl('b-lastname-label',     t('booking.lastnameLabel'));
  setEl('b-email-label',        t('booking.emailLabel'));
  setEl('b-phone-label',        t('booking.phoneLabel'));
  setEl('b-reason-label',       t('booking.reasonLabel'));
  const reasonEl = document.getElementById('b-reason');
  if (reasonEl) reasonEl.placeholder = t('booking.reasonPlaceholder');
  setEl('booking-submit-btn',   t('booking.submitBtn'));
  setEl('booking-success-title',t('booking.successTitle'));
  setEl('booking-success-msg',  t('booking.successMsg'));
  setEl('booking-select-date',  t('booking.selectDate'));
  setEl('booking-select-time',  t('booking.selectTime'));

  // Reviews
  setEl('reviews-label', t('reviews.label'));
  setEl('reviews-title', t('reviews.title'));
  const revItems = t('reviews.items');
  if (Array.isArray(revItems)) {
    revItems.forEach((rev, i) => {
      setEl(`rev-name-${i}`,    rev.name);
      setEl(`rev-date-${i}`,    rev.date);
      setEl(`rev-text-${i}`,    rev.text);
      setEl(`rev-verified-${i}`,t('reviews.verified'));
    });
  }

  // Contact
  setEl('contact-label',       t('contact.label'));
  setEl('contact-title',       t('contact.title'));
  setEl('contact-subtitle',    t('contact.subtitle'));
  setEl('c-name-label',        t('contact.nameLabel'));
  setEl('c-email-label',       t('contact.emailLabel'));
  setEl('c-message-label',     t('contact.messageLabel'));
  setEl('contact-submit-btn',  t('contact.submitBtn'));
  setEl('contact-schedule-title', t('contact.scheduleTitle'));
  setEl('contact-schedule',    t('contact.schedule'));
  setEl('whatsapp-btn',        t('contact.whatsapp'));

  // Footer
  setEl('footer-rights',  t('footer.rights'));
  setEl('footer-privacy', t('footer.privacy'));
  setEl('footer-legal',   t('footer.legal'));
  setEl('footer-cookies', t('footer.cookies'));
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el && text !== undefined) el.textContent = text;
}

// ─── Navegación scroll ────────────────────────────────────────────────────────
function setupNavScroll() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 80) nav.classList.add('scrolled');
    else        nav.classList.remove('scrolled');
    // Ocultar al bajar, mostrar al subir
    if (y > lastY + 5 && y > 200) nav.classList.add('hidden');
    else if (y < lastY - 5)       nav.classList.remove('hidden');
    lastY = y;
  }, { passive: true });
}

// ─── Menú móvil ───────────────────────────────────────────────────────────────
function setupMobileMenu() {
  const btn  = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.style.display === 'flex';
    menu.style.display = open ? 'none' : 'flex';
    btn.setAttribute('aria-expanded', !open);
  });
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => { menu.style.display = 'none'; });
  });
}

// ─── Animaciones entrada ──────────────────────────────────────────────────────
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
}

// ─── Smooth scroll ────────────────────────────────────────────────────────────
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ─── Formulario de contacto ───────────────────────────────────────────────────
function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const lang    = window.currentLang || 'es';
    const btn     = document.getElementById('contact-submit-btn');
    const name    = document.getElementById('c-name').value.trim();
    const email   = document.getElementById('c-email').value.trim();
    const message = document.getElementById('c-message').value.trim();
    if (!name || !email || !message) return;

    btn.disabled    = true;
    btn.textContent = t('contact.submitting');

    // Guardar en Firebase
    await db.ref('contacts').push({ name, email, message, lang, createdAt: Date.now() });

    // Enviar emails
    try {
      await fetch(`${API_BASE}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', data: { name, email, message, lang } })
      });
      showMsg('contact-msg', 'success', t('contact.successMsg'));
      form.reset();
    } catch (err) {
      showMsg('contact-msg', 'error', t('contact.errorMsg'));
    } finally {
      btn.disabled    = false;
      btn.textContent = t('contact.submitBtn');
    }
  });
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
function setupWhatsApp() {
  const btn = document.getElementById('whatsapp-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      window.open('https://wa.me/34697911679', '_blank');
    });
  }
  // Floating button
  const fab = document.getElementById('whatsapp-fab');
  if (fab) {
    fab.addEventListener('click', () => {
      window.open('https://wa.me/34697911679', '_blank');
    });
  }
}

// ─── Utilidad ─────────────────────────────────────────────────────────────────
function showMsg(containerId, type, msg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `form-msg ${type}`;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function scrollToBooking(modality) {
  selectedModality = modality;
  const btn = document.querySelector(`.modality-btn[data-modality="${modality}"]`);
  if (btn) {
    document.querySelectorAll('.modality-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────
function toggleFaq(btn) {
  const isOpen = btn.getAttribute('aria-expanded') === 'true';
  // Close all
  document.querySelectorAll('.faq-q').forEach(b => {
    b.setAttribute('aria-expanded', 'false');
    b.nextElementSibling?.classList.remove('open');
  });
  // Open clicked if it was closed
  if (!isOpen) {
    btn.setAttribute('aria-expanded', 'true');
    btn.nextElementSibling?.classList.add('open');
  }
}