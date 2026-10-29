/* the skill strips: a tab list, arrow keys move between groups */
(() => {
  const tabs = [...document.querySelectorAll('.strips [role="tab"]')];
  if (!tabs.length) return;
  const strips = tabs[0].parentElement;
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
      else if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
  select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]);

  // the strips unfurl once, the first time the rail comes into view
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    strips.classList.add('is-in');
    setTimeout(() => strips.classList.add('is-settled'), 700);
    io.disconnect();
  }, { rootMargin: '0px 0px -15% 0px' });
  io.observe(strips);
})();

/* the air: domain-warped noise drifting upward, parted by the pointer's recent path */
(() => {
  const canvas = document.querySelector('.air-field');
  const zones = [...document.querySelectorAll('.air')];
  const toggle = document.querySelector('[data-air-toggle]');
  const gl = canvas && canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) { if (toggle) toggle.hidden = true; return; }

  // colours come from the tokens: paint each onto a 1px canvas and read it back
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  probe.canvas.width = probe.canvas.height = 1;
  const css = getComputedStyle(document.documentElement);
  const rgb = (name) => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = css.getPropertyValue(name).trim();
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  };

  const vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const fs = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 p;uniform float pa;uniform vec3 c0,c1,c2;
float h(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 q){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(q);q=q*2.03+vec2(1.7,9.2);a*=.5;}return s;}
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
void main(){
  vec2 uv=gl_FragCoord.xy/r;vec2 asp=vec2(r.x/r.y,1.);
  vec2 q=uv*asp*1.4;q.y-=t*.018;
  vec2 d=(uv-p)*asp;float part=pa*exp(-dot(d,d)*14.);
  q+=normalize(d+1e-4)*part*.4;
  vec2 w=vec2(fbm(q+vec2(0.,t*.012)),fbm(q+vec2(5.2,1.3)-vec2(0.,t*.009)));
  float veil=smoothstep(.42,.9,fbm(q+2.4*w));
  float amber=smoothstep(.5,.92,fbm(q*.7+w+3.));
  vec3 col=mix(lin(c0),lin(c1),veil*.85);col=mix(col,lin(c2),amber*.55);
  gl_FragColor=vec4(pow(col,vec3(1./2.2)),1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { if (toggle) toggle.hidden = true; return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (k) => gl.getUniformLocation(prog, k);
  const U = { r: u('r'), t: u('t'), p: u('p'), pa: u('pa'), c0: u('c0'), c1: u('c1'), c2: u('c2') };
  gl.uniform3fv(U.c0, rgb('--color-paper'));
  gl.uniform3fv(U.c1, rgb('--card-lit'));
  gl.uniform3fv(U.c2, rgb('--air-amber'));

  const resize = () => {
    canvas.width = Math.max(1, Math.round(innerWidth / 2));
    canvas.height = Math.max(1, Math.round(innerHeight / 2));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.r, canvas.width, canvas.height);
  };
  resize();

  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, a: 0 };
  addEventListener('pointermove', (e) => { ptr.tx = e.clientX / innerWidth; ptr.ty = 1 - e.clientY / innerHeight; ptr.a = 1; }, { passive: true });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { seen: true, held: false };
  let t = 0, last = 0, raf = 0;
  const draw = () => {
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06; ptr.a *= 0.985;
    gl.uniform1f(U.t, t);
    gl.uniform2f(U.p, ptr.x, ptr.y);
    gl.uniform1f(U.pa, ptr.a);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const frame = (now) => {
    t += Math.min(now - last, 50) / 1000; last = now;
    draw();
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    cancelAnimationFrame(raf);
    const run = state.seen && !state.held && !reduced.matches && !document.hidden;
    if (run) { last = performance.now(); raf = requestAnimationFrame(frame); } else draw();
    if (toggle) toggle.textContent = state.held ? 'Play the background' : 'Pause the background';
  };
  addEventListener('resize', () => { resize(); draw(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  if (toggle) toggle.addEventListener('click', () => { state.held = !state.held; sync(); });

  // only drift while a zone that shows the air is on screen
  const visible = new Set();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    state.seen = visible.size > 0; sync();
  });
  zones.forEach((z) => io.observe(z));
  sync();
})();
