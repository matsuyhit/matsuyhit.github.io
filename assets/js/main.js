import { Dancer } from './dancer.js';
import { initIris } from './demos.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
const t = (en, ja) => (root.dataset.lang === 'ja' ? ja : en);

/* ---------- Toast ---------- */
const toastEl = $('[data-toast]');
let toastTimer;
export function toast(msg) {
  toastEl.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg><span></span>`;
  toastEl.lastChild.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/* ---------- Language ---------- */
const META = {
  en: {
    title: 'Hitoshi Matsuyama — HCI × AI Researcher',
    desc: 'Hitoshi Matsuyama (松山 仁), Ph.D. — HCI × AI researcher at SB Intuitions. Using data and AI to give structure to expert knowledge so people can understand it, check it, and act on it. UIST 2026, IUI 2023, IEEE Sensors Journal.',
  },
  ja: {
    title: '松山 仁 — HCI × AI 研究者',
    desc: '松山 仁（Hitoshi Matsuyama）博士（工学）。SB Intuitions の HCI × AI 研究者。専門家の知識をデータとAIで構造化し、人が理解し、確かめ、活かせる形にする研究に取り組む。UIST 2026、IUI 2023、IEEE Sensors Journal。',
  },
};

function applyLang(lang) {
  root.dataset.lang = lang;
  root.lang = lang;
  $$('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
  $$('[data-i18n-attr]').forEach((el) => {
    for (const a of el.dataset.i18nAttr.split('|')) {
      const v = el.getAttribute(`data-${lang}-${a}`);
      if (v != null) el.setAttribute(a, v);
    }
  });
  document.title = META[lang].title;
  $('meta[name="description"]').setAttribute('content', META[lang].desc);
  document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

export function setLang(lang) {
  if (lang === root.dataset.lang) return;
  store.set('lang', lang);
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) { url.searchParams.set('lang', lang); history.replaceState(null, '', url); }
  if (document.startViewTransition && !reduced()) document.startViewTransition(() => applyLang(lang));
  else applyLang(lang);
}

/* ---------- Theme ---------- */
const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => root.dataset.theme || (darkMq.matches ? 'dark' : 'light');
function syncThemeMeta() {
  const bg = getComputedStyle(document.body).getPropertyValue('--paper').trim() || (effectiveTheme() === 'dark' ? '#0e0e0c' : '#f2efe7');
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
}
export function toggleTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  const run = () => {
    root.dataset.theme = next;
    store.set('theme', next);
    syncThemeMeta();
    document.dispatchEvent(new Event('themechange'));
  };
  if (document.startViewTransition && !reduced()) document.startViewTransition(run);
  else run();
}
darkMq.addEventListener('change', () => { syncThemeMeta(); document.dispatchEvent(new Event('themechange')); });

/* ---------- Email ----------
   The address is stored reversed + base64 and only assembled on click,
   so it never appears in the markup or rendered text for scrapers. */
const emailBtn = $('[data-email]');
const emailAddr = () => atob(emailBtn.dataset.e).split('').reverse().join('');
export async function copyEmail() {
  const addr = emailAddr();
  if (await copy(addr)) {
    toast(t(`Copied ${addr}`, `${addr} をコピーしました`));
    emailBtn.classList.add('is-copied');
    setTimeout(() => emailBtn.classList.remove('is-copied'), 1600);
  }
}
emailBtn.addEventListener('click', copyEmail);

/* ---------- Header: elevation, progress, active section ---------- */
const header = $('[data-header]');
const progress = $('[data-progress]');
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    header.classList.toggle('is-elevated', y > 8);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const navLinks = $$('[data-nav]');
const sectionIo = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    navLinks.forEach((a) => a.setAttribute('aria-current', String(a.dataset.nav === e.target.id)));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
['work', 'publications', 'cv', 'contact'].forEach((id) => sectionIo.observe(document.getElementById(id)));
new IntersectionObserver(([e]) => {
  if (e.isIntersecting) navLinks.forEach((a) => a.setAttribute('aria-current', 'false'));
}, { rootMargin: '-45% 0px -50% 0px' }).observe($('#top'));

/* ---------- Mobile menu ---------- */
const menuBtn = $('[data-menu-btn]');
const menu = $('[data-menu]');
function setMenu(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? t('Close menu', 'メニューを閉じる') : t('Open menu', 'メニューを開く'));
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* ---------- Reveal on scroll ---------- */
const revealIo = new IntersectionObserver((entries) => {
  let i = 0;
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.style.setProperty('--d', `${Math.min(i++, 5) * 80}ms`);
    e.target.classList.add('is-in');
    revealIo.unobserve(e.target);
  }
}, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
$$('[data-reveal], .sec-head').forEach((el) => revealIo.observe(el));

/* ---------- Dancers ---------- */
const dancers = {};
const pad = (n, w = 2) => String(Math.floor(n)).padStart(w, '0');

const fusionCanvas = $('[data-dancer="fusion"]');
const fusionFig = $('[data-fusion-figure]');
const fusionConf = $('[data-fusion-conf]');
let lastFusion = null;
const renderFusion = () => {
  if (!lastFusion) return;
  const top = lastFusion.probs.reduce((a, b) => (b.v > a.v ? b : a));
  fusionFig.textContent = root.dataset.lang === 'ja' ? top.fig.ja : top.fig.en;
  fusionConf.textContent = `p = ${top.v.toFixed(2)}`;
};
new IntersectionObserver(([e], io) => {
  if (!e.isIntersecting) return;
  io.disconnect();
  dancers.fusion = new Dancer(fusionCanvas, { signals: true, onTick(info) { lastFusion = info; renderFusion(); } });
  syncToggle('fusion');
}, { rootMargin: '400px' }).observe(fusionCanvas);
document.addEventListener('langchange', renderFusion);

function syncToggle(name) {
  const btn = $(`[data-dancer-toggle="${name}"]`);
  if (btn && dancers[name]) btn.setAttribute('aria-pressed', String(dancers[name].paused));
}
$$('[data-dancer-toggle]').forEach((btn) => btn.addEventListener('click', () => {
  const d = dancers[btn.dataset.dancerToggle];
  if (!d) return;
  d.setPaused(!d.paused);
  syncToggle(btn.dataset.dancerToggle);
}));
document.addEventListener('themechange', () => Object.values(dancers).forEach((d) => d.refresh()));

/* ---------- Demos ---------- */
initIris($('[data-demo="iris"]'));

/* ---------- YouTube facades (load the player only on demand) ---------- */
$$('[data-yt]').forEach((box) => {
  $('.yt-btn', box).addEventListener('click', (e) => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0`;
    iframe.title = e.currentTarget.getAttribute('aria-label').replace(/^[^:：]+[:：]\s*/, '');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    box.replaceChildren(iframe);
    iframe.focus();
  });
});

