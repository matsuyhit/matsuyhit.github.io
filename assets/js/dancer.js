// Procedural 3D waltz figure, rendered as a chronophotograph:
// the live skeleton plus fading after-images, limb trails and the floor trajectory.
// Everything is forward kinematics on hand-tuned sinusoids — no motion-capture data.

const TAU = Math.PI * 2;
const DT = 1 / 60;               // fixed simulation step
const BEAT = 60 / 88;            // waltz tempo (s per beat)
const FIG_DUR = BEAT * 6;        // each figure lasts two bars
const BLEND = 0.9;               // seconds to cross-fade between figures
const RADIUS = 0.62;             // line-of-dance circle on the floor
const PITCH = 0.2;               // camera looks slightly down
const CAM_D = 6;                 // camera distance (perspective strength)
const CAM_Y = 0.9;               // height the camera aims at

export const FIGURES = [
  { id: 'natural', en: 'Natural Turn', ja: 'ナチュラルターン', yaw: 1.6, travel: 0.34, sway: 0.11, abdL: 1.5, abdR: 1.35, fwdL: 0.25, fwdR: 0.5, bend: 0.35, stride: 0.42 },
  { id: 'whisk', en: 'Whisk', ja: 'ウィスク', yaw: 0.2, travel: 0.16, sway: 0.2, abdL: 1.75, abdR: 1.15, fwdL: 0.05, fwdR: 0.7, bend: 0.25, stride: 0.3 },
  { id: 'chasse', en: 'Chassé from PP', ja: 'シャッセ・フロム・PP', yaw: 0.45, travel: 0.42, sway: 0.08, abdL: 1.9, abdR: 1.6, fwdL: -0.1, fwdR: 0.15, bend: 0.15, stride: 0.36 },
  { id: 'reverse', en: 'Reverse Turn', ja: 'リバースターン', yaw: -1.6, travel: 0.3, sway: 0.13, abdL: 1.35, abdR: 1.5, fwdL: 0.5, fwdR: 0.25, bend: 0.35, stride: 0.42 },
];
const KEYS = ['yaw', 'travel', 'sway', 'abdL', 'abdR', 'fwdL', 'fwdR', 'bend', 'stride'];

const NAMES = ['HEAD', 'NECK', 'L_SHOULDER', 'R_SHOULDER', 'L_ELBOW', 'R_ELBOW', 'L_WRIST', 'R_WRIST',
  'PELVIS', 'L_HIP', 'R_HIP', 'L_KNEE', 'R_KNEE', 'L_ANKLE', 'R_ANKLE', 'L_TOE', 'R_TOE'];
const BONES = [[0, 1], [1, 2], [1, 3], [2, 4], [4, 6], [3, 5], [5, 7], [1, 8], [8, 9], [8, 10],
  [9, 11], [11, 13], [13, 15], [10, 12], [12, 14], [14, 16]];
const TRAIL_JOINTS = [6, 7, 13, 14];
const N = NAMES.length;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function rotX(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; }
function rotY(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; }
function rotZ(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; }

function blendAt(t) {
  const n = FIGURES.length;
  const k = Math.floor(t / FIG_DUR);
  const b = smooth(clamp((t - k * FIG_DUR) / BLEND, 0, 1));
  const cur = FIGURES[k % n];
  const prev = FIGURES[(k - 1 + n) % n];
  const p = {};
  for (const key of KEYS) p[key] = lerp(prev[key], cur[key], b);
  return { p, cur, prev, b, k };
}

