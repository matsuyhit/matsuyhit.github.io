// IRIS (IUI '23) — interactive re-creation of Fig. 3:
// video player with the segment timeline, plus the rubric-informed score sheet.
// Re-renders its text on `langchange` while keeping its state.

const lang = () => document.documentElement.dataset.lang || 'en';
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ==========================================================================
   IRIS — Fig. 3: video player with segment timeline + score sheet
   ========================================================================== */

const DUR = 182;
// Segment timeline as drawn in Fig. 3 (seconds); gaps are transitions.
const SEGS = [
  [18.7, 21.3, 'jump'], [37.2, 40.8, 'jump'], [48.9, 85.6, 'step'], [85.6, 88.0, 'jump'],
  [96.1, 113.2, 'spin'], [117.3, 127.3, 'spin'], [132.8, 165.7, 'step'], [165.7, 178.7, 'spin'],
];
const ELEMENTS = [
  ['3T', 4.1, -0.31, 3.79], ['3Lo+2T', 6.4, 0.27, 6.67], ['LSp3', 2.4, 0.85, 3.25], ['2A', 3.63, 0.25, 3.88],
  ['FSSp2', 2.3, -0.24, 2.06], ['CCoSp4', 3.5, 0.76, 4.26], ['StSq4', 3.9, 1.83, 5.73],
];
const PCS = [
  ['Skating Skills', 'スケーティングスキル', 6.32],
  ['Transition / Linking Footwork', 'トランジション / リンキングフットワーク', 6.14],
  ['Performance / Execution', 'パフォーマンス / エグゼキューション', 6.33],
  ['Choreography / Composition', 'コレオグラフィー / コンポジション', 6.42],
  ['Interpretation', 'インタープリテーション', 6.09],
];
const TOTALS = { base: '26.23', tes: '29.64', pcs: '25.04', score: '54.68' };

const IRIS = {
  en: {
    file: 'IRIS — Fig. 3 re-creation',
    layers: { score: 'Score', sequence: 'Sequence', segments: 'Segments', subscores: 'Subscores' },
    layersLabel: 'Explanations shown',
    types: { transition: 'Transition', jump: 'Jump', step: 'Step Sequence', spin: 'Spin' },
    score: 'Score',
    head: ['#', 'Executed Elements', 'Base', 'GOE', 'TES'],
    pcsHead: ['Program Components', 'Factor', 'PCS'],
    play: 'Play', pause: 'Pause', seek: 'Seek',
  },
  ja: {
    file: 'IRIS — Fig. 3 の再現',
    layers: { score: 'Score', sequence: 'Sequence', segments: 'Segments', subscores: 'Subscores' },
    layersLabel: '表示する説明',
    types: { transition: 'トランジション', jump: 'ジャンプ', step: 'ステップシークエンス', spin: 'スピン' },
    score: 'スコア',
    head: ['#', '実施要素', '基礎点', 'GOE', 'TES'],
    pcsHead: ['演技構成点', '係数', 'PCS'],
    play: '再生', pause: '一時停止', seek: 'シーク',
  },
};

const typeAt = (t) => (SEGS.find(([a, b]) => t >= a && t < b) || [0, 0, 'transition'])[2];
const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

// Skater path over the ice: a slow figure-eight, nearly stationary (with small loops) during spins.
const PATH = (() => {
  const pts = [];
  let s = 0;
  const speed = { transition: 1, jump: 1.5, step: 1.1, spin: 0.05 };
  for (let t = 0; t <= DUR; t += 0.25) {
    const type = typeAt(t);
    s += speed[type] * 0.25;
    let x = 200 + 160 * Math.sin(s * 0.055);
    let y = 166 + 62 * Math.sin(s * 0.11 + 0.6);
    if (type === 'spin') { x += 5 * Math.cos(t * 9); y += 3 * Math.sin(t * 9); }
    pts.push([x, y, type, t]);
  }
  return pts;
})();

