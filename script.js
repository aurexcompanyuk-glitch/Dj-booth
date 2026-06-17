/* ═══════════════════════════════════════════════════
   FlowMaster Pro — GSAP + Three.js Cinematic Animations
   ═══════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ─── Lenis smooth scroll ─── */
const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ════════════════════════════════════════════════════
   THREE.JS — HERO CANVAS (fluid wave background)
   ════════════════════════════════════════════════════ */
(function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const vertShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;
  const fragShader = `
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float wave(vec2 uv, float freq, float speed, float amp) {
      return sin(uv.x * freq + uTime * speed) * amp;
    }

    void main() {
      vec2 uv = vUv;
      uv.x *= uResolution.x / uResolution.y;

      float w1 = wave(uv, 4.0, 0.4, 0.05);
      float w2 = wave(uv, 6.5, 0.6, 0.03);
      float w3 = wave(uv, 9.0, 0.3, 0.02);
      float wSum = w1 + w2 + w3;

      float line1 = smoothstep(0.003, 0.0, abs(uv.y - 0.3 + wSum));
      float line2 = smoothstep(0.003, 0.0, abs(uv.y - 0.5 + wSum * 1.3));
      float line3 = smoothstep(0.003, 0.0, abs(uv.y - 0.7 + wSum * 0.8));

      vec3 col1 = vec3(0.118, 0.251, 0.686); // blue
      vec3 col2 = vec3(0.918, 0.345, 0.047); // orange
      vec3 bg   = vec3(0.024, 0.035, 0.059); // near-black

      vec3 col = bg;
      col = mix(col, col1, line1 * 0.6);
      col = mix(col, col2, line2 * 0.5);
      col = mix(col, col1 * 0.6, line3 * 0.4);

      // Radial vignette
      float dist = length(vUv - 0.5) * 1.4;
      col = mix(col, bg, smoothstep(0.5, 1.0, dist));

      // Subtle glow orb
      float orb = 1.0 - length(vUv - vec2(0.5, 0.45)) * 2.0;
      orb = clamp(orb, 0.0, 1.0);
      col += vec3(0.04, 0.06, 0.15) * orb * orb;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    vertexShader: vertShader,
    fragmentShader: fragShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    }
  });

  const geo = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geo, mat));

  let raf;
  function animate(t) {
    raf = requestAnimationFrame(animate);
    mat.uniforms.uTime.value = t * 0.001;
    renderer.render(scene, camera);
  }
  animate(0);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    mat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  });
})();

/* ════════════════════════════════════════════════════
   THREE.JS — CTA CANVAS (particle field)
   ════════════════════════════════════════════════════ */
(function initCtaCanvas() {
  const canvas = document.getElementById('ctaCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(1);

  const section = document.getElementById('contact');
  const W = section.offsetWidth, H = section.offsetHeight;
  renderer.setSize(W, H);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
  camera.position.z = 3;

  const count = 800;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({ color: 0xEA580C, size: 0.025, transparent: true, opacity: 0.6 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  function animate(t) {
    requestAnimationFrame(animate);
    points.rotation.y = t * 0.00008;
    points.rotation.x = t * 0.00004;
    renderer.render(scene, camera);
  }
  animate(0);
})();

/* ════════════════════════════════════════════════════
   LOADER
   ════════════════════════════════════════════════════ */
(function runLoader() {
  const loader    = document.getElementById('loader');
  const countEl   = document.getElementById('loaderCount');
  const fillEl    = document.getElementById('loaderFill');

  let count = 0;
  const interval = setInterval(() => {
    count += Math.floor(Math.random() * 8) + 2;
    if (count >= 100) count = 100;
    countEl.textContent = count;
    fillEl.style.width = count + '%';
    if (count === 100) {
      clearInterval(interval);
      setTimeout(() => {
        gsap.to(loader, {
          yPercent: -100,
          duration: 1,
          ease: 'power4.inOut',
          onComplete: () => { loader.style.display = 'none'; runHeroAnim(); }
        });
      }, 300);
    }
  }, 30);
})();

/* ════════════════════════════════════════════════════
   HERO ANIMATION
   ════════════════════════════════════════════════════ */
function runHeroAnim() {
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  tl.to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.8 })
    .to('.hero-title .word', {
      y: 0, duration: 1, stagger: 0.06, ease: 'power4.out'
    }, '-=0.4')
    .to('.hero-sub', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
    .to('.hero-actions', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
    .to('.hero-stats', { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
    .to('.hero-scroll-hint', { opacity: 1, duration: 0.8 }, '-=0.3');

  // Count up stats
  document.querySelectorAll('.hs-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    gsap.to(el, {
      duration: 2,
      ease: 'power2.out',
      delay: 1.5,
      onUpdate() {
        el.textContent = Math.floor(gsap.getProperty(el, '--n') || 0).toLocaleString();
      },
      '--n': target,
    });
    // simple fallback
    let cur = 0;
    const step = target / 60;
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      el.textContent = Math.floor(cur).toLocaleString();
    }, 33);
  });
}

/* ════════════════════════════════════════════════════
   NAVBAR
   ════════════════════════════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});
document.querySelectorAll('.mobile-menu a').forEach(a => {
  a.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open'));
});

/* ════════════════════════════════════════════════════
   CUSTOM CURSOR
   ════════════════════════════════════════════════════ */
const cursor   = document.getElementById('cursor');
const follower = document.getElementById('cursorFollower');
let mx = 0, my = 0, fx = 0, fy = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  gsap.to(cursor, { x: mx, y: my, duration: 0.05 });
});

gsap.ticker.add(() => {
  fx += (mx - fx) * 0.12;
  fy += (my - fy) * 0.12;
  gsap.set(follower, { x: fx, y: fy });
});

document.querySelectorAll('a, button, .magnetic, .svc-card, .wf, .rv-card').forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.classList.add('expand'); follower.classList.add('expand'); });
  el.addEventListener('mouseleave', () => { cursor.classList.remove('expand'); follower.classList.remove('expand'); });
});

/* ════════════════════════════════════════════════════
   MAGNETIC BUTTONS
   ════════════════════════════════════════════════════ */
document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, { x: dx * 0.3, y: dy * 0.3, duration: 0.4, ease: 'power2.out' });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' });
  });
});

/* ════════════════════════════════════════════════════
   SPLIT TEXT REVEALS (scroll)
   ════════════════════════════════════════════════════ */
document.querySelectorAll('.split-text').forEach(el => {
  // wrap each word
  const words = el.innerHTML.replace(/<br\s*\/?>/gi, '<br>').split(/(\s+|<br>)/);
  el.innerHTML = words.map(w => {
    if (w.match(/\s+/) || w === '<br>') return w;
    return `<span class="st-word" style="display:inline-block;overflow:hidden"><span class="st-inner" style="display:inline-block;transform:translateY(100%)">${w}</span></span>`;
  }).join('');

  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    onEnter: () => {
      gsap.to(el.querySelectorAll('.st-inner'), {
        y: 0, duration: 1, stagger: 0.04, ease: 'power4.out'
      });
    }
  });
});

/* ════════════════════════════════════════════════════
   SERVICES — HORIZONTAL DRAG SCROLL
   ════════════════════════════════════════════════════ */
(function initServicesScroll() {
  const track   = document.getElementById('servicesTrack');
  const fillEl  = document.getElementById('spFill');
  const labelEl = document.getElementById('spLabel');
  const cards   = track.querySelectorAll('.svc-card');
  const cardW   = 320 + 24; // card width + gap
  const total   = cards.length;
  let current   = 0;

  ScrollTrigger.create({
    trigger: '.services',
    start: 'top top',
    end: () => `+=${(total - 1) * cardW + 200}`,
    pin: true,
    scrub: 1,
    onUpdate(self) {
      const maxX = (total - 1) * cardW;
      const x = -self.progress * maxX;
      gsap.set(track, { x });

      const idx = Math.round(-x / cardW);
      current = Math.max(0, Math.min(total - 1, idx));
      fillEl.style.width = ((current + 1) / total * 100) + '%';
      labelEl.textContent = `0${current + 1} / 0${total}`;
    }
  });
})();

/* ════════════════════════════════════════════════════
   WHY US — PARALLAX
   ════════════════════════════════════════════════════ */
gsap.to('.why-bg-text', {
  yPercent: -30,
  ease: 'none',
  scrollTrigger: { trigger: '.why', scrub: 1 }
});

gsap.from('.trophy-card', {
  y: 80, opacity: 0, duration: 1, ease: 'power3.out',
  scrollTrigger: { trigger: '.why-right', start: 'top 75%' }
});

document.querySelectorAll('.float-pill').forEach((pill, i) => {
  gsap.from(pill, {
    y: 40, opacity: 0, duration: 0.8, delay: i * 0.15, ease: 'power3.out',
    scrollTrigger: { trigger: '.why-right', start: 'top 70%' }
  });
  gsap.to(pill, {
    y: i === 0 ? -20 : 20,
    ease: 'sine.inOut',
    duration: 3 + i,
    repeat: -1,
    yoyo: true
  });
});

document.querySelectorAll('.wf').forEach((el, i) => {
  gsap.from(el, {
    x: -40, opacity: 0, duration: 0.7, delay: i * 0.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%' }
  });
});

/* ════════════════════════════════════════════════════
   PROCESS — PINNED STEP REVEAL
   ════════════════════════════════════════════════════ */
(function initProcess() {
  const panels   = document.querySelectorAll('.process-panel');
  const pps      = document.querySelectorAll('.pps');
  const ppsLine  = document.getElementById('ppsLine');
  const steps    = panels.length;

  if (!panels.length) return;

  // show first panel
  panels[0].classList.add('active');
  pps[0] && pps[0].classList.add('active');

  ScrollTrigger.create({
    trigger: '.process',
    start: 'top top',
    end: () => `+=${steps * window.innerHeight}`,
    pin: true,
    scrub: false,
    snap: 1 / (steps - 1),
    onUpdate(self) {
      const idx = Math.min(steps - 1, Math.floor(self.progress * steps));
      panels.forEach((p, i) => p.classList.toggle('active', i === idx));
      pps.forEach((p, i) => p.classList.toggle('active', i <= idx));
      if (ppsLine) ppsLine.style.height = (idx / (steps - 1) * 100) + '%';
    }
  });
})();

/* ════════════════════════════════════════════════════
   REVIEWS — STAGGER IN
   ════════════════════════════════════════════════════ */
gsap.from('.rv-card', {
  y: 60, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
  scrollTrigger: { trigger: '.reviews-grid', start: 'top 80%' }
});

/* ════════════════════════════════════════════════════
   CTA SECTION
   ════════════════════════════════════════════════════ */
gsap.from('.cta-phone, .cta-form', {
  y: 40, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'power3.out',
  scrollTrigger: { trigger: '.cta-two-col', start: 'top 80%' }
});

/* ════════════════════════════════════════════════════
   CONTACT FORM
   ════════════════════════════════════════════════════ */
document.getElementById('ctaForm').addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const lbl = btn.querySelector('.btn-label');
  lbl.textContent = 'Sending…';
  btn.disabled = true;
  setTimeout(() => {
    document.getElementById('cfSuccess').classList.add('show');
    e.target.reset();
    btn.disabled = false;
    lbl.textContent = 'Send Free Quote Request';
  }, 1800);
});

/* ════════════════════════════════════════════════════
   SMOOTH ANCHOR SCROLL
   ════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -80, duration: 1.4 });
  });
});

/* ════════════════════════════════════════════════════
   PARALLAX CARDS (mousemove)
   ════════════════════════════════════════════════════ */
document.querySelectorAll('.parallax-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const dy = (e.clientY - rect.top - rect.height / 2) / rect.height;
    gsap.to(card, { rotateY: dx * 12, rotateX: -dy * 12, transformPerspective: 800, duration: 0.4, ease: 'power2.out' });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'elastic.out(1,0.5)' });
  });
});

/* ════════════════════════════════════════════════════
   MARQUEE — pause on hover
   ════════════════════════════════════════════════════ */
const marqueeEl = document.querySelector('.marquee-inner');
marqueeEl.addEventListener('mouseenter', () => marqueeEl.style.animationPlayState = 'paused');
marqueeEl.addEventListener('mouseleave', () => marqueeEl.style.animationPlayState = 'running');