// Body-local pose (x right, y up, z forward), grounded so the lowest foot touches y = 0.
function localPose(p, t) {
  const beat = t / BEAT;
  const legPh = beat * Math.PI;              // one full leg cycle every two steps
  const barPh = (beat / 3) * TAU;            // one bar = three beats
  const sway = p.sway * Math.sin(barPh);
  const lean = -0.06 + 0.03 * Math.sin(barPh * 2);
  const torso = (v) => rotZ(rotX(v, lean), sway);

  const pelvis = [0, 0, 0];
  const neck = torso([0, 0.5, 0]);
  const head = add(neck, torso(rotZ([0, 0.2, 0.02], -sway * 0.9)));
  const lSh = add(neck, torso([-0.19, -0.04, 0]));
  const rSh = add(neck, torso([0.19, -0.04, 0]));

  const breath = 0.08 * Math.sin(barPh + 0.6);
  const arm = (base, side, abd, fwd) => {
    const a = abd + breath;
    const upper = rotY(rotZ([0, -0.29, 0], side * a), -side * fwd);
    const fore = rotY(rotZ([0, -0.26, 0], side * (a + p.bend)), -side * (fwd + 0.15));
    const el = add(base, torso(upper));
    return [el, add(el, torso(fore))];
  };
  const [lEl, lWr] = arm(lSh, -1, p.abdL, p.fwdL);
  const [rEl, rWr] = arm(rSh, 1, p.abdR, p.fwdR);

  const leg = (side, ph) => {
    const s = p.stride * Math.sin(ph);
    const k = 0.55 * Math.max(0, Math.sin(ph + 1.1)) + 0.08;
    const hip = [0.09 * side, -0.03, 0];
    const knee = add(hip, rotX([0, -0.43, 0], -s));
    const ank = add(knee, rotX([0, -0.42, 0], -(s - k)));
    const toe = add(ank, rotY(rotX([0, -0.03, 0.13], -(s - k) * 0.25), side * 0.25));
    return [hip, knee, ank, toe];
  };
  const [lHip, lKn, lAn, lToe] = leg(-1, legPh);
  const [rHip, rKn, rAn, rToe] = leg(1, legPh + Math.PI);

  const pts = [head, neck, lSh, rSh, lEl, rEl, lWr, rWr, pelvis, lHip, rHip, lKn, rKn, lAn, rAn, lToe, rToe];
  const rise = 0.035 * (0.5 - 0.5 * Math.cos(barPh));
  const lift = -Math.min(lAn[1], rAn[1], lToe[1], rToe[1]) + rise;
  for (const q of pts) q[1] += lift;
  return pts;
}

