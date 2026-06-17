/* ============================================================
   FlowMaster Pro — script.js
   All animations: pure Canvas API + vanilla JS, zero deps
   ============================================================ */

'use strict';

// ── Utility ─────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
function rand(min, max) { return Math.random() * (max - min) + min; }

// ── Loader ───────────────────────────────────────────────────
(function initLoader() {
  const loader = document.getElementById('loader');
  const fill = document.getElementById('loader-fill');
  const pct = document.getElementById('loader-percent');
  const canvas = document.getElementById('loader-canvas');
  if (!loader || !canvas) return;

  // Resize canvas
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  // Mini particle system for loader
  const dots = Array.from({length: 80}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -Math.random() * 0.6 - 0.2,
    opacity: Math.random() * 0.5 + 0.1
  }));

  let animId;
  function drawLoader() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.y < -5) { d.y = canvas.height + 5; d.x = Math.random() * canvas.width; }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(30,64,175,${d.opacity})`;
      ctx.fill();
    });
    animId = requestAnimationFrame(drawLoader);
  }
  drawLoader();

  let progress = 0;
  const duration = 2200;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    progress = Math.min(elapsed / duration, 1);
    const eased = easeOutExpo(progress);
    const val = Math.round(eased * 100);
    fill.style.width = val + '%';
    pct.textContent = val + '%';
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      setTimeout(() => {
        cancelAnimationFrame(animId);
        loader.classList.add('hiding');
        loader.addEventListener('transitionend', () => {
          loader.style.display = 'none';
          document.body.style.overflow = '';
        }, {once: true});
        // Trigger hero text reveal
        initHeroReveal();
      }, 200);
    }
  }
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(tick);
})();

// ── Hero Canvas: Waves + Particles ──────────────────────────
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Wave config
  const waves = [
    { amplitude: 55, frequency: 0.0018, speed: 0.0008, phase: 0, color: 'rgba(30,64,175,0.18)', yBase: 0.62 },
    { amplitude: 40, frequency: 0.0025, speed: 0.0012, phase: 1.2, color: 'rgba(30,64,175,0.12)', yBase: 0.70 },
    { amplitude: 50, frequency: 0.0014, speed: 0.0006, phase: 2.5, color: 'rgba(234,88,12,0.10)', yBase: 0.55 },
    { amplitude: 30, frequency: 0.0030, speed: 0.0015, phase: 0.7, color: 'rgba(234,88,12,0.07)', yBase: 0.65 },
    { amplitude: 65, frequency: 0.0010, speed: 0.0004, phase: 3.1, color: 'rgba(30,64,175,0.08)', yBase: 0.75 },
  ];

  // Glow waves (drawn with gradient fill)
  const glowWaves = [
    { amplitude: 70, frequency: 0.0016, speed: 0.001, phase: 0.5, colorStop1: 'rgba(30,64,175,0.25)', colorStop2: 'rgba(30,64,175,0)', yBase: 0.6 },
    { amplitude: 50, frequency: 0.002, speed: 0.0013, phase: 2.0, colorStop1: 'rgba(234,88,12,0.18)', colorStop2: 'rgba(234,88,12,0)', yBase: 0.68 },
  ];

  // Particles
  const PARTICLE_COUNT = 160;
  const particles = Array.from({length: PARTICLE_COUNT}, () => createParticle(true));

  function createParticle(randomY) {
    return {
      x: Math.random() * (W || 1440),
      y: randomY ? Math.random() * (H || 900) : (H || 900) + 10,
      vy: rand(0.15, 0.55),
      vx: rand(-0.12, 0.12),
      r: rand(0.8, 2.8),
      opacity: rand(0.08, 0.55),
      pulseSpeed: rand(0.008, 0.025),
      pulsePhase: rand(0, Math.PI * 2),
      hue: Math.random() < 0.6 ? 'blue' : 'orange'
    };
  }

  let t = 0;
  let animRunning = true;

  function drawWave(wave, timestamp) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 3) {
      const y = wave.yBase * H + Math.sin(x * wave.frequency + wave.phase + timestamp * wave.speed) * wave.amplitude
               + Math.sin(x * wave.frequency * 1.7 + wave.phase * 0.8 + timestamp * wave.speed * 0.7) * wave.amplitude * 0.4;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = wave.color;
    ctx.fill();
  }

  function drawGlowWave(wave, timestamp) {
    const yPoints = [];
    for (let x = 0; x <= W; x += 3) {
      const y = wave.yBase * H + Math.sin(x * wave.frequency + wave.phase + timestamp * wave.speed) * wave.amplitude
               + Math.sin(x * wave.frequency * 1.6 + wave.phase + timestamp * wave.speed * 0.8) * wave.amplitude * 0.35;
      yPoints.push({x, y});
    }
    // Find min Y for gradient top
    const minY = Math.min(...yPoints.map(p => p.y));
    const grad = ctx.createLinearGradient(0, minY, 0, H);
    grad.addColorStop(0, wave.colorStop1);
    grad.addColorStop(1, wave.colorStop2);

    ctx.beginPath();
    ctx.moveTo(0, H);
    yPoints.forEach(({x, y}, i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawParticles(timestamp) {
    particles.forEach(p => {
      p.y -= p.vy;
      p.x += p.vx;
      if (p.y < -10) { Object.assign(p, createParticle(false)); p.x = Math.random() * W; }
      if (p.x < -10 || p.x > W + 10) { p.x = Math.random() * W; p.y = H + 10; }
      const pulse = Math.sin(timestamp * p.pulseSpeed + p.pulsePhase) * 0.2 + 0.8;
      const alpha = p.opacity * pulse;
      const color = p.hue === 'blue' ? `rgba(30,64,175,${alpha})` : `rgba(234,88,12,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  function drawRadialGlow(timestamp) {
    // Animated glow orbs
    const orbs = [
      { cx: 0.2, cy: 0.5, r: 0.35, color: 'rgba(30,64,175,0.12)', speed: 0.0003, offset: 0 },
      { cx: 0.8, cy: 0.4, r: 0.28, color: 'rgba(234,88,12,0.10)', speed: 0.0004, offset: 1.5 },
      { cx: 0.5, cy: 0.7, r: 0.22, color: 'rgba(30,64,175,0.08)', speed: 0.0002, offset: 3 },
    ];
    orbs.forEach(orb => {
      const ox = Math.sin(timestamp * orb.speed + orb.offset) * W * 0.03;
      const oy = Math.cos(timestamp * orb.speed * 0.7 + orb.offset) * H * 0.03;
      const grd = ctx.createRadialGradient(orb.cx * W + ox, orb.cy * H + oy, 0, orb.cx * W + ox, orb.cy * H + oy, orb.r * W);
      grd.addColorStop(0, orb.color);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    });
  }

  function frame(timestamp) {
    if (!animRunning) return;
    ctx.clearRect(0, 0, W, H);

    // Dark background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#06090F');
    bg.addColorStop(1, '#0A1020');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawRadialGlow(timestamp);
    glowWaves.forEach(w => drawGlowWave(w, timestamp));
    waves.forEach(w => drawWave(w, timestamp));
    drawParticles(timestamp);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // Expose for Puppeteer test hook
  window.runHeroAnim = function() { animRunning = true; };

  return () => { animRunning = false; };
}
initHeroCanvas();

// ── Hero Text Reveal ─────────────────────────────────────────
function initHeroReveal() {
  const words = document.querySelectorAll('.word-reveal');
  words.forEach((word, i) => {
    setTimeout(() => {
      word.classList.add('visible');
    }, 150 + i * 130);
  });

  // Also trigger badge and sub immediately
  const heroRevealItems = document.querySelectorAll('#hero .reveal-item');
  heroRevealItems.forEach((el, i) => {
    setTimeout(() => {
      el.classList.add('visible');
    }, 400 + i * 200);
  });
}

// ── Custom Cursor ────────────────────────────────────────────
(function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0;
  let rx = 0, ry = 0;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  function animCursor() {
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(animCursor);
  }
  requestAnimationFrame(animCursor);

  document.querySelectorAll('a, button, .btn, .service-card, .review-card, .tilt-card, select, input, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => { dot.classList.add('hover'); ring.classList.add('hover'); });
    el.addEventListener('mouseleave', () => { dot.classList.remove('hover'); ring.classList.remove('hover'); });
  });
})();

