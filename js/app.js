// one page, three views. the pills swap what's showing with a soft fade
// instead of navigating, and the hash keeps back/forward and shared links working
(() => {
  const views = [...document.querySelectorAll('[data-view-panel]')];
  const pills = [...document.querySelectorAll('.pill[data-view]')];
  const box = document.querySelector('.views');
  const nav = document.querySelector('.pills');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  if (!views.length || !box) return;

  const names = views.map((v) => v.dataset.viewPanel);
  const titles = { home: 'James Huynh', projects: 'Projects · James Huynh', resume: 'Resume · James Huynh' };
  const OUT = 260;

  views.forEach((v) => {
    v.querySelectorAll('[data-rise]').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 10)));
  });

  // a soft bead that slides under whichever pill is active
  const bead = document.createElement('span');
  bead.className = 'pill-bead';
  bead.setAttribute('aria-hidden', 'true');
  nav.prepend(bead);
  nav.classList.add('has-bead');

  const placeBead = (pill, instant) => {
    if (!pill) return;
    if (instant) bead.style.transition = 'none';
    bead.style.width = pill.offsetWidth + 'px';
    bead.style.height = pill.offsetHeight + 'px';
    bead.style.transform = `translate(${pill.offsetLeft}px, ${pill.offsetTop}px)`;
    if (instant) { bead.offsetWidth; bead.style.transition = ''; }
  };

  let current = null;
  let busy = null;

  const fromHash = () => {
    const h = location.hash.slice(1);
    return names.includes(h) ? h : 'home';
  };

  function reveal(view) {
    view.hidden = false;
    view.classList.add('is-active', 'is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => view.classList.remove('is-entering')));
  }

  function show(name, { push = false, instant = false } = {}) {
    const next = views.find((v) => v.dataset.viewPanel === name);
    if (!next || next === current) return;
    const prev = current;
    current = next;

    pills.forEach((p) => {
      if (p.dataset.view === name) p.setAttribute('aria-current', 'page');
      else p.removeAttribute('aria-current');
    });
    placeBead(pills.find((p) => p.dataset.view === name), instant);
    document.title = titles[name] || titles.home;
    if (push) history.pushState({ view: name }, '', '#' + name);

    clearTimeout(busy);
    views.forEach((v) => v.classList.remove('is-leaving'));

    if (!prev || instant || still.matches) {
      views.forEach((v) => { if (v !== next) { v.hidden = true; v.classList.remove('is-active'); } });
      box.style.height = '';
      reveal(next);
      return;
    }

    // hold the card's height while the old view fades out, then ease to the new height
    const from = box.offsetHeight;
    box.style.height = from + 'px';
    prev.classList.add('is-leaving');

    busy = setTimeout(() => {
      prev.hidden = true;
      prev.classList.remove('is-active', 'is-leaving');
      reveal(next);

      box.style.height = 'auto';
      const to = box.offsetHeight;
      box.style.height = from + 'px';
      box.offsetHeight;
      box.style.height = to + 'px';

      const done = (e) => {
        if (e && e.target !== box) return;
        box.style.height = '';
        box.removeEventListener('transitionend', done);
      };
      box.addEventListener('transitionend', done);
      setTimeout(done, 700);

      const top = nav.getBoundingClientRect().top;
      if (top < 0) scrollTo({ top: scrollY + top - 16, behavior: 'smooth' });
    }, OUT);
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-view], [data-go]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    const name = link.dataset.view || link.dataset.go;
    if (!names.includes(name)) return;
    e.preventDefault();
    show(name, { push: name !== fromHash() || !location.hash });
    if (link.dataset.go) pills.find((p) => p.dataset.view === name)?.focus({ preventScroll: true });
  });

  addEventListener('popstate', () => show(fromHash()));
  addEventListener('hashchange', () => show(fromHash()));
  addEventListener('resize', () => placeBead(pills.find((p) => p.hasAttribute('aria-current')), true));

  views.forEach((v) => { v.hidden = true; });
  if (location.hash) { history.scrollRestoration = 'manual'; scrollTo(0, 0); }
  show(fromHash(), { instant: true });
  document.fonts?.ready.then(() => placeBead(pills.find((p) => p.hasAttribute('aria-current')), true));
})();

// the planet charms: each one is a damped pendulum. a breeze keeps them alive,
// the mouse can brush them, and a click gives them a proper swing
(() => {
  const charms = [...document.querySelectorAll('.charm')];
  if (!charms.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const state = charms.map((el, i) => ({
    el,
    a: 0,
    v: 0,
    len: parseFloat(getComputedStyle(el).getPropertyValue('--len')) || 60,
    phase: i * 1.7,
  }));

  let mx = -1e4, my = -1e4, mvx = 0;
  addEventListener('pointermove', (e) => {
    mvx = e.movementX || 0;
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  charms.forEach((el, i) => {
    el.addEventListener('pointerdown', (e) => {
      const r = el.getBoundingClientRect();
      const side = e.clientX < r.left + r.width / 2 ? 1 : -1;
      state[i].v += side * (5 + Math.random() * 3);
    });
  });

  let last = performance.now();
  let t = 0;
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.04);
    last = now;
    t += dt;
    for (const s of state) {
      const g = 9.8 / (s.len / 30);
      const breeze = Math.sin(t * 0.9 + s.phase) * 0.06 + Math.sin(t * 2.3 + s.phase * 2) * 0.025;
      let push = 0;
      const r = s.el.getBoundingClientRect();
      const bx = r.left + r.width / 2;
      const by = r.bottom - r.width / 2;
      const d = Math.hypot(mx - bx, my - by);
      if (d < r.width) push = mvx * 0.06 * (1 - d / r.width);
      s.v += (-g * Math.sin(s.a) - s.v * 1.6 + breeze + push * 60 * dt) * dt * 6;
      s.v = Math.max(-9, Math.min(9, s.v));
      s.a += s.v * dt;
      s.a = Math.max(-1.1, Math.min(1.1, s.a));
      s.el.style.transform = `rotate(${s.a}rad)`;
    }
    mvx *= 0.6;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// the sticker leans toward the mouse a little
(() => {
  const el = document.querySelector('[data-tilt]');
  if (!el || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateZ(0)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
})();