export function initIris(root) {
  const s = { time: 32, playing: false, raf: 0, last: 0, layers: { sequence: true, segments: true, subscores: true } };

  function render() {
    const t = IRIS[lang()];
    const L = lang();
    const seqOn = s.layers.sequence, subOn = s.layers.subscores, segOn = s.layers.segments;
    root.innerHTML = `
      <div class="win-bar">
        <span class="win-title mono">${t.file}</span>
        <div class="iris-layers" role="group" aria-label="${t.layersLabel}">
          <button type="button" class="fchip" aria-pressed="true" disabled>${t.layers.score}</button>
          ${['sequence', 'segments', 'subscores'].map((k) => `<button type="button" class="fchip" data-layer="${k}" aria-pressed="${s.layers[k]}">${t.layers[k]}</button>`).join('')}
        </div>
      </div>
      <div class="iris-fig">
        <div class="iris-player${segOn ? '' : ' no-seg'}">
          <div class="iris-frame">
            <svg viewBox="0 0 400 250" aria-hidden="true">
              <defs>
                <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eff4"/><stop offset="1" stop-color="#cfdae4"/></linearGradient>
                <linearGradient id="arena" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a22"/><stop offset="1" stop-color="#2a3442"/></linearGradient>
              </defs>
              <rect width="400" height="74" fill="url(#arena)"/>
              ${Array.from({ length: 34 }, (_, i) => `<rect x="${i * 12 + 2}" y="${10 + (i % 3) * 6}" width="7" height="22" fill="hsl(${(i * 47) % 360} 40% 45% / .55)"/>`).join('')}
              <rect y="60" width="400" height="16" fill="#f4f4f2"/>
              ${[18, 96, 168, 248, 326].map((x, i) => `<rect x="${x}" y="63" width="56" height="10" rx="1" fill="${['#c33', '#2b6', '#333', '#a33', '#246'][i]}" opacity=".7"/>`).join('')}
              <rect y="76" width="400" height="174" fill="url(#ice)"/>
              <ellipse cx="200" cy="166" rx="36" ry="14" fill="none" stroke="#b9c7d3" stroke-width="1"/>
              <g data-trail></g>
              <g data-skater><ellipse rx="7" ry="2.5" cy="6" fill="rgb(0 0 0 / .18)"/><circle r="5" fill="#1b1b1b"/><circle r="9" fill="none" stroke="#1b1b1b" stroke-width="1" opacity=".35"/></g>
            </svg>
            <span class="iris-now" data-now></span>
          </div>
          <div class="iris-seek">
            <div class="iris-tl">${SEGS.map(([a, b, k]) => `<i class="t-${k}" style="left:${(a / DUR) * 100}%;width:${((b - a) / DUR) * 100}%"></i>`).join('')}</div>
            <div class="iris-prog"><i data-fill></i><b data-knob></b></div>
            <input type="range" min="0" max="${DUR}" step="0.5" value="${s.time}" data-range aria-label="${t.seek}">
          </div>
          <div class="iris-ctrl">
            <button type="button" data-play aria-label="${s.playing ? t.pause : t.play}"><svg class="ico" aria-hidden="true"><use href="#i-${s.playing ? 'pause' : 'play'}"/></svg></button>
            <span class="mono" data-time></span>
          </div>
          <ul class="iris-legend">
            ${['transition', 'jump', 'step', 'spin'].map((k) => `<li><i class="t-${k}"></i>${t.types[k]}</li>`).join('')}
          </ul>
        </div>

        <div class="iris-sheet">
          <div class="sheet-top"><span class="sheet-name">Viktoria HELGESSON</span><span class="sheet-score">${t.score}: <b>${TOTALS.score}</b></span></div>
          <table>
            <thead><tr><th class="num">${t.head[0]}</th><th>${t.head[1]}</th><th class="r">${t.head[2]}</th><th class="r ai">${t.head[3]}<sup>AI</sup></th><th class="r">${t.head[4]}</th></tr></thead>
            <tbody>
              ${ELEMENTS.map(([code, base, goe, tes], i) => `<tr>
                <td class="num">${seqOn ? i + 1 : ''}</td><td>${seqOn ? code : ''}</td>
                <td class="r">${base.toFixed(2)}</td>
                <td class="r">${subOn ? (goe < 0 ? '–' : '') + Math.abs(goe).toFixed(2) : ''}</td>
                <td class="r">${tes.toFixed(2)}</td></tr>`).join('')}
              <tr class="sum"><td></td><td></td><td class="r">${TOTALS.base}</td><td></td><td class="r">${TOTALS.tes}</td></tr>
            </tbody>
            <tbody>
              <tr class="h"><th colspan="3">${t.pcsHead[0]}</th><th class="r">${t.pcsHead[1]}</th><th class="r ai">${t.pcsHead[2]}<sup>AI</sup></th></tr>
              ${PCS.map(([en, ja, v]) => `<tr><td colspan="3">${L === 'ja' ? ja : en}</td><td class="r">0.80</td><td class="r">${subOn ? v.toFixed(2) : ''}</td></tr>`).join('')}
              <tr class="sum"><td colspan="4"></td><td class="r">${subOn ? TOTALS.pcs : ''}</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;

    root.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => {
      s.layers[b.dataset.layer] = !s.layers[b.dataset.layer];
      render();
      root.querySelector(`[data-layer="${b.dataset.layer}"]`).focus({ preventScroll: true });
    }));
    const range = root.querySelector('[data-range]');
    range.addEventListener('input', () => { s.time = +range.value; draw(); });
    root.querySelector('[data-play]').addEventListener('click', () => {
      s.playing ? stop() : play();
      render();
      root.querySelector('[data-play]').focus({ preventScroll: true });
    });
    draw();
  }

  function draw() {
    const t = IRIS[lang()];
    const segOn = s.layers.segments;
    const pct = (s.time / DUR) * 100;
    root.querySelector('[data-fill]').style.width = `${pct}%`;
    root.querySelector('[data-knob]').style.left = `${pct}%`;
    root.querySelector('[data-range]').value = s.time;
    root.querySelector('[data-time]').textContent = `${mmss(s.time)} / ${mmss(DUR)}`;

    // trail, split into runs by action type
    const upto = PATH.filter((p) => p[3] <= s.time);
    const runs = [];
    for (const p of upto) {
      const k = segOn ? p[2] : 'plain';
      if (!runs.length || runs[runs.length - 1].k !== k) runs.push({ k, pts: runs.length ? [runs[runs.length - 1].pts.at(-1)] : [] });
      runs[runs.length - 1].pts.push(p);
    }
    root.querySelector('[data-trail]').innerHTML = runs.map((r) =>
      `<polyline class="trail t-${r.k}" points="${r.pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}"/>`).join('');
    const cur = upto.at(-1) || PATH[0];
    root.querySelector('[data-skater]').setAttribute('transform', `translate(${cur[0].toFixed(1)} ${cur[1].toFixed(1)})`);

    const now = root.querySelector('[data-now]');
    const type = typeAt(s.time);
    now.hidden = !segOn;
    now.className = `iris-now t-${type}`;
    now.textContent = t.types[type];
  }

  function play() {
    if (s.time >= DUR) s.time = 0;
    s.playing = true;
    s.last = performance.now();
    const step = (n) => {
      s.time = Math.min(DUR, s.time + ((n - s.last) / 1000) * 10);
      s.last = n;
      draw();
      if (s.time >= DUR) { stop(); render(); return; }
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  }
  function stop() { s.playing = false; cancelAnimationFrame(s.raf); s.raf = 0; }

  render();
  document.addEventListener('langchange', render);

  if (reduced()) return;
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { io.disconnect(); setTimeout(() => { if (!s.playing) { play(); render(); } }, 400); }
  }, { threshold: 0.5 });
  io.observe(root);
}