// ── Smooth Scroll (lerp-based) ───────────────────────────────
(function initSmoothScroll() {
  let targetY = window.scrollY;
  let currentY = window.scrollY;
  let isScrolling = false;
  const LERP_FACTOR = 0.1;

  // We use a virtual scroll offset that drives nav, parallax, etc.
  // Native scroll remains for accessibility; we only apply lerp to "visual" scroll
  // driven elements. True lerp scroll conflicts with sticky, so we track scroll position
  // via a smoothed value for parallax/effects.
  window.addEventListener('scroll', () => {
    targetY = window.scrollY;
    if (!isScrolling) {
      isScrolling = true;
      updateScroll();
    }
  }, {passive: true});

  function updateScroll() {
    currentY = lerp(currentY, targetY, LERP_FACTOR);
    window.smoothScrollY = currentY;
    if (Math.abs(currentY - targetY) > 0.5) {
      requestAnimationFrame(updateScroll);
    } else {
      currentY = targetY;
      window.smoothScrollY = currentY;
      isScrolling = false;
    }
  }
  window.smoothScrollY = window.scrollY;
})();

// ── Nav: glass on scroll + burger ───────────────────────────
(function initNav() {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('nav-burger');
  const mobile = document.getElementById('nav-mobile');
  if (!nav) return;

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();

  if (burger && mobile) {
    burger.addEventListener('click', () => {
      const open = mobile.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      mobile.setAttribute('aria-hidden', !open);
    });
    // Close on link click
    mobile.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobile.classList.remove('open');
        burger.setAttribute('aria-expanded', false);
        mobile.setAttribute('aria-hidden', true);
      });
    });
  }

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({top, behavior: 'smooth'});
      }
    });
  });
})();

