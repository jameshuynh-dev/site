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
  // the views share ids with their hashes, so stop the browser jumping down to one on load
  // a shared link like /#projects skips the phone title screen and opens on the card
  const landing = () => {
    const intro = document.querySelector('.sky-intro');
    return intro && intro.offsetHeight ? intro.offsetHeight : 0;
  };
  if (location.hash) {
    history.scrollRestoration = 'manual';
    scrollTo(0, landing());
    addEventListener('load', () => requestAnimationFrame(() => scrollTo(0, landing())), { once: true });
  }
  show(fromHash(), { instant: true });
  document.fonts?.ready.then(() => placeBead(pills.find((p) => p.hasAttribute('aria-current')), true));
})();

// project screenshots: thumbnails swap the big frame, the big frame opens a lightbox
document.querySelectorAll('[data-gallery]').forEach((gallery) => {
  const main = gallery.querySelector('.shot-main');
  const thumbs = [...gallery.querySelectorAll('.shot-thumb')];
  const box = document.querySelector('[data-lightbox]');

  const markMissing = (img) => {
    const hold = document.createElement('span');
    hold.className = 'shot-missing';
    hold.textContent = 'screenshot coming soon';
    img.replaceWith(hold);
  };
  const watch = (img) => {
    if (img.complete && !img.naturalWidth) markMissing(img);
    else img.addEventListener('error', () => markMissing(img), { once: true });
  };
  gallery.querySelectorAll('img').forEach(watch);

  thumbs.forEach((t) => {
    t.addEventListener('click', () => {
      const img = t.querySelector('img');
      thumbs.forEach((o) => o.setAttribute('aria-pressed', o === t));
      if (!img || !main.querySelector('img')) return;
      main.classList.add('is-swapping');
      setTimeout(() => {
        const m = main.querySelector('img');
        m.src = img.src;
        m.alt = img.alt;
        main.classList.remove('is-swapping');
      }, 220);
    });
  });

  main.addEventListener('click', () => {
    const m = main.querySelector('img');
    if (!m || !box || !box.showModal) return;
    const big = box.querySelector('img');
    big.src = m.src;
    big.alt = m.alt;
    box.showModal();
  });
});

(() => {
  const box = document.querySelector('[data-lightbox]');
  box?.querySelector('.lightbox-close').addEventListener('click', () => box.close());
  box?.addEventListener('click', (e) => { if (e.target === box) box.close(); });
})();

// the print stylesheet hides everything but the resume sheet
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());

// phone title screen: the name drifts up and fades as the card scrolls in
(() => {
  const intro = document.querySelector('.sky-intro');
  if (!intro) return;
  document.querySelector('[data-to-card]')?.addEventListener('click', (e) => {
    e.preventDefault();
    scrollTo({ top: intro.offsetHeight, behavior: 'smooth' });
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const h = intro.offsetHeight;
    if (!h) return;
    const k = Math.min(1, Math.max(0, scrollY / (h * 0.7)));
    intro.style.opacity = String(1 - k);
    intro.style.transform = `translateY(${(scrollY * 0.35).toFixed(1)}px)`;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();
