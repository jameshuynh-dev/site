// little glowing stars that follow the mouse, plus a small burst when a button is pressed.
// the trail only runs for a real mouse; touch screens just get the burst
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  if (still.matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'trail';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');

  // saturated enough to glow on the cream card and still read on the dusk sky
  const colors = ['#e9b54a', '#f2c766', '#b39ce3', '#e99aab', '#d9a441', '#9fb8f0'];
  const MAX = 160;
  let parts = [];
  let w = 0, h = 0, dpr = 1;
  let raf = 0, last = 0;
  let px = null, py = null;
  let carry = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function spawn(x, y, opts = {}) {
    if (parts.length >= MAX) parts.shift();
    const burst = !!opts.burst;
    const angle = burst ? opts.angle : rand(0, Math.PI * 2);
    const speed = burst ? rand(90, 210) : rand(6, 26);
    parts.push({
      x, y,
      vx: Math.cos(angle) * speed + (opts.vx || 0) * 0.08,
      vy: Math.sin(angle) * speed + (opts.vy || 0) * 0.08,
      life: 0,
      max: burst ? rand(0.55, 0.9) : rand(0.6, 1.15),
      size: burst ? rand(4, 8) : rand(2.8, 6.5),
      spin: rand(-3, 3),
      rot: rand(0, Math.PI),
      color: colors[(Math.random() * colors.length) | 0],
      dot: !burst && Math.random() < 0.35,
    });
    wake();
  }

  function shape(dot, s) {
    ctx.beginPath();
    if (dot) { ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2); return; }
    const t = s * 0.16;
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(t, -t, s, 0);
    ctx.quadraticCurveTo(t, t, 0, s);
    ctx.quadraticCurveTo(-t, t, -s, 0);
    ctx.quadraticCurveTo(-t, -t, 0, -s);
  }

  function star(p, scale, alpha) {
    const s = p.size * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = s * 2.6;
    ctx.fillStyle = p.color;
    shape(p.dot, s);
    ctx.fill();
    // a pale core so each star looks lit from inside
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = '#fffaf0';
    shape(p.dot, s * 0.45);
    ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    parts = parts.filter((p) => (p.life += dt) < p.max);
    for (const p of parts) {
      const k = p.life / p.max;
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 26 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      const grow = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      star(p, 0.4 + grow * 0.8, Math.min(1, grow * 1.3));
    }

    if (parts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, w, h); }
  }

  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !mouse.matches) return;
    const x = e.clientX, y = e.clientY;
    if (px === null) { px = x; py = y; return; }
    const dx = x - px, dy = y - py;
    const dist = Math.hypot(dx, dy);
    carry += dist;
    // one star every ~14px of travel, spread along the path so fast flicks stay smooth
    const step = 14;
    let n = 0;
    while (carry >= step && n < 6) {
      carry -= step;
      const f = 1 - carry / Math.max(dist, 1);
      spawn(px + dx * f + rand(-3, 3), py + dy * f + rand(-3, 3), { vx: dx * 60, vy: dy * 60 });
      n++;
    }
    px = x; py = y;
  }, { passive: true });

  document.addEventListener('mouseleave', () => { px = py = null; });

  document.addEventListener('pointerdown', (e) => {
    const hit = e.target.closest('.pill, .btn, .round, .chip, .shot-thumb, [data-burst]');
    if (!hit) return;
    const n = 12;
    for (let i = 0; i < n; i++) {
      spawn(e.clientX, e.clientY, { burst: true, angle: (i / n) * Math.PI * 2 + rand(-0.2, 0.2) });
    }
  });

  addEventListener('resize', resize);
  resize();
})();