// ── Scroll Reveal (IntersectionObserver) ────────────────────
(function initScrollReveal() {
  const items = document.querySelectorAll('.reveal-item');
  if (!items.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Stagger siblings
        const parent = entry.target.closest('section, .container, .why-us-left, .why-us-right');
        const siblings = parent ? Array.from(parent.querySelectorAll('.reveal-item:not(.visible)')) : [];
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, idx > 0 && idx < 6 ? idx * 100 : 0);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  items.forEach(el => {
    // Skip hero items (handled by loader)
    if (!el.closest('#hero')) io.observe(el);
  });
})();

// ── Counter Animation ────────────────────────────────────────
(function initCounters() {
  const counters = document.querySelectorAll('.counter');
  if (!counters.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const isFixed = el.dataset.fixed;
      const duration = 1800;
      const start = performance.now();
      const isFloat = isFixed || String(target).includes('.');

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = easeOutExpo(progress);
        let val;
        if (isFixed) {
          val = (eased * parseFloat(isFixed)).toFixed(1);
        } else if (isFloat) {
          val = (eased * target).toFixed(1);
        } else {
          val = Math.round(eased * target);
          val = val >= 1000 ? val.toLocaleString() : val;
        }
        el.textContent = val + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => io.observe(c));
})();

// ── Horizontal Services Scroll ───────────────────────────────
(function initServicesScroll() {
  const outer = document.getElementById('services-outer');
  const track = document.getElementById('services-track');
  if (!outer || !track) return;

  let targetX = 0;
  let currentX = 0;
  let maxScroll = 0;

  function getMaxScroll() {
    return Math.max(0, track.scrollWidth - outer.clientWidth);
  }

  function update() {
    maxScroll = getMaxScroll();
    const section = document.getElementById('services');
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionHeight = section.offsetHeight;
    const windowH = window.innerHeight;

    // How far past section top we've scrolled
    const scrolled = -rect.top + windowH * 0.3;
    const progress = clamp(scrolled / (sectionHeight * 0.8), 0, 1);
    targetX = progress * maxScroll;
  }

  let lastX = -1;
  function animate() {
    currentX = lerp(currentX, targetX, 0.08);
    if (Math.abs(currentX - lastX) > 0.1) {
      track.style.transform = `translateX(${-currentX}px)`;
      lastX = currentX;
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener('scroll', update, {passive: true});
  window.addEventListener('resize', () => { maxScroll = getMaxScroll(); });
  update();
  animate();
})();

// ── Magnetic Buttons ─────────────────────────────────────────
(function initMagneticButtons() {
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    let animId;
    let ox = 0, oy = 0;

    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.35;
      const dy = (e.clientY - cy) * 0.35;
      cancelAnimationFrame(animId);
      function anim() {
        ox = lerp(ox, dx, 0.2);
        oy = lerp(oy, dy, 0.2);
        btn.style.transform = `translate(${ox}px, ${oy}px)`;
        if (Math.abs(ox - dx) > 0.1 || Math.abs(oy - dy) > 0.1) animId = requestAnimationFrame(anim);
      }
      anim();
    });

    btn.addEventListener('mouseleave', () => {
      cancelAnimationFrame(animId);
      function anim() {
        ox = lerp(ox, 0, 0.18);
        oy = lerp(oy, 0, 0.18);
        btn.style.transform = `translate(${ox}px, ${oy}px)`;
        if (Math.abs(ox) > 0.1 || Math.abs(oy) > 0.1) animId = requestAnimationFrame(anim);
        else btn.style.transform = '';
      }
      anim();
    });
  });
})();