export class Dancer {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = { signals: false, onTick: null, ...opts };
    this.t = 0;
    this.acc = 0;
    this.yaw = 0.6;
    this.alpha = 0;
    this.view = -0.45;
    this.viewVel = 0;
    this.hist = [];
    this.path = [];
    this.sig = { a: [], b: [], c: [], fig: [] };
    this.paused = false;
    this.visible = false;
    this.raf = 0;
    this.last = 0;
    this.lastTick = -1;
    this.pointer = null;
    this.drag = null;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.readColors();
    this.resize();
    new ResizeObserver(() => { this.resize(); this.draw(); }).observe(canvas);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.sync(); }, { rootMargin: '80px' }).observe(canvas);
    document.addEventListener('visibilitychange', () => this.sync());
    this.bindPointer();

    this.warmup(this.o.signals ? 5.4 : this.reduced ? 3.3 : 2.4);
    if (this.reduced) this.paused = true;
    this.draw();
    this.emit(true);
  }

  // ---------- public ----------
  setPaused(v) { this.paused = v; this.sync(); this.draw(); }
  readColors() {
    const cs = getComputedStyle(this.c);
    const v = (n) => cs.getPropertyValue(n).trim();
    this.col = { ink: v('--ink'), muted: v('--muted'), accent: v('--accent'), line: v('--line-strong'), paper: v('--surface'), spin: v('--c-spin'), ok: v('--ok') };
  }
  refresh() { this.readColors(); this.draw(); }

  // ---------- simulation ----------
  warmup(sec) { for (let i = 0; i < sec / DT; i++) this.step(); }

  step() {
    this.t += DT;
    const { p, k } = blendAt(this.t);
    this.yaw += p.yaw * DT;
    this.alpha += (p.travel * DT) / RADIUS;
    const root = [Math.cos(this.alpha) * RADIUS, 0, Math.sin(this.alpha) * RADIUS];
    const local = localPose(p, this.t);
    const pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const w = add(rotY(local[i], this.yaw), root);
      pts[i * 3] = w[0]; pts[i * 3 + 1] = w[1]; pts[i * 3 + 2] = w[2];
    }
    this.hist.push({ t: this.t, pts });
    while (this.hist.length && this.t - this.hist[0].t > 1.6) this.hist.shift();
    if (Math.round(this.t / DT) % 3 === 0) {
      this.path.push({ t: this.t, x: root[0], z: root[2] });
      while (this.path.length && this.t - this.path[0].t > 9) this.path.shift();
    }
    if (this.o.signals) this.sample(p, k);
  }

  // Synthetic IMU: second differences of the simulated joints, lightly noised.
  sample(p, k) {
    const h = this.hist, L = h.length;
    if (L < 3) return;
    const acc = (j) => {
      let m = 0;
      for (let d = 0; d < 3; d++) {
        const a = h[L - 1].pts[j * 3 + d], b = h[L - 2].pts[j * 3 + d], c = h[L - 3].pts[j * 3 + d];
        m += ((a - 2 * b + c) / (DT * DT)) ** 2;
      }
      return Math.sqrt(m);
    };
    const n = () => (Math.random() - 0.5) * 0.06;
    const s = this.sig;
    s.a.push(clamp(acc(6) / 22, 0, 1.2) + n());
    s.b.push(clamp(acc(14) / 26, 0, 1.2) + n());
    s.c.push(clamp(0.5 + p.yaw / 4 + 0.2 * Math.sin(this.t * 4.4), 0, 1) + n() * 0.5);
    s.fig.push(k);
    const max = 300;
    if (s.a.length > max) { s.a.shift(); s.b.shift(); s.c.shift(); s.fig.shift(); }
  }

  // ---------- loop ----------
  sync() {
    const run = this.visible && !this.paused && !document.hidden;
    if (run && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((n) => this.frame(n));
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    while (this.acc >= DT) { this.step(); this.acc -= DT; }
    if (!this.drag) {
      this.viewVel *= 0.94;
      this.view += this.viewVel + dt * 0.05;
    }
    this.draw();
    this.emit();
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }

  emit(force) {
    if (!this.o.onTick) return;
    if (!force && this.t - this.lastTick < 0.08) return;
    this.lastTick = this.t;
    const { cur, prev, b } = blendAt(this.t);
    const raw = FIGURES.map((f, i) => {
      if (f === cur) return 0.15 + 0.8 * b;
      if (f === prev) return 0.05 + 0.8 * (1 - b);
      return 0.03 + 0.02 * (0.5 + 0.5 * Math.sin(this.t * 3.1 + i * 1.7));
    });
    const sum = raw.reduce((a, v) => a + v, 0);
    const beat = this.t / BEAT;
    this.o.onTick({
      t: this.t,
      yaw: ((this.yaw * 180) / Math.PI % 360 + 360) % 360,
      bar: Math.floor(beat / 3) + 1,
      beat: Math.floor(beat % 3) + 1,
      figure: cur,
      probs: FIGURES.map((f, i) => ({ fig: f, v: raw[i] / sum })),
    });
  }

  // ---------- input ----------
  bindPointer() {
    const c = this.c;
    const local = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.drag = { x: e.clientX, view: this.view, lastX: e.clientX };
      c.setPointerCapture(e.pointerId);
      c.classList.add('is-dragging');
    });
    c.addEventListener('pointermove', (e) => {
      this.pointer = e.pointerType === 'mouse' ? local(e) : null;
      if (this.drag) {
        this.view = this.drag.view + (e.clientX - this.drag.x) * 0.01;
        this.viewVel = (e.clientX - this.drag.lastX) * 0.01;
        this.drag.lastX = e.clientX;
      }
      if (!this.raf) this.draw();
    });
    const end = () => { this.drag = null; c.classList.remove('is-dragging'); };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { this.pointer = null; if (!this.raf) this.draw(); });
  }

  // ---------- rendering ----------
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.c.clientWidth, h = this.c.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.o.signals) {
      this.cx = w * 0.5; this.cy = h * 0.4; this.scale = Math.min(h * 0.27, w * 0.4);
    } else {
      this.cx = w * 0.54; this.cy = h * 0.52; this.scale = Math.min(h * 0.3, w * 0.46);
    }
  }

  project(x, y, z) {
    const cv = Math.cos(this.view), sv = Math.sin(this.view);
    const rx = x * cv + z * sv;
    const rz = -x * sv + z * cv;
    const ry = y - CAM_Y;
    const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    const y2 = ry * cp - rz * sp;
    const z2 = ry * sp + rz * cp;
    const d = CAM_D / (CAM_D - z2);
    return [this.cx + rx * this.scale * d, this.cy - y2 * this.scale * d, d];
  }

  projectAll(pts) {
    const out = new Array(N);
    for (let i = 0; i < N; i++) out[i] = this.project(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
    return out;
  }

  draw() {
    const { ctx, w, h, col } = this;
    if (!w || !this.hist.length) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.drawFloor();
    this.drawPath();

    const now = this.hist[this.hist.length - 1];
    const cur = this.projectAll(now.pts);

    // shadow under the pelvis
    const sh = this.project(now.pts[8 * 3], 0, now.pts[8 * 3 + 2]);
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = col.ink;
    ctx.beginPath();
    ctx.ellipse(sh[0], sh[1], 0.26 * this.scale * sh[2], 0.06 * this.scale * sh[2], 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // after-images
    for (let age = 1.2; age >= 0.15; age -= 0.15) {
      const g = this.at(now.t - age);
      if (!g) continue;
      const pp = this.projectAll(g.pts);
      ctx.globalAlpha = 0.3 * (1 - age / 1.35) ** 1.5;
      ctx.strokeStyle = col.ink;
      ctx.lineWidth = 1.1;
      this.bones(pp);
    }
    ctx.globalAlpha = 1;

    // limb trails
    for (const j of TRAIL_JOINTS) {
      const wrist = j === 6 || j === 7;
      ctx.strokeStyle = wrist ? col.accent : col.muted;
      ctx.lineWidth = wrist ? 1.8 : 1.2;
      let prev = null;
      const span = 1.4;
      for (let i = 0; i < this.hist.length; i += 2) {
        const s = this.hist[i];
        const age = now.t - s.t;
        if (age > span) continue;
        const q = this.project(s.pts[j * 3], s.pts[j * 3 + 1], s.pts[j * 3 + 2]);
        if (prev) {
          ctx.globalAlpha = (1 - age / span) * (wrist ? 0.9 : 0.5);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
        prev = q;
      }
    }
    ctx.globalAlpha = 1;

    // live skeleton
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 3;
    this.bones(cur);
    const hr = 0.085 * this.scale * cur[0][2];
    ctx.fillStyle = col.paper;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cur[0][0], cur[0][1] - hr * 0.6, hr, 0, TAU); ctx.fill(); ctx.stroke();
    for (let i = 1; i < N; i++) {
      const hot = TRAIL_JOINTS.includes(i);
      ctx.beginPath();
      ctx.arc(cur[i][0], cur[i][1], hot ? 4 : 3, 0, TAU);
      ctx.fillStyle = hot ? col.accent : col.paper;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = hot ? col.accent : col.ink;
      ctx.stroke();
    }

    if (this.pointer && !this.drag) this.drawHover(cur, now.pts);
    if (this.o.signals) this.drawSignals();
  }

  at(t) {
    const h = this.hist;
    let lo = 0, hi = h.length - 1;
    if (hi < 0 || t < h[0].t) return null;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (h[m].t <= t) lo = m; else hi = m - 1; }
    return h[lo];
  }

  bones(pp) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (const [a, b] of BONES) { ctx.moveTo(pp[a][0], pp[a][1]); ctx.lineTo(pp[b][0], pp[b][1]); }
    ctx.stroke();
  }

  drawFloor() {
    const { ctx, col } = this;
    ctx.save();
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 1;
    for (const [r, dash] of [[RADIUS + 0.42, []], [RADIUS, [2, 5]], [0.16, []]]) {
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * TAU;
        const q = this.project(Math.cos(a) * r, 0, Math.sin(a) * r);
        i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const r0 = RADIUS + (i % 6 === 0 ? 0.3 : 0.37), r1 = RADIUS + 0.42;
      const q0 = this.project(Math.cos(a) * r0, 0, Math.sin(a) * r0);
      const q1 = this.project(Math.cos(a) * r1, 0, Math.sin(a) * r1);
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
    }
    ctx.restore();
  }

  drawPath() {
    const { ctx, col, path } = this;
    if (path.length < 2) return;
    const now = this.t;
    ctx.save();
    ctx.strokeStyle = col.accent;
    ctx.lineWidth = 1.5;
    let prev = null;
    for (const s of path) {
      const q = this.project(s.x, 0, s.z);
      if (prev) {
        ctx.globalAlpha = 0.55 * (1 - (now - s.t) / 9);
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      prev = q;
    }
    ctx.restore();
  }

  drawHover(cur, pts) {
    const [px, py] = this.pointer;
    let best = -1, bd = 26 * 26;
    for (let i = 0; i < N; i++) {
      const dx = cur[i][0] - px, dy = cur[i][1] - py, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return;
    const { ctx, col } = this;
    const [x, y] = cur[best];
    const f = (v) => (v >= 0 ? ' ' : '') + v.toFixed(2);
    const label = `${NAMES[best]}  x${f(pts[best * 3])}  y${f(pts[best * 3 + 1])}  z${f(pts[best * 3 + 2])}`;
    ctx.save();
    ctx.strokeStyle = col.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke();
    ctx.font = '500 10.5px "Geist Mono", ui-monospace, monospace';
    const tw = ctx.measureText(label).width;
    let lx = x + 16, ly = y - 14;
    if (lx + tw + 16 > this.w) lx = x - tw - 28;
    ctx.fillStyle = col.ink;
    ctx.beginPath();
    ctx.roundRect(lx, ly - 11, tw + 14, 22, 6);
    ctx.fill();
    ctx.fillStyle = col.paper;
    ctx.fillText(label, lx + 7, ly + 4);
    ctx.restore();
  }

  drawSignals() {
    const { ctx, col, sig, w, h } = this;
    const top = h * 0.73, bottom = h - 14, lane = (bottom - top) / 3;
    const x0 = 112, x1 = w - 14, max = 300;
    const lang = document.documentElement.dataset.lang;
    const lanes = [
      [sig.a, col.accent, 'ACC  L-WRIST'],
      [sig.b, col.ink, 'ACC  R-ANKLE'],
      [sig.c, col.spin, 'GYRO PELVIS-Z'],
    ];
    ctx.save();
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, top - 8); ctx.lineTo(x1, top - 8); ctx.stroke();

    // figure boundaries → the segmentation the model has to recover
    ctx.font = '500 9.5px "Geist Mono", ui-monospace, monospace';
    for (let i = 1; i < sig.fig.length; i++) {
      if (sig.fig[i] === sig.fig[i - 1]) continue;
      const x = x0 + ((i + max - sig.fig.length) / (max - 1)) * (x1 - x0);
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = col.muted;
      ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, bottom); ctx.stroke();
      ctx.setLineDash([]);
      const f = FIGURES[sig.fig[i] % FIGURES.length];
      ctx.fillStyle = col.muted;
      ctx.fillText((lang === 'ja' ? f.ja : f.en).toUpperCase(), x + 4, top + 4);
    }

    lanes.forEach(([data, color, name], li) => {
      const yb = top + lane * (li + 1) - 4;
      ctx.fillStyle = col.muted;
      ctx.fillText(name, 14, yb - lane * 0.35);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = x0 + ((i + max - data.length) / (max - 1)) * (x1 - x0);
        const y = yb - clamp(data[i], 0, 1.2) * (lane - 14) * 0.8;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    ctx.restore();
  }
}
