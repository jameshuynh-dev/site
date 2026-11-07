// the night sky behind the card: orbit rings around an off-screen center,
// stars slowly turning along them, a few big sparkles and the odd shooting star
(() => {
  const canvas = document.querySelector('.sky-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 700px)');

  let w = 0, h = 0, dpr = 1;
  let cx = 0, cy = 0;
  let rings = null;
  let stars = [];
  let sparkles = [];
  let shooting = [];
  let nextShot = 0;
  let raf = 0;
  let last = 0;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  const rand = (a, b) => a + Math.random() * (b - a);

  function drawRings() {
    rings = document.createElement('canvas');
    rings.width = canvas.width;
    rings.height = canvas.height;
    const r = rings.getContext('2d');
    r.scale(dpr, dpr);
    const reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 80;
    for (let rad = 70, i = 0; rad < reach; rad += 34 + i * 1.6, i++) {
      r.beginPath();
      r.arc(cx, cy, rad, 0, Math.PI * 2);
      r.strokeStyle = `rgba(255, 250, 240, ${0.05 + (i % 3 === 0 ? 0.06 : 0.025)})`;
      r.lineWidth = i % 4 === 0 ? 1.4 : 0.8;
      r.stroke();
    }
  }

  function seed() {
    const count = Math.round((w * h) / (small.matches ? 5200 : 3600));
    const reach = Math.hypot(w, h);
    stars = Array.from({ length: count }, () => ({
      r: Math.sqrt(Math.random()) * reach,
      a: rand(0, Math.PI * 2),
      size: Math.random() < 0.08 ? rand(1.2, 2) : rand(0.35, 1.1),
      tw: rand(0, Math.PI * 2),
      speed: rand(0.6, 2.2),
      warm: Math.random() < 0.3,
    }));
    sparkles = Array.from({ length: small.matches ? 3 : 6 }, (_, i) => ({
      x: rand(0.04, 0.96), y: rand(0.05, 0.95),
      size: rand(10, i === 0 ? 34 : 22),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.25, 0.6),
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    cx = w * (small.matches ? 0.05 : 0.14);
    cy = h * 0.44;
    drawRings();
    seed();
  }

  function sparkle(x, y, s, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.9);
    g.addColorStop(0, 'rgba(255, 244, 214, 0.9)');
    g.addColorStop(1, 'rgba(255, 244, 214, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    const t = s * 0.07;
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(t, -t, s * 0.7, 0);
    ctx.quadraticCurveTo(t, t, 0, s);
    ctx.quadraticCurveTo(-t, t, -s * 0.7, 0);
    ctx.quadraticCurveTo(-t, -t, 0, -s);
    ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05) || 0;
    last = now;

    tilt.x += (tilt.tx - tilt.x) * 0.04;
    tilt.y += (tilt.ty - tilt.y) * 0.04;
    const ox = tilt.x * 14, oy = tilt.y * 10;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(rings, ox * dpr * 0.5, oy * dpr * 0.5);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // the whole field turns around the ring center, like a long exposure
    const spin = dt * 0.006;
    for (const s of stars) {
      s.a += spin * (1 + 120 / (s.r + 120));
      s.tw += dt * s.speed;
      const x = cx + Math.cos(s.a) * s.r + ox;
      const y = cy + Math.sin(s.a) * s.r + oy;
      if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.tw));
      ctx.fillStyle = s.warm ? `rgba(255, 232, 176, ${a})` : `rgba(255, 252, 245, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const sp of sparkles) {
      sp.phase += dt * sp.speed;
      const pulse = 0.55 + 0.45 * Math.sin(sp.phase);
      sparkle(sp.x * w + ox * 1.6, sp.y * h + oy * 1.6, sp.size * (0.8 + pulse * 0.25), 0.35 + pulse * 0.6);
    }

    if (now > nextShot) {
      const fromLeft = Math.random() < 0.5;
      shooting.push({
        x: rand(w * 0.1, w * 0.9), y: rand(-20, h * 0.4),
        vx: (fromLeft ? 1 : -1) * rand(380, 560), vy: rand(220, 340),
        life: 0, max: rand(0.7, 1.1),
      });
      nextShot = now + rand(3500, 8000);
    }
    shooting = shooting.filter((s) => (s.life += dt) < s.max);
    for (const s of shooting) {
      const k = s.life / s.max;
      const x = s.x + s.vx * s.life, y = s.y + s.vy * s.life;
      const len = 0.12;
      const g = ctx.createLinearGradient(x, y, x - s.vx * len, y - s.vy * len);
      const a = Math.sin(k * Math.PI);
      g.addColorStop(0, `rgba(255, 250, 235, ${a})`);
      g.addColorStop(1, 'rgba(255, 250, 235, 0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - s.vx * len, y - s.vy * len);
      ctx.stroke();
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    cancelAnimationFrame(raf);
    if (document.hidden) return;
    last = performance.now();
    if (still.matches) {
      frame(last);
      cancelAnimationFrame(raf);
      return;
    }
    nextShot = last + 1800;
    raf = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); start(); }, 120);
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tilt.tx = e.clientX / w - 0.5;
    tilt.ty = e.clientY / h - 0.5;
  }, { passive: true });
  document.addEventListener('visibilitychange', start);
  still.addEventListener('change', start);

  resize();
  start();
})();