// ── Parallax ─────────────────────────────────────────────────
(function initParallax() {
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  function update() {
    parallaxEls.forEach(el => {
      const factor = parseFloat(el.dataset.parallax);
      const rect = el.closest('section').getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = `translateY(${center * factor}px)`;
    });
  }
  window.addEventListener('scroll', update, {passive: true});
  update();
})();

// ── 3D Tilt Card ─────────────────────────────────────────────
(function initTiltCards() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    let rx = 0, ry = 0, tRx = 0, tRy = 0;
    let active = false;
    let animId;

    function anim() {
      rx = lerp(rx, tRx, 0.12);
      ry = lerp(ry, tRy, 0.12);
      card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (active || Math.abs(rx) > 0.05 || Math.abs(ry) > 0.05) animId = requestAnimationFrame(anim);
    }

    card.addEventListener('mousemove', e => {
      active = true;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      tRy = x * 15;
      tRx = -y * 12;
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(anim);
    });

    card.addEventListener('mouseleave', () => {
      active = false;
      tRx = 0; tRy = 0;
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(anim);
    });
  });
})();

// ── Pinned Process Section ───────────────────────────────────
(function initProcess() {
  const wrap = document.getElementById('process-sticky-wrap');
  const sticky = document.getElementById('process-sticky');
  const steps = document.querySelectorAll('.process-step');
  const progressFill = document.getElementById('process-progress-fill');
  const dots = document.querySelectorAll('.process-dot');
  if (!wrap || !steps.length) return;

  const TOTAL_STEPS = steps.length;
  let currentStep = 0;

  function setStep(idx) {
    if (idx === currentStep && steps[idx].classList.contains('active')) return;
    currentStep = idx;
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    if (progressFill) progressFill.style.width = ((idx + 1) / TOTAL_STEPS * 100) + '%';
  }

  function onScroll() {
    const rect = wrap.getBoundingClientRect();
    const wrapH = wrap.offsetHeight;
    const stickyH = window.innerHeight;
    // Progress 0 → 1 as sticky panel is scrolled through
    const scrolled = -rect.top;
    const scrollable = wrapH - stickyH;
    const progress = clamp(scrolled / scrollable, 0, 1);
    const stepIdx = Math.min(Math.floor(progress * TOTAL_STEPS), TOTAL_STEPS - 1);
    setStep(stepIdx);
  }

  window.addEventListener('scroll', onScroll, {passive: true});
  setStep(0);
})();

