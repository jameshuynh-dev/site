/* fades the "Dear visitor" letter in line by line on page load.
   words are measured into their visual lines, so it works at any screen width. */
(() => {
  const root = document.documentElement;
  const letter = document.getElementById('about');
  const done = () => root.classList.remove('fi-pending');

  if (!letter || matchMedia('(prefers-reduced-motion: reduce)').matches) return done();

  const START = 250;      // ms before the first line
  const LINE_GAP = 170;   // ms between lines
  const PARA_GAP = 140;   // extra pause between paragraphs

  const paras = [...letter.querySelectorAll(':scope > p')];
  const words = paras.map((p) => {
    const list = [];
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) return frag.append(' ');
        const w = document.createElement('span');
        w.className = 'fi-w';
        w.textContent = tok;
        frag.append(w);
        list.push(w);
      });
      node.replaceWith(frag);
    });
    return list;
  });

  let t = START;
  paras.forEach((p, pi) => {
    if (pi > 0) t += PARA_GAP;
    let lastTop = null;
    words[pi].forEach((w) => {
      const top = Math.round(w.getBoundingClientRect().top);
      if (lastTop !== null && Math.abs(top - lastTop) > 4) t += LINE_GAP;
      lastTop = top;
      w.style.animationDelay = t + 'ms';
    });
    t += LINE_GAP;
  });

  letter.querySelectorAll('.hl').forEach((hl) => {
    const ws = hl.querySelectorAll('.fi-w');
    if (!ws.length) return;
    hl.classList.add('fi-wait');
    const at = parseFloat(ws[ws.length - 1].style.animationDelay) + 500;
    setTimeout(() => hl.classList.remove('fi-wait'), at);
  });

  letter.classList.add('fi-run');
  done();
})();
