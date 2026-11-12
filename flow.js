// FITBRAIN — schéma animé « une équipe : un consultant + ses agents »
(function () {
  const svg = document.getElementById('flow');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const lang = svg.dataset.lang || 'fr';
  const T = {
    fr: { backlog: 'Backlog', done: 'Livré', you: 'FITBRAIN',
      agents: ['Spécifier', 'Coder', 'Tester', 'Documenter', 'Revoir'],
      modes: {
        squad: 'Squad : toutes les étapes, un seul interlocuteur.',
        sprint: 'Sprint : la vision et le backlog d’abord.',
        tests: 'Test Factory : les agents conçoivent et maintiennent les tests.',
        safe: 'Programmes à l’échelle : plusieurs équipes, un rythme commun.'
      } },
    en: { backlog: 'Backlog', done: 'Delivered', you: 'FITBRAIN',
      agents: ['Specify', 'Build', 'Test', 'Document', 'Review'],
      modes: {
        squad: 'Squad: every step, one point of contact.',
        sprint: 'Sprint: vision and backlog first.',
        tests: 'Test Factory: agents design and maintain the tests.',
        safe: 'Programmes at scale: many teams, one cadence.'
      } }
  }[lang];

  const WEIGHTS = {
    squad: [1, 1.4, 1, 0.7, 1],
    sprint: [2.6, 0.3, 0.3, 2, 0.8],
    tests: [0.4, 0.3, 3.2, 0.4, 1],
    safe: [1, 1, 1, 1, 1]
  };

  const A = { x: 210, y: 210 };
  const DONE = { x: 520 };
  const agents = T.agents.map((label, i) => ({ label, x: 375, y: 70 + i * 70, hot: 0 }));
  let mode = 'squad';
  let delivered = 0;

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  };

  // Static structure
  const links = el('g', { class: 'links' });
  agents.forEach(a => {
    a.inLink = el('line', { x1: A.x, y1: A.y, x2: a.x, y2: a.y }, links);
    a.outLink = el('line', { x1: a.x, y1: a.y, x2: DONE.x, y2: 210 }, links);
  });
  el('text', { x: 40, y: 40, class: 'cap' }).textContent = T.backlog;
  el('text', { x: DONE.x, y: 40, class: 'cap', 'text-anchor': 'end' }).textContent = T.done;

  const doneStack = el('g', { class: 'stack' });
  const nodes = el('g');
  agents.forEach(a => {
    a.g = el('g', { class: 'agent' }, nodes);
    a.dot = el('circle', { cx: a.x, cy: a.y, r: 9 }, a.g);
    a.txt = el('text', { x: a.x + 18, y: a.y + 5 }, a.g);
    a.txt.textContent = a.label;
  });
  el('circle', { cx: A.x, cy: A.y, r: 30, class: 'you' }, nodes);
  el('text', { x: A.x, y: A.y + 7, class: 'you-label', 'text-anchor': 'middle' }).textContent = '{ }';
  el('circle', { cx: A.x + 1, cy: A.y - 7, r: 3.2, class: 'you-tick' });
  el('text', { x: A.x, y: A.y + 54, class: 'cap', 'text-anchor': 'middle' }).textContent = T.you;

  const tokens = el('g', { class: 'tokens' });
  const caption = document.getElementById('flow-caption');

  function setMode(m) {
    if (!WEIGHTS[m] || m === mode) return;
    mode = m;
    if (caption) caption.textContent = T.modes[m];
    document.querySelectorAll('[data-mode]').forEach(n => n.classList.toggle('is-active', n.dataset.mode === m));
  }
  if (caption) caption.textContent = T.modes[mode];
  document.querySelectorAll('[data-mode="' + mode + '"]').forEach(n => n.classList.add('is-active'));

  // Offers drive the flow (hover, focus or tap)
  document.querySelectorAll('[data-mode]').forEach(n => {
    const go = () => setMode(n.dataset.mode);
    n.addEventListener('mouseenter', go);
    n.addEventListener('focus', go);
    n.addEventListener('click', go);
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { agents.forEach(a => a.g.classList.add('lit')); return; }

  function pickAgent() {
    const w = WEIGHTS[mode];
    const total = w.reduce((s, v) => s + v, 0);
    let r = Math.random() * total;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return agents[i]; }
    return agents[agents.length - 1];
  }

  const live = [];
  function spawn() {
    const y = mode === 'safe' ? 90 + Math.floor(Math.random() * 4) * 80 : 110 + Math.random() * 200;
    const node = el('rect', { width: 10, height: 10, x: -5, y: -5 }, tokens);
    live.push({ node, agent: pickAgent(), path: [{ x: 40, y }, A], seg: 0, t: 0, speed: 0.012 + Math.random() * 0.006 });
  }

  function addDone() {
    delivered++;
    const i = (delivered - 1) % 24;
    if (i === 0) doneStack.replaceChildren();
    el('rect', { x: DONE.x - 12 - (i % 3) * 14, y: 360 - Math.floor(i / 3) * 14, width: 10, height: 10 }, doneStack);
  }

  let last = 0, acc = 0;
  function frame(ts) {
    const dt = Math.min(64, ts - (last || ts)); last = ts; acc += dt;
    if (acc > 520) { acc = 0; spawn(); }
    for (let k = live.length - 1; k >= 0; k--) {
      const p = live[k];
      p.t += p.speed * dt / 16;
      if (p.t >= 1) {
        p.t = 0; p.seg++;
        if (p.seg === 1) { p.path.push({ x: p.agent.x, y: p.agent.y }); }
        if (p.seg === 2) { p.agent.hot = 1; p.path.push({ x: DONE.x - 20, y: 210 }); }
        if (p.seg === 3) { p.node.remove(); live.splice(k, 1); addDone(); continue; }
      }
      const a = p.path[p.seg], b = p.path[p.seg + 1];
      const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
      p.node.setAttribute('transform', `translate(${a.x + (b.x - a.x) * e},${a.y + (b.y - a.y) * e})`);
    }
    agents.forEach(a => {
      a.hot = Math.max(0, a.hot - dt / 700);
      a.g.classList.toggle('lit', a.hot > 0.05);
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
