// ============================================================
// main.js — Navegación, animaciones, contacto, FAQ
// Compatible con páginas separadas es/ y en/
// SIN dependencia de t() ni i18n.js
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setupNavScroll();
  setupMobileMenu();
  setupScrollAnimations();
  setupContactForm();
  setupSmoothScroll();

  if (typeof initBooking === 'function') initBooking();
  if (typeof cancelBookingFromLink === 'function') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) cancelBookingFromLink();
  }
});

function setupNavScroll() {
  const nav  = document.getElementById('main-nav');
  const menu = document.getElementById('mobile-menu');
  if (!nav) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 80) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
    if (y > lastY + 5 && y > 200) {
      nav.classList.add('hidden');
      // Close mobile menu when nav hides
      if (menu) menu.style.display = 'none';
    } else if (y < lastY - 5) {
      nav.classList.remove('hidden');
    }
    lastY = y;
  }, { passive: true });
}

function setupMobileMenu() {
  const btn  = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.style.display === 'flex';
    menu.style.display = open ? 'none' : 'flex';
    btn.setAttribute('aria-expanded', String(!open));
  });
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => { menu.style.display = 'none'; });
  });
}

function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));

  // Mostrar elementos ya visibles al cargar
  setTimeout(() => {
    document.querySelectorAll('.animate-in:not(.visible)').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('visible');
        observer.unobserve(el);
      }
    });
  }, 100);
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navH = document.getElementById('main-nav')?.offsetHeight || 70;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
    });
  });
}

function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const lang = document.documentElement.lang || 'es';
  const isES = lang === 'es';
  const msgs = {
    submitting: isES ? 'Enviando...' : 'Sending...',
    success:    isES ? '✓ Mensaje enviado. Te respondo en menos de 24 horas.' : '✓ Message sent. I\'ll reply within 24 hours.',
    error:      isES ? 'Error al enviar. Inténtalo de nuevo.' : 'Error sending. Please try again.',
    submit:     isES ? 'Enviar mensaje' : 'Send message',
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn     = document.getElementById('contact-submit-btn');
    const name    = document.getElementById('c-name')?.value.trim();
    const email   = document.getElementById('c-email')?.value.trim();
    const message = document.getElementById('c-message')?.value.trim();
    if (!name || !email || !message) return;
    btn.disabled = true; btn.textContent = msgs.submitting;
    try {
      if (typeof db !== 'undefined') await db.ref('contacts').push({ name, email, message, lang, createdAt: Date.now() });
      await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', data: { name, email, message, lang } }) });
      showMsg('contact-msg', 'success', msgs.success);
      form.reset();
    } catch (err) {
      showMsg('contact-msg', 'error', msgs.error);
    } finally {
      btn.disabled = false; btn.textContent = msgs.submit;
    }
  });
}

function showMsg(containerId, type, msg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `form-msg ${type}`; el.textContent = msg; el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function scrollToBooking(modality) {
  if (typeof selectedModality !== 'undefined') selectedModality = modality;
  const btn = document.querySelector(`.modality-btn[data-modality="${modality}"]`);
  if (btn) { document.querySelectorAll('.modality-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  const section = document.getElementById('reservar');
  if (!section) return;
  const navH = document.getElementById('main-nav')?.offsetHeight || 70;
  window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
}

function toggleFaq(btn) {
  const isOpen = btn.getAttribute('aria-expanded') === 'true';
  document.querySelectorAll('.faq-q').forEach(b => { b.setAttribute('aria-expanded', 'false'); b.nextElementSibling?.classList.remove('open'); });
  if (!isOpen) { btn.setAttribute('aria-expanded', 'true'); btn.nextElementSibling?.classList.add('open'); }
}