// ── Contact Canvas: Particle System ─────────────────────────
(function initContactCanvas() {
  const canvas = document.getElementById('contact-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  const PARTICLES = 120;
  const pts = Array.from({length: PARTICLES}, () => ({
    x: Math.random(),
    y: Math.random(),
    vy: rand(0.0001, 0.0004),
    vx: rand(-0.00012, 0.00012),
    r: rand(0.8, 2.5),
    opacity: rand(0.05, 0.35),
    hue: Math.random() < 0.55 ? 'blue' : 'orange'
  }));

  // Connection lines
  function drawConnections() {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = (pts[i].x - pts[j].x) * W;
        const dy = (pts[i].y - pts[j].y) * H;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 90) {
          const alpha = (1 - dist/90) * 0.08;
          ctx.beginPath();
          ctx.moveTo(pts[i].x * W, pts[i].y * H);
          ctx.lineTo(pts[j].x * W, pts[j].y * H);
          ctx.strokeStyle = `rgba(30,64,175,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    pts.forEach(p => {
      p.y -= p.vy; p.x += p.vx;
      if (p.y < -0.01) { p.y = 1.01; p.x = Math.random(); }
      if (p.x < -0.01) p.x = 1.01;
      if (p.x > 1.01) p.x = -0.01;
      const color = p.hue === 'blue' ? `rgba(30,64,175,${p.opacity})` : `rgba(234,88,12,${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    drawConnections();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

// ── Form Handling ─────────────────────────────────────────────
(function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const submitBtn = document.getElementById('form-submit');

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      input.style.borderColor = '';
      if (!input.value.trim()) {
        input.style.borderColor = 'rgba(239,68,68,0.8)';
        input.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';
        valid = false;
        input.addEventListener('input', () => {
          input.style.borderColor = '';
          input.style.boxShadow = '';
        }, {once: true});
      }
      if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        input.style.borderColor = 'rgba(239,68,68,0.8)';
        valid = false;
      }
    });
    if (!valid) return;

    // Simulate submission
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Sending...';

    const styleTag = document.createElement('style');
    styleTag.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(styleTag);

    setTimeout(() => {
      submitBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Request Sent!';
      submitBtn.style.background = '#16a34a';
      submitBtn.style.borderColor = '#16a34a';
      form.reset();
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Free Estimate Request <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/></svg>';
        submitBtn.style.background = '';
        submitBtn.style.borderColor = '';
      }, 4000);
    }, 1600);
  });
})();

// ── Service Card Glow on Hover ───────────────────────────────
(function initCardGlow() {
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      const glow = card.querySelector('.service-card-glow');
      if (glow) {
        glow.style.left = (x - 70) + 'px';
        glow.style.top = (y - 70) + 'px';
        glow.style.position = 'absolute';
      }
    });
  });
})();

// ── Review Card subtle float animation ───────────────────────
(function initReviewCards() {
  document.querySelectorAll('.review-card').forEach((card, i) => {
    card.style.transitionDelay = (i * 60) + 'ms';
  });
})();

// ── Ensure hero anim fires immediately if loader skipped ─────
window.runHeroAnim = window.runHeroAnim || function() {
  initHeroReveal();
};

// ── Page fully loaded fallback ───────────────────────────────
window.addEventListener('load', () => {
  // Force reveal items that are already in viewport
  setTimeout(() => {
    document.querySelectorAll('.reveal-item:not(.visible)').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95) {
        el.classList.add('visible');
      }
    });
  }, 3000);
});
