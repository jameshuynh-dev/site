/* types out the "Dear visitor" letter on page load.
   text is already in the page (so layout never jumps) — each letter just fades in, in order. */
(() => {
  const root = document.documentElement;
  const letter = document.getElementById('about');
  const done = () => root.classList.remove('tw-pending');

  if (!letter || matchMedia('(prefers-reduced-motion: reduce)').matches) return done();

  const START = 450;        // ms before typing begins
  const PARA_PAUSE = 380;   // pause between paragraphs
  const speed = (p) =>
    p.classList.contains('dear') ? 75 :
    p.classList.contains('sign') ? 95 : 11;

  const chars = [];
  let t = START;

  letter.querySelectorAll(':scope > p').forEach((p, i) => {
    if (i > 0) t += PARA_PAUSE;
    const base = speed(p);
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { frag.append(' '); t += base; return; }
        for (const ch of tok) {
          const s = document.createElement('span');
          s.className = 'tw-c';
          s.textContent = ch;
          frag.append(s);
          t += base * (0.6 + Math.random() * 0.8);
          if (/[.,;!—]/.test(ch)) t += base > 30 ? 160 : 140 + Math.random() * 120;
          chars.push({ el: s, at: t });
        }
      });
      node.replaceWith(frag);
    });
  });

  // highlighter marks swipe in once their words are typed
  letter.querySelectorAll('.hl').forEach((hl) => {
    hl.classList.add('tw-wait');
    const last = hl.querySelectorAll('.tw-c');
    if (last.length) last[last.length - 1].dataset.hl = '1';
  });
  const reveal = (el) => {
    el.classList.add('on');
    if (el.dataset.hl) el.closest('.hl').classList.remove('tw-wait');
  };

  const caret = document.createElement('span');
  caret.className = 'tw-caret';
  caret.setAttribute('aria-hidden', 'true');

  done();

  let i = 0, t0 = null, raf;
  const finish = () => {
    cancelAnimationFrame(raf);
    for (; i < chars.length; i++) reveal(chars[i].el);
    if (chars.length) chars[chars.length - 1].el.after(caret);
    caret.classList.add('tw-caret-out');
    setTimeout(() => caret.remove(), 2600);
    letter.removeEventListener('click', finish);
  };

  const tick = (now) => {
    if (t0 === null) t0 = now;
    const elapsed = now - t0;
    let moved = false;
    while (i < chars.length && chars[i].at <= elapsed) { reveal(chars[i++].el); moved = true; }
    if (moved) chars[i - 1].el.after(caret);
    if (i < chars.length) raf = requestAnimationFrame(tick);
    else finish();
  };

  letter.addEventListener('click', finish); // tap the letter to skip ahead
  raf = requestAnimationFrame(tick);
})();