/* ---------- Publications: filter, year grouping, cite ---------- */
const pubs = $$('.pub');
const pubStatus = $('[data-pub-status]');
const filterBtns = $$('[data-filter]');
let pubFilter = 'all';
const types = (p) => p.dataset.type.split(' ');

filterBtns.forEach((b) => {
  const f = b.dataset.filter;
  $('[data-fcount]', b).textContent = f === 'all' ? pubs.length : pubs.filter((p) => types(p).includes(f)).length;
  b.addEventListener('click', () => { pubFilter = f; renderPubs(); });
});

function renderPubs() {
  let shown = 0, prevYear = null;
  for (const p of pubs) {
    const ok = pubFilter === 'all' || types(p).includes(pubFilter);
    p.hidden = !ok;
    if (!ok) continue;
    shown++;
    p.classList.toggle('is-year-first', p.dataset.year !== prevYear);
    prevYear = p.dataset.year;
  }
  filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === pubFilter)));
  pubStatus.textContent = shown === pubs.length
    ? t(`${shown} publications`, `${shown} 件`)
    : t(`Showing ${shown} of ${pubs.length}`, `${pubs.length} 件中 ${shown} 件を表示`);
}
renderPubs();
document.addEventListener('langchange', renderPubs);

const cleanText = (el) => {
  if (!el) return '';
  const c = el.cloneNode(true);
  c.querySelectorAll('.pub-flag').forEach((n) => n.remove());
  return c.textContent.replace(/\s+/g, ' ').trim();
};
$$('[data-copy-cite]').forEach((b) => b.addEventListener('click', async () => {
  const p = b.closest('.pub');
  const year = p.dataset.year;
  const cite = `${cleanText($('.pub-authors', p))}. ${year ? `${year}. ` : ''}${cleanText($('.pub-title', p))}. ${cleanText($('.pub-venue', p))}.`;
  if (await copy(cite)) toast(t('Citation copied', '引用をコピーしました'));
}));

/* ---------- Language / theme controls ---------- */
$$('[data-set-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.setLang)));
$$('[data-toggle-theme]').forEach((b) => b.addEventListener('click', toggleTheme));

/* ---------- Misc ---------- */
$$('[data-current-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

applyLang(root.dataset.lang);
syncThemeMeta();
