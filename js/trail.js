// a soft shooting-star streak that follows the mouse: a pale core with a
// lavender glow, thinning and fading toward the tail. mouse only, no touch
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  if (still.matches || !mouse.matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'trail';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');

  const LIFE = 320; // ms a point stays in the tail
  let pts = [];
  let w = 0, h = 0, dpr = 1;
  let raf = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function frame(now) {
    pts = pts.filter((p) => now - p.t < LIFE);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (pts.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // two passes: a wide soft glow, then the bright core on top
      for (const pass of [0, 1]) {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const k = 1 - (now - b.t) / LIFE; // 1 at the head, 0 at the tail
          if (k <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          if (pass === 0) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(176, 160, 214, ${0.4 * k})`;
            ctx.lineWidth = 10 * k;
          } else {
            ctx.shadowColor = 'rgba(255, 236, 200, 0.9)';
            ctx.shadowBlur = 10 * k;
            ctx.strokeStyle = `rgba(255, 253, 248, ${0.95 * k})`;
            ctx.lineWidth = 2.6 * k + 0.4;
          }
          ctx.stroke();
        }
      }
      // the bright head
      const head = pts[pts.length - 1];
      const k = 1 - (now - head.t) / LIFE;
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
      g.addColorStop(0, `rgba(255, 252, 245, ${0.95 * k})`);
      g.addColorStop(0.4, `rgba(220, 208, 240, ${0.45 * k})`);
      g.addColorStop(1, 'rgba(220, 208, 240, 0)');
      ctx.shadowBlur = 0;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    if (pts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, w, h); }
  }

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (pts.length > 80) pts.shift();
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });

  document.addEventListener('mouseleave', () => { pts = []; });
  addEventListener('resize', resize);
  resize();
})();
