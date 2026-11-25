const NS = 'http://www.w3.org/2000/svg';
export const TAPES = ['#ff5c8a', '#ffcf33', '#3d7bff', '#36b37e', '#ff8a3d', '#b08cff'];
const CARDS = ['#f7f3ff', '#fff7dc', '#e6f0ff', '#e7f7ef', '#ffeedd', '#f2ecff'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function s(tag, attrs = {}, ...kids) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...kids);
  return node;
}

// Four card silhouettes, so the figures differ in shape as well as colour.
const BODIES = [
  'M-34 -118 L32 -122 L40 0 L-42 3 Z',
  'M-26 -120 L28 -117 L52 2 L-50 0 Z',
  'M-40 -112 Q0 -132 38 -114 L34 3 L-36 0 Z',
  'M-30 -122 L34 -114 L30 1 L-26 4 Z',
];

function figure(name, i) {
  const card = CARDS[i % CARDS.length];
  const edge = { fill: card, stroke: '#16272c', 'stroke-width': 2.5, 'stroke-linejoin': 'round' };
  const brad = (x, y) => s('circle', { cx: x, cy: y, r: 5, fill: '#c99a2e', stroke: '#16272c', 'stroke-width': 1.5 });
  const arm = (side) => s('g', { class: `arm ${side}`, style: `transform-origin:${side === 'left' ? -32 : 32}px -108px` },
    s('path', { ...edge, d: side === 'left' ? 'M-40 -112 L-24 -110 L-38 -38 L-54 -41 Z' : 'M24 -110 L40 -112 L54 -41 L38 -38 Z' }),
    brad(side === 'left' ? -32 : 32, -108));
  const label = s('text', { x: 0, y: 29, 'text-anchor': 'middle', 'font-size': 25, fill: '#16272c', style: "font-family:'Covered By Your Grace','Segoe Print',cursive" });
  label.textContent = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  const w = Math.max(70, Math.min(150, name.length * 12 + 26));
  return s('g', { class: 'figure' },
    s('ellipse', { cx: 14, cy: 4, rx: 58, ry: 10, fill: '#16272c', opacity: .28 }),
    s('g', { class: 'body' },
      arm('left'),
      s('path', { ...edge, d: BODIES[i % BODIES.length] }),
      s('path', { ...edge, d: 'M-27 -148 Q-24 -182 2 -181 Q29 -180 28 -147 Q22 -122 0 -121 Q-23 -124 -27 -148 Z' }),
      brad(0, -122), arm('right')),
    s('path', { d: `M${-w / 2} 8 L${w / 2} 5 L${w / 2 - 3} 36 L${-w / 2 + 2} 38 Z`, fill: TAPES[i % TAPES.length] }), label);
}

export class Stage {
  constructor(svg, line) {
    this.svg = svg; this.line = line; this.run = 0; this.figures = new Map();
  }

  cast(names) {
    this.run++;
    this.line.hidden = true;
    this.svg.replaceChildren(
      s('path', { d: 'M-800 258 L1600 258', stroke: '#16272c', 'stroke-width': 3, opacity: .35 }),
      s('ellipse', { cx: 400, cy: 430, rx: 360, ry: 92, fill: '#fff', opacity: .09 }),
    );
    this.figures.clear();
    const list = names;
    this.size = list.length <= 3 ? 1.5 : list.length === 4 ? 1.25 : 1;
    list.forEach((name, i) => {
      const x = list.length === 1 ? 400 : 130 + (540 * i) / (list.length - 1);
      const y = 440 + (i % 2 ? -22 : 14);
      const tape = TAPES[i % TAPES.length];
      this.svg.append(s('path', { d: `M${x - 26} ${y + 8 + 34 * this.size} h52 M${x} ${y + 8 + 34 * this.size} v22`, stroke: tape, 'stroke-width': 9, opacity: .9 }));
      const node = figure(name, i);
      this.svg.append(node);
      this.figures.set(name, { node, x, y, home: x });
      this.place(name);
    });
  }

  place(name, dx = 0) {
    const f = this.figures.get(name);
    if (!f) return;
    f.x = Math.max(70, Math.min(730, f.home + dx));
    f.node.style.transform = `translate(${f.x}px, ${f.y}px) scale(${this.size})`;
  }

  act(name, action) {
    const f = this.figures.get(name);
    if (!f) return;
    const toward = f.home < 400 ? 1 : -1;
    const arms = { enter: [8, -8], approach: [14, -14], retreat: [-6, 6], gesture: [12, -105], laugh: [62, -62], freeze: [0, 0], drop: [8, -72] }[action] || [0, 0];
    f.node.querySelector('.arm.left').style.transform = `rotate(${arms[0]}deg)`;
    f.node.querySelector('.arm.right').style.transform = `rotate(${arms[1]}deg)`;
    if (action === 'approach') this.place(name, (toward * 150) / this.size);
    if (action === 'retreat') this.place(name, toward * -60);
    if (action === 'enter') this.place(name, toward * 45);
  }

  async play(take, names) {
    const everyone = [...new Set([...names, ...take.beats.map((b) => b.speaker)])];
    this.cast(everyone);
    const mine = ++this.run;
    await wait(500);
    for (const beat of take.beats) {
      if (mine !== this.run) return false;
      for (const { node } of this.figures.values()) node.classList.remove('speaking');
      this.act(beat.speaker, beat.action);
      const f = this.figures.get(beat.speaker);
      void f.node.getBoundingClientRect();
      f.node.classList.add('speaking');
      const who = document.createElement('b');
      who.textContent = beat.speaker;
      this.line.replaceChildren(who, beat.line);
      this.line.hidden = false;
      await wait(1500 + beat.line.length * 38);
    }
    if (mine !== this.run) return false;
    this.line.hidden = true;
    return true;
  }
}
