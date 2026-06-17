/* FlowMaster Pro — Animations & Interactions */

/* ── Navbar scroll effect ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Mobile menu ── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

/* ── Scroll reveal ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── Animated counters ── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 2000;
  const step = 30;
  const increment = target / (duration / step);
  let current = 0;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current).toLocaleString();
  }, step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('[data-target]').forEach(animateCounter);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const statsEl = document.querySelector('.hero-stats');
if (statsEl) counterObserver.observe(statsEl);

/* ── Active nav link on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

/* ── Smooth scroll for all anchor links ── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ── Contact form ── */
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

form.addEventListener('submit', e => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  const btnText = btn.querySelector('.btn-text');
  const btnSpinner = btn.querySelector('.btn-spinner');

  btn.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline';

  // Simulate async submit
  setTimeout(() => {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    form.reset();
    formSuccess.classList.add('visible');
    formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1800);
});

/* ── Parallax hero background elements ── */
document.addEventListener('mousemove', e => {
  const { innerWidth, innerHeight } = window;
  const x = (e.clientX / innerWidth - 0.5) * 20;
  const y = (e.clientY / innerHeight - 0.5) * 20;
  const drops = document.querySelectorAll('.water-drop');
  drops.forEach((drop, i) => {
    const factor = (i + 1) * 0.4;
    drop.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
  });
});

/* ── Cursor ripple on click ── */
document.addEventListener('click', e => {
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(30,64,175,0.15);
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
    animation: rippleOut 0.6s ease-out forwards;
  `;
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

/* Inject ripple keyframe */
const style = document.createElement('style');
style.textContent = `
  @keyframes rippleOut {
    to { width: 120px; height: 120px; opacity: 0; }
  }
  .nav-links a.active {
    color: var(--accent-light) !important;
  }
`;
document.head.appendChild(style);
