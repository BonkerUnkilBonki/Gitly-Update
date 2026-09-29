'use strict';

/* ================= storage & state ================= */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('onegit.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('onegit.' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('onegit.' + k); } catch (e) {} }
};
let TOKEN = LS.get('token', null);
let RSEQ = 0;
let lastOfflineToast = 0;
const API_MEM = {};
const APPV = '2.34';
const UPD_REPO = 'BonkerUnkilBonki/OneGit';
let USER = null;
let pins = LS.get('pins', []);
let gistId = LS.get('gistId', null);
let syncTimer = null;
const repoCache = new Map();

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => '&' + '#' + c.charCodeAt(0) + ';');
}
function nf(n) { n = n | 0; if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'm'; if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k'; return String(n); }
function tAgo(iso) { if (!iso) return ''; const s = (Date.now() - new Date(iso).getTime()) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; if (s < 2592e3) return Math.floor(s / 86400) + 'd ago'; if (s < 31536e3) return Math.floor(s / 2592e3) + 'mo ago'; return Math.floor(s / 31536e3) + 'y ago'; }
function fmtSize(b) { if (b == null || b === '') return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t); requestAnimationFrame(() => t.classList.add('show')); setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600); }
function spinner(sm) { return '<div class="spinwrap' + (sm ? ' sm' : '') + '"><div class="spinner"></div></div>'; }
function errCard(e) { return '<div class="card empty">' + esc((e && e.message) || 'Something went wrong') + '</div>'; }
function isoDaysAgo(d) { const dt = new Date(Date.now() - d * 864e5); return dt.toISOString().slice(0, 10); }

const LANG = { JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', Kotlin: '#A97BFF', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', Swift: '#F05138', Dart: '#00B4AB', PHP: '#4F5D95', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883' };
function langColor(l) { return LANG[l] || '#8a8a8a'; }

const SVG = {
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  fork: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  dot: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>',
  commit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/><line x1="1" y1="12" x2="8.5" y2="12"/><line x1="15.5" y1="12" x2="23" y2="12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  pr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 5 3 12 8 19"/><polyline points="16 5 21 12 16 19"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="#229ED9" width="20" height="20"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
};

/* ================= api ================= */
async function api(path, opts = {}) {
  const headers = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (TOKEN) headers.Authorization = 'Bearer ' + TOKEN;
  if (opts.accept) headers.Accept = opts.accept;
  if (opts.body) headers['Content-Type'] = 'application/json';
  if (opts.noAuth) { delete headers.Authorization; }
  const isGet = !opts.method || opts.method === 'GET';
  const canCache = isGet && !opts.status;
  let res;
  try {
    res = await fetch('https://api.github.com' + path, { method: opts.method || 'GET', headers, body: opts.body || undefined, cache: 'no-store' });
  } catch (netErr) {
    if (canCache) {
      const c = LS.get('c:' + path, null);
      if (c && (c.raw ? typeof c.d === 'string' : c.d !== undefined)) {
        if (Date.now() - (lastOfflineToast || 0) > 30000) { lastOfflineToast = Date.now(); try { toast('Offline — showing saved data'); } catch (e) {} }
        return c.d;
      }
    }
    throw netErr;
  }
  if (res.status === 401) { if (USER) doLogout('Session expired — sign in again'); throw new Error('Invalid or expired token'); }
  if (opts.status) { const d = await res.json().catch(() => null); return { status: res.status, ok: res.ok, data: d }; }
  if (res.status === 204) return null;
  if (opts.text) { const t = await res.text(); if (!res.ok) throw new Error('HTTP ' + res.status); if (canCache) { const k = 'c:' + path; if (API_MEM[k] !== t) { API_MEM[k] = t; try { LS.set(k, { raw: 1, d: t }); } catch (e) {} } } return t; }
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    let m = (data && data.message) || ('HTTP ' + res.status);
    if (data && Array.isArray(data.errors) && data.errors.length) {
      const extra = data.errors.map(x => x && x.message).filter(Boolean).join('; ');
      if (extra) m += ' — ' + extra;
    }
    throw new Error(m);
  }
  if (canCache && data !== null && data !== undefined) { const k = 'c:' + path, s = JSON.stringify(data); if (API_MEM[k] !== s) { API_MEM[k] = s; try { LS.set(k, { d: data }); } catch (e) {} } }
  return data;
}

/* instant cache read for paint-first rendering */
function cached(path) { try { const c = LS.get('c:' + path, null); if (c && (c.raw ? typeof c.d === 'string' : c.d !== undefined)) return c.d; } catch (e) {} return undefined; }

/* ================= theme (mode + accent + glow) ================= */
function shadeHex(hex, f) {
  const p = i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) * (1 + f))));
  return '#' + [p(0), p(1), p(2)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function applyTheme() {
  const t = LS.get('theme', 'light');
  document.body.classList.remove('dark', 'pitch');
  if (t === 'dark') document.body.classList.add('dark');
  else if (t === 'pitch') document.body.classList.add('pitch');
  const rt = document.documentElement;
  document.body.classList.toggle('navglow', !!LS.get('navglow', false));
  const acc = LS.get('accent', 'blue');
  rt.dataset.accent = acc;
  rt.dataset.glow = LS.get('glow', true) ? 'on' : 'off';
  rt.style.removeProperty('--accent');
  rt.style.removeProperty('--accentD');
  rt.style.removeProperty('--glow');
  if (acc === 'dynamic' || acc === 'custom') {
    let hex = '';
    if (acc === 'dynamic') {
      try { if (window.OneGit && window.OneGit.systemAccent) hex = window.OneGit.systemAccent() || ''; } catch (e) {}
    } else {
      hex = (LS.get('customAccent', '') || '').toUpperCase();
    }
    if (/^#[0-9A-F]{6}$/.test(hex)) {
      rt.style.setProperty('--accent', hex.toUpperCase());
      rt.style.setProperty('--accentD', shadeHex(hex.toUpperCase(), -0.25));
      rt.style.setProperty('--glow', hex.toUpperCase() + '6B');
    }
  }
  try {
    if (window.OneGit && window.OneGit.theme) {
      window.OneGit.theme(t === 'light' ? '#F2F2F2' : (t === 'dark' ? '#161719' : '#000000'), t === 'light');
    }
  } catch (e) {}
  let accHex = '';
  try { accHex = getComputedStyle(rt).getPropertyValue('--accent').trim(); } catch (e) {}
  if (/^#[0-9A-Fa-f]{6}$/.test(accHex)) {
    const ch = v => { const c = parseInt(v, 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * ch(accHex.slice(1, 3)) + 0.7152 * ch(accHex.slice(3, 5)) + 0.0722 * ch(accHex.slice(5, 7));
    rt.style.setProperty('--accentText', L > 0.45 ? '#151515' : '#fff');
  } else {
    rt.style.setProperty('--accentText', '#fff');
  }
}

/* ================= font (bundled OneGit Sans everywhere) ================= */
function applyFont() { document.body.style.fontFamily = "'OneGitSans', system-ui, sans-serif"; }

/* ================= pins ================= */
function isPinned(full) { return pins.some(p => p.full_name === full); }
function togglePin(r) {
  const full = r.full_name || ((r.owner ? r.owner.login + '/' : '') + r.name);
  if (isPinned(full)) { pins = pins.filter(p => p.full_name !== full); toast('Unpinned ' + r.name); }
  else {
    pins.push({ full_name: full, name: r.name, description: r.description, html_url: r.html_url, stargazers_count: r.stargazers_count, forks_count: r.forks_count, language: r.language });
    toast('Pinned ' + r.name);
  }
  LS.set('pins', pins); queueSync();
  $$('[data-pinbtn]').forEach(b => {
    if (b.dataset.pinbtn === full) {
      b.classList.toggle('pinned', isPinned(full));
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    }
  });
}

/* ================= sync (private Gist) ================= */
function queueSync() { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncPush(true), 1500); }
async function syncPush(silent) {
  if (!TOKEN) return;
  const payload = { app: 'onegit', version: 1, updated_at: new Date().toISOString(), pins, theme: LS.get('theme', 'light'), accent: LS.get('accent', 'blue'), customAccent: LS.get('customAccent', ''), glow: LS.get('glow', true), navglow: LS.get('navglow', false), autodl: LS.get('autodl', false), font: LS.get('font', 'system'), notify: LS.get('notify', true) };
  try {
    const files = { 'onegit-sync.json': { content: JSON.stringify(payload, null, 2) } };
    if (!gistId) {
      const g = await api('/gists', { method: 'POST', body: JSON.stringify({ description: 'OneGit sync file (auto-generated) — do not delete', public: false, files }) });
      gistId = g.id; LS.set('gistId', gistId);
    } else {
      await api('/gists/' + gistId, { method: 'PATCH', body: JSON.stringify({ files }) });
    }
    if (!silent) toast('Synced to your private Gist');
  } catch (e) { if (!silent) toast('Sync failed: ' + e.message); }
}
async function syncRestore(silent) {
  if (!TOKEN) return false;
  try {
    let g = null;
    if (gistId) { try { g = await api('/gists/' + gistId); } catch (e) {} }
    if (!g) {
      const list = await api('/gists?per_page=100');
      g = list.find(x => x.files && x.files['onegit-sync.json']);
      if (g) { gistId = g.id; LS.set('gistId', gistId); }
    }
    if (!g || !g.files['onegit-sync.json']) { if (!silent) toast('No sync data found on GitHub'); return false; }
    const d = JSON.parse(g.files['onegit-sync.json'].content);
    if (Array.isArray(d.pins)) { pins = d.pins; LS.set('pins', pins); }
    if (d.theme) { LS.set('theme', d.theme); applyTheme(); }
    if (d.accent) { LS.set('accent', d.accent); applyTheme(); }
    if (d.customAccent) { LS.set('customAccent', d.customAccent); applyTheme(); }
    if (d.font) { LS.set('font', 'default'); applyFont(); }
    if (typeof d.glow === 'boolean') { LS.set('glow', d.glow); applyTheme(); }
    if (typeof d.navglow === 'boolean') { LS.set('navglow', d.navglow); applyTheme(); }
    if (typeof d.notify === 'boolean') LS.set('notify', d.notify);
    if (typeof d.autodl === 'boolean') LS.set('autodl', d.autodl);
    if (!silent) toast('Restored from your private Gist');
    return true;
  } catch (e) { if (!silent) toast('Restore failed: ' + e.message); return false; }
}

/* ================= app update (GitHub releases) ================= */
let UPD_CHECKED = false;
function newerVersion(a, b) {
  const pa = String(a).replace(/^v/, '').split('.'), pb = String(b).replace(/^v/, '').split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = parseInt(pa[i] || 0, 10), y = parseInt(pb[i] || 0, 10);
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
function showUpdateCard(tag, name, asset) {
  if (document.getElementById('updCard')) return;
  const el = document.createElement('div');
  el.id = 'updCard';
  el.innerHTML = '<div class="updrow"><div class="lmain"><div class="ltitle">Update available \u00b7 v' + esc(tag) + '</div>' +
    '<div class="lsub">' + (name ? esc(name) + ' \u00b7 ' : '') + 'a new OneGit release is on GitHub</div></div>' +
    '<button class="btn sm primary" id="updGet">Update</button>' +
    '<button class="iconbtn" id="updX" aria-label="dismiss">\u2715</button></div>';
  document.body.appendChild(el);
  const kill = () => { try { el.remove(); } catch (e) {} };
  setTimeout(kill, 20000);
  $('#updGet').addEventListener('click', () => {
    if (asset && window.OneGit && window.OneGit.download) {
      try { window.OneGit.download(asset.browser_download_url, asset.name); toast('Downloading OneGit v' + tag); }
      catch (e) { location.href = 'https://github.com/' + UPD_REPO + '/releases/latest'; }
    } else location.href = 'https://github.com/' + UPD_REPO + '/releases/latest';
    kill();
  });
  $('#updX').addEventListener('click', kill);
}
async function checkUpdate() {
  if (UPD_CHECKED || !TOKEN) return;
  UPD_CHECKED = true;
  try {
    const rel = await api('/repos/' + UPD_REPO + '/releases/latest');
    const tag = String(rel.tag_name || '').replace(/^v/, '');
    if (!tag || !newerVersion(tag, APPV)) return;
    const asset = (rel.assets || []).find(a => /\.apk$/i.test(a.name || ''));
    if (LS.get('autodl', false) && asset && LS.get('updDl', '') !== tag) {
      LS.set('updDl', tag);
      try { window.OneGit.download(asset.browser_download_url, asset.name); toast('Downloading update v' + tag); } catch (e) {}
    }
    if (LS.get('updShown', '') !== tag) {
      LS.set('updShown', tag);
      showUpdateCard(tag, rel.name, asset);
    }
  } catch (e) {}
}

/* ================= auth ================= */
function doLogout(msg) {
  TOKEN = null; USER = null; LS.del('token');
  try { if (window.OneGit && window.OneGit.saveToken) window.OneGit.saveToken(''); } catch (e) {}
  try { if (window.OneGit && window.OneGit.setNotifications) window.OneGit.setNotifications(false); } catch (e) {}
  if (msg) toast(msg); showLogin();
}
function saveTokenNative() { try { if (TOKEN && window.OneGit && window.OneGit.saveToken) window.OneGit.saveToken(TOKEN); } catch (e) {} }
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; }

/* ================= router ================= */
const view = () => $('#view');
const ROUTES = [
  { re: /^#\/home$/, tab: 0, detail: false, title: () => 'Hi, ' + (USER ? USER.login : 'there'), sub: () => '', render: renderHome },
  { re: /^#\/productivity$/, tab: -1, detail: true, title: () => 'Productivity', sub: () => 'Your GitHub, by the numbers', render: renderProductivity },
  { re: /^#\/activity$/, tab: -1, detail: true, title: () => 'Activity', sub: () => 'Everything from people you follow', render: renderActivity },
  { re: /^#\/repos$/, tab: 1, detail: false, title: () => 'Repositories', sub: () => 'Your code, your stars, what is hot', render: renderRepos },
  { re: /^#\/repo\/([^\/]+)\/([^\/]+)\/files(\/.*)?$/, tab: 1, detail: true, title: m => m[2], sub: m => m[1] + ' / ' + m[2] + ' — files', render: m => renderFiles(m[1], m[2], (m[3] || '').replace(/^\//, '')) },
  { re: /^#\/repo\/([^\/]+)\/([^\/]+)\/commits$/, tab: 1, detail: true, title: () => 'Commits', sub: m => m[1] + ' / ' + m[2], render: m => renderCommits(m[1], m[2]) },
  { re: /^#\/repo\/([^\/]+)\/([^\/]+)\/releases$/, tab: 1, detail: true, title: () => 'Releases', sub: m => m[1] + ' / ' + m[2], render: m => renderReleases(m[1], m[2]) },
  { re: /^#\/repo\/([^\/]+)\/([^\/]+)\/issues$/, tab: 1, detail: true, title: () => 'Issues', sub: m => m[1] + ' / ' + m[2], render: m => renderRepoIssues(m[1], m[2]) },
  { re: /^#\/repo\/([^\/]+)\/([^\/]+)$/, tab: 1, detail: true, title: m => m[2], sub: m => m[1] + ' / ' + m[2], render: m => renderRepo(m[1], m[2]) },
  { re: /^#\/commit\/([^\/]+)\/([^\/]+)\/([0-9a-fA-F]{6,40})$/, tab: -1, detail: true, title: () => 'Commit', sub: m => m[1] + ' / ' + m[2], render: m => renderCommit(m[1], m[2], m[3]) },
  { re: /^#\/issue\/([^\/]+)\/([^\/]+)\/(\d+)$/, tab: -1, detail: true, title: m => (m[4] === 'pr' ? 'PR #' : 'Issue #') + m[3], sub: m => m[1] + ' / ' + m[2], render: m => renderIssue(m[1], m[2], +m[3]) },
  { re: /^#\/user\/([^\/]+)$/, tab: -1, detail: true, title: m => '@' + m[1], sub: () => 'GitHub profile', render: m => renderUser(m[1]) },
  { re: /^#\/issues$/, tab: 2, detail: false, title: () => 'Issues', sub: () => 'Issues and pull requests', render: renderIssues },
  { re: /^#\/notifs$/, tab: -1, detail: false, title: () => 'Notifications', sub: () => 'Your unread threads', render: renderNotifs },
  { re: /^#\/users\/([^\/]+)\/(followers|following)$/, tab: -1, detail: true, title: m => m[2][0].toUpperCase() + m[2].slice(1), sub: m => '@' + m[1], render: m => renderUserList(m[1], m[2]) },
  { re: /^#\/user\/([^\/]+)\/gists$/, tab: -1, detail: true, title: () => 'Gists', sub: m => '@' + m[1], render: m => renderGists(m[1]) },
  { re: /^#\/gist\/([0-9a-f]+)$/, tab: -1, detail: true, title: () => 'Gist', sub: () => 'Snippet files', render: m => renderGist(m[1]) },
  { re: /^#\/gists$/, tab: -1, detail: true, title: () => 'Your gists', sub: () => 'Snippets on your account', render: () => renderGists() },
  { re: /^#\/settings$/, tab: -1, detail: false, title: () => 'Settings', sub: () => 'Make OneGit yours', render: renderSettings }
];

async function route() {
  applyTheme();
  if (!TOKEN) { showLogin(); return; }
  $('#login').hidden = true; $('#app').hidden = false;
  if (!USER) {
    const cu = LS.get('c.user', null);
    if (cu) {
      USER = cu;
      api('/user').then(u => { USER = u; LS.set('c.user', u); if (location.hash === '#/home' || location.hash === '') route(); }).catch(() => {});
    } else {
      try { USER = await api('/user'); LS.set('c.user', USER); } catch (e) { if (!TOKEN) return; }
    }
  }
  const h = location.hash || '#/home';
  let matched = null, m = null;
  for (const r of ROUTES) { m = h.match(r.re); if (m) { matched = r; break; } }
  if (!matched) { location.hash = '#/home'; return; }
  $$('#navbar .navbtn').forEach(b => b.classList.toggle('active', b.dataset.tab == matched.tab));
  const title = matched.title(m);
  $('#bigTitle').textContent = title;
  $('#appbarTitle').textContent = title;
  const sub = matched.sub ? matched.sub(m) : '';
  $('#bigSub').textContent = sub; $('#bigSub').style.display = sub ? '' : 'none';
  $('#backBig').hidden = !matched.detail;
  $('#backApp').hidden = !matched.detail;
  $('#refreshBig').hidden = matched.detail;
  $('#refreshApp').hidden = matched.detail;
  $('#settingsBig').hidden = false;
  $('#settingsApp').hidden = false;
  $('#appbar').classList.remove('on');
  $('#scroller').scrollTop = 0;
  closeSheet();
  navShow();
  view().innerHTML = spinner();
  try { await matched.render(m); } catch (e) { view().innerHTML = errCard(e); }
}

/* ================= components ================= */
function repoRow(r) {
  const full = r.full_name || ((r.owner ? r.owner.login : '') + '/' + r.name);
  return '<div class="card" data-go="#/repo/' + full + '">' +
    '<div class="rcrow"><div class="rcname">' + esc(r.name) + '</div>' +
    '<button class="pinbtn ' + (isPinned(full) ? 'pinned' : '') + '" data-pinbtn="' + esc(full) + '" aria-label="pin">' + SVG.star + '</button></div>' +
    '<p class="rcdesc">' + esc(r.description || 'No description') + '</p>' +
    '<div class="rcmeta">' + SVG.star + ' ' + nf(r.stargazers_count) + ' · ' + SVG.fork + ' ' + nf(r.forks_count) +
    (r.language ? ' · <span class="dot" style="background:' + langColor(r.language) + '"></span>' + esc(r.language) : '') +
    (r.private ? ' · <span class="chip">private</span>' : '') + '</div></div>';
}
function issueRow(i) {
  const full = i.repository_url ? i.repository_url.replace('https://api.github.com/repos/', '') : '';
  const closed = i.state !== 'open';
  const isPR = !!i.pull_request;
  return '<div class="lrow"' + (full ? ' data-go="#/issue/' + full + '/' + i.number + '"' : '') + '>' +
    '<div class="istate' + (closed ? ' closed' : '') + '">' + (closed ? SVG.check : SVG.dot) + '</div>' +
    '<div class="lmain"><div class="ltitle">' + esc(i.title) + '</div>' +
    '<div class="lsub">' + (full ? esc(full) + ' · ' : '') + '#' + i.number + ' · ' + tAgo(i.updated_at) + ' · ' + (i.comments || 0) + ' comments' +
    (isPR ? ' · <span class="chip pr">PR</span>' : '') + '</div></div></div>';
}
function commitRow(c) {
  const full = c.repository_url ? c.repository_url.replace('https://api.github.com/repos/', '') : '';
  const msg = (c.commit && c.commit.message ? c.commit.message : '').split('\n')[0];
  const who = c.author ? c.author.login : (c.commit && c.commit.author ? c.commit.author.name : 'unknown');
  const av = c.author ? c.author.avatar_url : '';
  const sha = c.sha ? c.sha.slice(0, 7) : '';
  return '<div class="lrow" data-go="' + (full ? '#/commit/' + full + '/' + c.sha : '#/repos') + '">' +
    (av ? '<img class="cav" src="' + esc(av) + '" alt="">' : SVG.commit) +
    '<div class="lmain"><div class="ltitle">' + esc(msg) + '</div>' +
    '<div class="lsub">' + esc(who) + ' · ' + tAgo(c.commit && c.commit.author ? c.commit.author.date : '') + ' · <span class="chip">' + sha + '</span></div></div></div>';
}
function eventRow(ev) {
  const p = ev.payload || {};
  const repo = ev.repo ? ev.repo.name : '';
  let icon = SVG.user, cls = 'user', text = esc(ev.type || 'activity'), body = '';
  switch (ev.type) {
    case 'PushEvent':
      icon = SVG.commit; cls = 'push';
      text = '<b>' + esc(ev.actor.login) + '</b> pushed ' + (p.size || 1) + ' commit' + ((p.size || 1) > 1 ? 's' : '');
      if (p.commits && p.commits[0]) body = esc((p.commits[0].message || '').split('\n')[0]);
      break;
    case 'WatchEvent': icon = SVG.star; cls = 'star'; text = '<b>' + esc(ev.actor.login) + '</b> starred this repo'; break;
    case 'ForkEvent': icon = SVG.fork; cls = 'fork'; text = '<b>' + esc(ev.actor.login) + '</b> forked this repo' + (p.forkee ? ' → ' + esc(p.forkee.full_name) : ''); break;
    case 'CreateEvent': icon = SVG.plus; cls = 'create'; text = '<b>' + esc(ev.actor.login) + '</b> created ' + (p.ref_type || 'repository') + (p.ref ? ' <b>' + esc(p.ref) + '</b>' : ''); break;
    case 'IssuesEvent':
      icon = SVG.dot; cls = 'issue';
      text = '<b>' + esc(ev.actor.login) + '</b> ' + (p.action || 'updated') + ' an issue';
      if (p.issue) body = esc(p.issue.title);
      break;
    case 'PullRequestEvent':
      icon = SVG.pr; cls = 'pr';
      text = '<b>' + esc(ev.actor.login) + '</b> ' + (p.action || 'updated') + ' a pull request';
      if (p.pull_request) body = esc(p.pull_request.title);
      break;
    case 'IssueCommentEvent':
      icon = SVG.comment; cls = 'comment';
      text = '<b>' + esc(ev.actor.login) + '</b> commented';
      if (p.issue) body = esc(p.issue.title);
      break;
    case 'ReleaseEvent': icon = SVG.tag; cls = 'tag'; text = '<b>' + esc(ev.actor.login) + '</b> released ' + (p.release ? '<b>' + esc(p.release.tag_name) + '</b>' : ''); break;
    case 'DeleteEvent': icon = SVG.x; cls = 'comment'; text = '<b>' + esc(ev.actor.login) + '</b> deleted ' + (p.ref_type || '') + ' ' + esc(p.ref || ''); break;
    default: text = '<b>' + esc(ev.actor.login) + '</b> · ' + esc(ev.type || '');
  }
  return '<div class="lrow"' + (repo ? ' data-go="#/repo/' + repo + '"' : '') + '>' +
    '<div class="eicon ' + cls + '">' + icon + '</div>' +
    '<div class="lmain"><div class="ltitle" style="font-weight:500">' + text + '</div>' +
    (body ? '<div class="lbody">' + body + '</div>' : '') +
    '<div class="lsub">' + esc(repo) + ' · ' + tAgo(ev.created_at) + '</div></div></div>';
}
function fixMd(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,iframe').forEach(x => x.remove());
    doc.querySelectorAll('img').forEach(x => { try { x.src = new URL(x.getAttribute('src') || '', 'https://github.com/').href; } catch (e) {} });
    doc.querySelectorAll('a').forEach(x => { try { x.href = new URL(x.getAttribute('href') || '', 'https://github.com/').href; } catch (e) {} });
    return doc.body.innerHTML;
  } catch (e) { return esc(html); }
}
function openSheet(inner) { const s = $('#sheet'); s.innerHTML = '<div class="sheetcard">' + inner + '</div>'; s.hidden = false; }
function closeSheet() { const s = $('#sheet'); if (s) { s.hidden = true; s.innerHTML = ''; } }

/* ================= views: home ================= */
/* ================= views: productivity ================= */
function heatLevel(c) { return c === 0 ? 0 : c < 3 ? 1 : c < 7 ? 2 : c < 12 ? 3 : 4; }
function prodHtml(cc) {
  const cal = cc.contributionCalendar;
  const days = [];
  cal.weeks.forEach(w => w.contributionDays.forEach(d => days.push(d)));
  const byDate = {};
  days.forEach(d => byDate[d.date] = d.contributionCount);
  const dStr = off => { const t = new Date(); t.setDate(t.getDate() - off); return t.toISOString().slice(0, 10); };
  const sumLast = n => { let s = 0; for (let i = 0; i < n; i++) s += (byDate[dStr(i)] || 0); return s; };
  const week = sumLast(7), month = sumLast(30);
  let i = days.length - 1;
  while (i >= 0 && days[i].contributionCount === 0) i--;
  let cur = 0;
  while (i >= 0 && days[i].contributionCount > 0) { cur++; i--; }
  let best = 0, run = 0, bd = null;
  days.forEach(d => {
    if (d.contributionCount > 0) { run++; if (run > best) best = run; } else run = 0;
    if (!bd || d.contributionCount > bd.contributionCount) bd = d;
  });
  const avg = days.length ? cal.totalContributions / days.length : 0;
  let graph = '<div class="heatwrap">';
  cal.weeks.forEach(w => {
    graph += '<div class="heatcol">' + w.contributionDays.map(d =>
      '<span class="heatcell l' + heatLevel(d.contributionCount) + '" title="' + d.date + ' · ' + d.contributionCount + ' contributions"></span>').join('') + '</div>';
  });
  graph += '</div>';
  const legend = '<div class="lgdrow" style="margin-top:12px;align-items:center">Less ' +
    [0, 1, 2, 3, 4].map(l => '<span class="heatcell l' + l + '" style="display:inline-block"></span>').join('') + ' More</div>';
  const repos = (cc.commitContributionsByRepository || []).slice()
    .sort((a, b) => b.contributions.totalCount - a.contributions.totalCount).slice(0, 5);
  let html = '<div class="card"><div class="ltitle" style="margin-bottom:10px">Contribution graph · last 12 months</div>' + graph + legend + '</div>';
  html += '<h2 class="sect">Right now</h2><div class="card"><div class="bigstats">' +
    '<div class="bstat"><b>' + nf(week) + '</b><span>this week</span></div>' +
    '<div class="bstat"><b>' + nf(month) + '</b><span>this month</span></div>' +
    '<div class="bstat"><b>' + cur + 'd</b><span>current streak</span></div>' +
    '<div class="bstat"><b>' + best + 'd</b><span>longest streak</span></div>' +
    '<div class="bstat"><b>' + avg.toFixed(1) + '</b><span>daily average</span></div>' +
    '<div class="bstat"><b>' + nf(bd ? bd.contributionCount : 0) + '</b><span>busiest day</span></div></div></div>';
  html += '<h2 class="sect">This year on GitHub</h2><div class="card"><div class="bigstats">' +
    '<div class="bstat"><b>' + nf(cc.totalCommitContributions) + '</b><span>commits made</span></div>' +
    '<div class="bstat"><b>' + nf(cc.totalPullRequestContributions) + '</b><span>pull requests</span></div>' +
    '<div class="bstat"><b>' + nf(cc.totalIssueContributions) + '</b><span>issues</span></div>' +
    '<div class="bstat"><b>' + nf(cc.totalPullRequestReviewContributions) + '</b><span>reviews</span></div>' +
    '<div class="bstat"><b>' + nf(cc.totalRepositoryContributions) + '</b><span>new repos</span></div>' +
    '<div class="bstat"><b>' + nf(cal.totalContributions) + '</b><span>contributions</span></div></div></div>';
  html += '<h2 class="sect">Most active repositories</h2>';
  html += repos.length ? '<div class="card list">' + repos.map(r =>
    '<div class="lrow" data-go="#/repo/' + esc(r.repository.nameWithOwner) + '">' + SVG.code +
    '<div class="lmain"><div class="ltitle">' + esc(r.repository.nameWithOwner) + '</div>' +
    '<div class="lsub">' + nf(r.contributions.totalCount) + ' commits this year</div></div></div>').join('') + '</div>' :
    '<div class="card empty">No repository activity yet.</div>';
  return html;
}
async function renderProductivity() {
  const seq = ++RSEQ;
  if (!PDATE) PDATE = todayStr();
  const cached = LS.get('c.prod', null);
  const paint = cc => {
    let html = '<div class="seg" style="margin-bottom:16px"><button class="segb' + (PTAB === 'overview' ? ' on' : '') + '" data-pt="overview">Overview</button><button class="segb' + (PTAB === 'today' ? ' on' : '') + '" data-pt="today">Today</button></div>';
    html += PTAB === 'today' ? todayHtml(cc) : (cc ? prodHtml(cc) : spinner());
    if (seq !== RSEQ) return;
    view().innerHTML = html;
    $$('[data-pt]').forEach(b => b.addEventListener('click', () => { PTAB = b.dataset.pt; renderProductivity(); }));
    wireDayPicker();
  };
  paint(cached);
  const query = 'query{viewer{login contributionsCollection{totalCommitContributions totalPullRequestContributions totalIssueContributions totalPullRequestReviewContributions totalRepositoryContributions commitContributionsByRepository(maxRepositories:10){contributions{totalCount} repository{nameWithOwner stargazerCount}} contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}';
  try {
    const r = await api('/graphql', { method: 'POST', body: JSON.stringify({ query }) });
    const cc = r && r.data && r.data.viewer && r.data.viewer.contributionsCollection;
    if (!cc) throw new Error('No stats returned');
    LS.set('c.prod', cc);
    paint(cc);
  } catch (e) { if (seq !== RSEQ) return; if (!cached) view().innerHTML = errCard(e); }
  if (PTAB === 'today') loadDay();
}

/* ---- Today tab: stats for a particular day ---- */
let PTAB = 'overview', PDATE = '';
function todayStr() { return new Date().toISOString().slice(0, 10); }
function todayHtml(cc) {
  const isToday = PDATE === todayStr();
  let cnt = 0, last7 = [];
  if (cc && cc.contributionCalendar) {
    const byDate = {};
    cc.contributionCalendar.weeks.forEach(w => w.contributionDays.forEach(x => byDate[x.date] = x.contributionCount));
    cnt = byDate[PDATE] || 0;
    for (let i = 6; i >= 0; i--) {
      const t = new Date(); t.setDate(t.getDate() - i);
      const ds = t.toISOString().slice(0, 10);
      last7.push({ ds, c: byDate[ds] || 0, wd: 'SMTWTFS'.charAt(t.getDay()) });
    }
  }
  const max = Math.max.apply(null, last7.map(x => x.c).concat([1]));
  const d = new Date(PDATE + 'T00:00:00');
  return '<div class="card" style="text-align:center;padding:24px 20px">' +
    '<div class="lsub">' + (isToday ? 'Today · ' : '') + d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' +
    '<div style="font-size:52px;font-weight:800;letter-spacing:-1px;margin:6px 0 2px">' + nf(cnt) + '</div>' +
    '<div class="lsub">contributions</div></div>' +
    '<div class="card"><div class="ltitle" style="margin-bottom:6px">Last 7 days — tap a bar</div>' +
    '<div class="daybars">' + last7.map(x =>
      '<div class="daybar' + (x.ds === PDATE ? ' cur' : '') + '" data-day="' + x.ds + '"><span style="height:' + Math.max(6, Math.round(x.c / max * 76)) + 'px"></span><i>' + x.wd + '</i></div>').join('') + '</div></div>' +
    '<div class="card"><div class="ltitle" style="margin-bottom:8px">Pick a day</div>' +
    '<div style="display:flex;gap:8px"><input type="date" class="fld" id="dayPick" value="' + PDATE + '" style="flex:1">' +
    '<button class="btn ghost" id="todayBtn">Today</button></div></div>' +
    '<h2 class="sect">That day</h2><div class="card" id="dayDetail">' + spinner(true) + '</div>';
}
function wireDayPicker() {
  const dp = $('#dayPick');
  if (dp) dp.addEventListener('change', () => { PDATE = dp.value || todayStr(); renderProductivity(); });
  const tb = $('#todayBtn');
  if (tb) tb.addEventListener('click', () => { PDATE = todayStr(); renderProductivity(); });
  $$('[data-day]').forEach(b => b.addEventListener('click', () => { PDATE = b.dataset.day; renderProductivity(); }));
}
async function loadDay() {
  const seq = ++RSEQ;
  const el = $('#dayDetail'); if (!el) return;
  const q = 'query($from:DateTime!,$to:DateTime!){viewer{contributionsCollection(from:$from,to:$to){totalCommitContributions totalPullRequestContributions totalIssueContributions totalPullRequestReviewContributions commitContributionsByRepository(maxRepositories:10){contributions{totalCount} repository{nameWithOwner}}}}}';
  try {
    const r = await api('/graphql', { method: 'POST', body: JSON.stringify({ query: q, variables: { from: PDATE + 'T00:00:00Z', to: PDATE + 'T23:59:59Z' } }) });
    const cc = r && r.data && r.data.viewer && r.data.viewer.contributionsCollection;
    if (!cc) throw new Error('No data');
    const repos = (cc.commitContributionsByRepository || []).filter(x => x.contributions.totalCount > 0);
    if (seq !== RSEQ) return;
    el.innerHTML = '<div class="bigstats">' +
      '<div class="bstat"><b>' + nf(cc.totalCommitContributions) + '</b><span>commits</span></div>' +
      '<div class="bstat"><b>' + nf(cc.totalPullRequestContributions) + '</b><span>pull requests</span></div>' +
      '<div class="bstat"><b>' + nf(cc.totalIssueContributions) + '</b><span>issues</span></div>' +
      '<div class="bstat"><b>' + nf(cc.totalPullRequestReviewContributions) + '</b><span>reviews</span></div></div>' +
      (repos.length ? '<div class="ltitle" style="margin:16px 0 4px">Worked on</div><div class="list">' + repos.map(x =>
        '<div class="lrow" data-go="#/repo/' + esc(x.repository.nameWithOwner) + '">' + SVG.code +
        '<div class="lmain"><div class="ltitle">' + esc(x.repository.nameWithOwner) + '</div>' +
        '<div class="lsub">' + x.contributions.totalCount + ' commit' + (x.contributions.totalCount > 1 ? 's' : '') + '</div></div></div>').join('') + '</div>' :
        '<div class="lsub dim" style="margin-top:10px">No repository commits that day.</div>');
  } catch (e) { if (seq !== RSEQ) return; el.innerHTML = '<div class="lsub dim">Could not load the details for this day.</div>'; }
}

/* ================= activity history (persistent, never cleared) ================= */
function mergeHist(evs) {
  const old = LS.get('c.hist', null) || LS.get('c.feed', null) || [];
  const map = new Map();
  old.forEach(e => { if (e && e.id) map.set(e.id, e); });
  (evs || []).forEach(e => { if (e && e.id) map.set(e.id, e); });
  const merged = Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  LS.set('c.hist', merged.slice(0, 300));
  return merged.slice(0, 300);
}
async function refreshActivity(login) {
  const own = await api('/users/' + login + '/events?per_page=100').catch(() => []);
  const rec = await api('/users/' + login + '/received_events?per_page=50').catch(() => []);
  return mergeHist((Array.isArray(own) ? own : []).concat(Array.isArray(rec) ? rec : []));
}

async function renderHome() {
  const seq = ++RSEQ;
  checkUpdate();
  const u = USER || await api('/user');
  let html = '<div class="card profile"><button class="pavalert" data-go="#/notifs" aria-label="Alerts">' + SVG.bell + '</button><img class="pav" src="' + esc(u.avatar_url) + '" alt="">' +
    '<div class="pname">' + esc(u.name || u.login) + '</div>' +
    '<div class="plogin" data-go="#/user/' + esc(u.login) + '">@' + esc(u.login) + '</div>' +
    (u.bio ? '<p class="pbio">' + esc(u.bio) + '</p>' : '') +
    '<div class="pstats">' +
    '<div class="pstat"><b>' + nf(u.public_repos) + '</b><span>repos</span></div>' +
    '<div class="pstat"><b>' + nf(u.followers) + '</b><span>followers</span></div>' +
    '<div class="pstat"><b>' + nf(u.following) + '</b><span>following</span></div></div></div>';
  html += '<div class="card quicklinks"><button class="btn ghost" data-go="#/productivity">Productivity</button><button class="btn ghost" data-act="discover">Discover</button><button class="btn ghost" data-go="#/user/' + esc(u.login) + '">My profile</button></div>';
  html += '<h2 class="sect">Pinned repositories</h2>';
  html += pins.length ? pins.map(repoRow).join('') : '<div class="card empty">Star any repository in the Repositories tab to pin it here.<br><span class="dim">Pins sync to all your devices via your GitHub account.</span></div>';
  const feedHtml = evs => (evs.length ? '<div class="card list">' + evs.slice(0, 3).map(eventRow).join('') + '</div>' : '<div class="card empty">Nothing here yet — your GitHub activity will show up as you go.</div>') +
    '<button class="btn ghost btnblock" style="margin-top:12px" id="allActBtn">View all activity</button>';
  const cHist = LS.get('c.hist', null) || LS.get('c.feed', null) || [];
  html += '<h2 class="sect">Recent activity</h2><div id="feedWrap">' + (cHist.length ? feedHtml(cHist) : spinner()) + '</div>';
  if (seq !== RSEQ) return;
  view().innerHTML = html;
  const wireAct = () => { const nb = $('#allActBtn'); if (nb) nb.addEventListener('click', () => location.hash = '#/activity'); };
  wireAct();
  try {
    const merged = await refreshActivity(u.login);
    const fw = $('#feedWrap');
    if (fw && seq === RSEQ) fw.innerHTML = feedHtml(merged);
    wireAct();
  } catch (e) { if (seq !== RSEQ) return; if (!cHist.length) { const fw = $('#feedWrap'); if (fw) fw.innerHTML = errCard(e); } }
}

async function renderActivity() {
  const seq = ++RSEQ;
  const u = USER || await api('/user');
  const cHist = LS.get('c.hist', null) || LS.get('c.feed', null) || [];
  if (seq !== RSEQ) return;
  view().innerHTML = cHist.length ? '<div class="card list">' + cHist.map(eventRow).join('') + '</div>' : spinner();
  try {
    const merged = await refreshActivity(u.login);
    if (seq !== RSEQ) return;
    view().innerHTML = merged.length ? '<div class="card list">' + merged.map(eventRow).join('') + '</div>' : '<div class="card empty">No activity yet.</div>';
  } catch (e) { if (seq !== RSEQ) return; if (!cHist.length) view().innerHTML = errCard(e); }
}

/* ================= views: repos (mine / starred / discover + search) ================= */
let RS = { mode: 'mine', q: '', page: 1, items: [] };
async function renderRepos() {
  const seq = ++RSEQ;
  RS = { mode: RS.mode || 'mine', q: '', page: 1, items: [] };
  if (seq !== RSEQ) return;
  view().innerHTML = '<button class="btn ghost btnblock" id="newRepoBtn" style="margin-bottom:12px">New repository</button>' +
    '<div class="searchbar" id="searchWrap">' + SVG.search + '<input id="repoSearch" placeholder="Search repos and people…" autocomplete="off"></div>' +
    '<div class="seg" id="repoSeg">' +
    '<button class="segb' + (RS.mode === 'mine' ? ' on' : '') + '" data-mode="mine">Mine</button>' +
    '<button class="segb' + (RS.mode === 'starred' ? ' on' : '') + '" data-mode="starred">Starred</button>' +
    '<button class="segb' + (RS.mode === 'discover' ? ' on' : '') + '" data-mode="discover">Discover</button></div>' +
    '<div id="repoList">' + spinner() + '</div>' +
    '<button id="repoMore" class="morebtn" hidden>Load more</button>';
  $('#newRepoBtn').addEventListener('click', newRepoSheet);
  let t;
  $('#repoSearch').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { RS.q = e.target.value.trim(); loadRepos(true); }, 450); });
  $('#repoSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); RS.q = e.target.value.trim(); loadRepos(true); } });
  $$('#repoSeg .segb').forEach(b => b.addEventListener('click', () => { RS.mode = b.dataset.mode; renderRepos(); }));
  $('#repoMore').addEventListener('click', () => { RS.page++; loadRepos(false); });
  loadRepos(true);
}
async function loadRepos(reset) {
  const seq = ++RSEQ;
  const list = $('#repoList'); if (!list) return;
  if (reset) { RS.page = 1; RS.items = []; list.innerHTML = spinner(); }
  if (reset && RS.q.length < 2 && RS.mode !== 'discover') {
    const cd = cached(RS.mode === 'starred' ? '/user/starred?per_page=30&page=1' : '/user/repos?sort=updated&per_page=30&page=1');
    if (cd && Array.isArray(cd) && cd.length) {
      cd.forEach(r => repoCache.set(r.full_name, r));
      RS.items = cd;
      list.innerHTML = cd.map(repoRow).join('');
    }
  }
  $('#searchWrap').style.display = (RS.mode === 'discover') ? 'none' : '';
  let data = [], people = null;
  try {
    if (RS.mode === 'discover') {
      const res = await api('/search/repositories?q=stars%3A%3E10000+pushed%3A%3E' + isoDaysAgo(90) + '&sort=stars&order=desc&per_page=30&page=' + RS.page);
      data = res.items || [];
    } else if (RS.q.length >= 2) {
      const q = RS.q + (RS.mode === 'starred' && USER ? ' user:' + USER.login : '');
      const both = await Promise.all([
        api('/search/repositories?q=' + encodeURIComponent(q) + '&sort=updated&per_page=30&page=' + RS.page),
        api('/search/users?q=' + encodeURIComponent(RS.q) + '&per_page=15').catch(() => null)
      ]);
      data = both[0].items || [];
      people = both[1];
    } else if (RS.mode === 'starred') {
      data = await api('/user/starred?per_page=30&page=' + RS.page);
    } else {
      data = await api('/user/repos?sort=updated&per_page=30&page=' + RS.page);
    }
  } catch (e) { if (seq !== RSEQ) return; list.innerHTML = errCard(e); return; }
  data.forEach(r => repoCache.set(r.full_name, r));
  RS.items = reset ? data : RS.items.concat(data);
  let html = '';
  if (people && people.total_count > 0) {
    html += '<div class="card" style="padding:0 0 4px"><div class="lsub" style="padding:14px 20px 0">People</div><div class="peoplebar">' +
      people.items.map(u => '<button class="person" data-go="#/user/' + esc(u.login) + '"><img src="' + esc(u.avatar_url) + '" alt=""><span>' + esc(u.login) + '</span></button>').join('') +
      '</div></div>';
  }
  if (RS.items.length) html += RS.items.map(repoRow).join('');
  else html += '<div class="card empty">' + (RS.q ? 'No results for "' + esc(RS.q) + '"' : (RS.mode === 'discover' ? 'Nothing trending right now.' : 'Nothing here yet.')) + '</div>';
  if (seq !== RSEQ) return;
  list.innerHTML = html;
  $('#repoMore').hidden = data.length < 30;
}

/* ================= views: repo detail ================= */
async function renderRepo(o, n) {
  const seq = ++RSEQ;
  const full = o + '/' + n;
  let r = cached('/repos/' + full) || null;
  if (r) api('/repos/' + full).then(fr => { if (fr && fr.full_name) repoCache.set(fr.full_name, fr); }).catch(() => {});
  if (!r) { try { r = await api('/repos/' + full); } catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; } }
  repoCache.set(r.full_name, r);
  let html = '<div class="card">' +
    '<div class="rcrow"><div class="rcname">' + esc(r.name) + '</div>' +
    '<button class="pinbtn ' + (isPinned(r.full_name) ? 'pinned' : '') + '" data-pinbtn="' + esc(r.full_name) + '" aria-label="pin">' + SVG.star + '</button></div>' +
    '<div class="chips"><span class="chip">' + (r.private ? 'Private' : 'Public') + '</span>' +
    (r.fork ? '<span class="chip">Fork</span>' : '') + (r.archived ? '<span class="chip warn">Archived</span>' : '') +
    (r.default_branch ? '<span class="chip">' + esc(r.default_branch) + '</span>' : '') + '</div>' +
    (r.description ? '<p class="rcdesc">' + esc(r.description) + '</p>' : '') +
    (r.topics && r.topics.length ? '<div class="chips">' + r.topics.slice(0, 8).map(t => '<span class="chip pr">' + esc(t) + '</span>').join('') + '</div>' : '') +
    '<div class="rcmeta">' + SVG.star + ' ' + nf(r.stargazers_count) + ' · ' + SVG.fork + ' ' + nf(r.forks_count) +
    (r.language ? ' · <span class="dot" style="background:' + langColor(r.language) + '"></span>' + esc(r.language) : '') + '</div>' +
    '<div class="bigstats">' +
    '<div class="bstat"><b>' + nf(r.open_issues_count) + '</b><span>issues</span></div>' +
    '<div class="bstat"><b>' + nf(r.watchers_count) + '</b><span>watchers</span></div>' +
    '<div class="bstat"><b>' + tAgo(r.pushed_at) + '</b><span>last push</span></div></div></div>';
  html += '<div class="card metarow" id="metaRow">' + spinner(true) + '</div>';
  html += '<div class="card"><div class="actionrow">' +
    '<button class="btn ghost" id="actStar">' + SVG.star + '<span>Star</span></button>' +
    '<button class="btn ghost" id="actWatch">' + SVG.eye + '<span>Watch</span></button>' +
    '<button class="btn ghost" id="actFork">' + SVG.fork + '<span>Fork</span></button>' +
    '<button class="btn ghost" data-act="ext" data-url="' + esc(r.html_url) + '">' + SVG.ext + '<span>Open</span></button>' +
    '</div></div>';
  if (r.permissions && r.permissions.push) {
    html += '<div class="card"><button class="btn ghost btnblock" id="editRepoBtn">Edit repository</button></div>';
  }
  html += '<div class="seg"><a class="segb on" href="#/repo/' + full + '">Readme</a>' +
    '<a class="segb" href="#/repo/' + full + '/files">Files</a>' +
    '<a class="segb" href="#/repo/' + full + '/commits">Commits</a>' +
    '<a class="segb" href="#/repo/' + full + '/issues">Issues</a></div>';
  html += '<div id="readmeWrap">' + spinner() + '</div>';
  html += '<div id="langWrap"></div>';
  if (seq !== RSEQ) return;
  view().innerHTML = html;
  // contributors + latest release
  const [contribs, release] = await Promise.all([
    api('/repos/' + full + '/contributors?per_page=9').catch(() => null),
    api('/repos/' + full + '/releases/latest').catch(() => null)
  ]);
  let meta = '<div class="mrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
    '<div class="lmain"><div class="ltitle">Contributors</div>' +
    (contribs && contribs.length ? '' : '<div class="lsub">none listed</div>') + '</div>' +
    '<div class="avatars">' + (contribs || []).map(c => '<img data-go="#/user/' + esc(c.login) + '" src="' + esc(c.avatar_url) + '" alt="' + esc(c.login) + '" title="' + esc(c.login) + '">').join('') + '</div></div>';
  if (release && release.tag_name) {
    meta += '<div class="mrow" data-go="#/repo/' + full + '/releases">' + SVG.tag +
      '<div class="lmain"><div class="ltitle">Releases · latest ' + esc(release.tag_name) + '</div>' +
      '<div class="lsub">' + tAgo(release.published_at) + (release.author ? ' · by ' + esc(release.author.login) : '') + ' — tap to view and download</div></div></div>';
  } else {
    meta += '<div class="mrow" data-go="#/repo/' + full + '/releases">' + SVG.tag +
      '<div class="lmain"><div class="ltitle">Releases</div>' +
      '<div class="lsub">view all releases</div></div></div>';
  }
  meta += '<div class="mrow" data-act="clone" data-full="' + esc(full) + '">' + SVG.code +
    '<div class="lmain"><div class="ltitle">Clone</div>' +
    '<div class="lsub">HTTPS / SSH URLs and ZIP download</div></div></div>';
  const mr = $('#metaRow'); if (mr) mr.innerHTML = meta;
  // repo actions: star / watch / fork
  const starBtn = $('#actStar'), watchBtn = $('#actWatch'), forkBtn = $('#actFork');
  const editBtn = $('#editRepoBtn');
  if (editBtn) editBtn.addEventListener('click', () => editRepoSheet(o, n, r));
  if (starBtn) {
    api('/user/starred/' + full, { status: true }).then(s => {
      if (s && s.status === 204) { starBtn.classList.add('on'); starBtn.querySelector('span').textContent = 'Starred'; }
    }).catch(() => {});
    starBtn.addEventListener('click', async () => {
      const on = starBtn.classList.contains('on');
      try {
        await api('/user/starred/' + full, { method: on ? 'DELETE' : 'PUT' });
        starBtn.classList.toggle('on', !on);
        starBtn.querySelector('span').textContent = on ? 'Star' : 'Starred';
        toast(on ? 'Unstarred ' + n : 'Starred ' + n);
      } catch (e) { toast('Failed: ' + e.message); }
    });
  }
  if (watchBtn) {
    api('/repos/' + full + '/subscription', { status: true }).then(s => {
      if (s && s.status === 200) { watchBtn.classList.add('on'); watchBtn.querySelector('span').textContent = 'Watching'; }
    }).catch(() => {});
    watchBtn.addEventListener('click', async () => {
      const on = watchBtn.classList.contains('on');
      try {
        await api('/repos/' + full + '/subscription', { method: on ? 'DELETE' : 'PUT', body: on ? undefined : JSON.stringify({ subscribed: true }) });
        watchBtn.classList.toggle('on', !on);
        watchBtn.querySelector('span').textContent = on ? 'Watch' : 'Watching';
        toast(on ? 'Stopped watching ' + n : 'Watching ' + n);
      } catch (e) { toast('Failed: ' + e.message); }
    });
  }
  if (forkBtn) {
    forkBtn.addEventListener('click', async () => {
      if (!window.confirm('Fork ' + full + ' to your account?')) return;
      try {
        const f = await api('/repos/' + full + '/forks', { method: 'POST' });
        toast('Forked to ' + f.full_name);
        location.hash = '#/repo/' + f.full_name;
      } catch (e) { toast('Failed: ' + e.message); }
    });
  }
  api('/repos/' + full + '/languages').then(langs => {
    const lw = $('#langWrap'); if (lw && langs && Object.keys(langs).length) lw.innerHTML = langBars(langs);
  }).catch(() => {});
  // readme
  try {
    const md = await api('/repos/' + full + '/readme', { accept: 'application/vnd.github.html', text: true });
    const rw = $('#readmeWrap');
    if (rw && seq === RSEQ) rw.innerHTML = '<div class="card md">' + fixMd(md) + '</div>';
  } catch (e) { if (seq !== RSEQ) return; const rw = $('#readmeWrap'); if (rw) rw.innerHTML = '<div class="card empty">No README found.</div>'; }
}

async function renderFiles(o, n, path) {
  const seq = ++RSEQ;
  const full = o + '/' + n;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let items;
  try { items = await api('/repos/' + full + '/contents/' + (path ? encodeURIComponent(path).replace(/%2F/g, '/') : '')); }
  catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  if (!Array.isArray(items)) { view().innerHTML = '<div class="card empty">Not a folder.</div>'; return; }
  items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : (a.type === 'dir' ? -1 : 1)));
  let html = path ? '<div class="card crumb">/' + esc(path) + '</div>' : '';
  html += '<div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn ghost" id="addFileBtn" style="flex:1">Add file</button><button class="btn ghost" id="upFileBtn" style="flex:1">Upload files</button><button class="btn ghost" id="upDirBtn" style="flex:1">Upload folder</button></div>';
  html += '<input type="file" id="upInput" multiple hidden>';
  html += '<div class="card list">';
  if (path) {
    const parent = path.split('/').slice(0, -1).join('/');
    html += '<div class="lrow" data-go="#/repo/' + full + '/files' + (parent ? '/' + parent : '') + '">' + SVG.folder + '<div class="lmain"><div class="ltitle">..</div></div></div>';
  }
  items.forEach(it => {
    if (it.type === 'dir') html += '<div class="lrow" data-go="#/repo/' + full + '/files/' + it.path + '">' + SVG.folder + '<div class="lmain"><div class="ltitle">' + esc(it.name) + '</div></div></div>';
    else html += '<div class="lrow" data-act="openfile" data-repo="' + esc(full) + '" data-file="' + esc(it.path) + '">' + SVG.file + '<div class="lmain"><div class="ltitle">' + esc(it.name) + '</div><div class="lsub">' + fmtSize(it.size) + '</div></div></div>';
  });
  html += '</div>';
  if (seq !== RSEQ) return;
  view().innerHTML = html;
  $('#addFileBtn').addEventListener('click', () => addFileSheet(o, n, path));
  const upi = $('#upInput');
  $('#upFileBtn').addEventListener('click', () => upi.click());
  const udb = $('#upDirBtn');
  if (udb) udb.addEventListener('click', () => {
    if (!(window.OneGit && window.OneGit.pickFolder)) { toast('Folder upload is not available'); return; }
    folderCtx = { o, n, dir: path || '', jid: null };
    folderQ = []; folderEnd = false; folderOk = 0; folderFail = 0; folderSkip = 0;
    try { window.OneGit.pickFolder(); upProgShow('Uploading folder'); upProgUpdate('Scanning folder…', 0); } catch (e) { folderCtx = null; toast('Could not open the folder picker'); }
  });
  upi.addEventListener('change', async () => {
    const files = Array.from(upi.files || []);
    if (!files.length) return;
    upProgShow('Uploading files');
    let done = 0;
    for (const f of files) {
      upProgUpdate(f.name + ' · ' + done + ' / ' + files.length, done / files.length * 100);
      try {
        const b64 = await fileToB64(f);
        const p = path ? path + '/' + f.name : f.name;
        const body = { message: 'Upload ' + f.name, content: b64 };
        const meta = await api('/repos/' + o + '/' + n + '/contents/' + p, { status: true }).catch(() => null);
        if (meta && meta.ok && meta.data && meta.data.sha) body.sha = meta.data.sha;
        await api('/repos/' + o + '/' + n + '/contents/' + p, { method: 'PUT', body: JSON.stringify(body) });
        done++;
      } catch (e) { toast('Failed: ' + f.name + ' — ' + e.message); }
    }
    upProgUpdate('Complete — ' + done + ' of ' + files.length + ' uploaded', 100);
    setTimeout(upProgHide, 3000);
    if (done) {
      try { if (window.OneGit && window.OneGit.notify) window.OneGit.notify('Upload complete', done + ' file' + (done === 1 ? '' : 's') + ' uploaded to ' + o + '/' + n); } catch (e) {}
      renderFiles(o, n, path);
    }
    upi.value = '';
  });
  let lpTimer = null, lpFired = false;
  view().querySelectorAll('[data-act="openfile"]').forEach(row => {
    row.addEventListener('pointerdown', () => {
      lpFired = false;
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => {
        lpFired = true;
        try { if (navigator.vibrate) navigator.vibrate(25); } catch (er) {}
        confirmDeleteFile(row.dataset.repo, row.dataset.file);
      }, 550);
    });
    const cancel = () => clearTimeout(lpTimer);
    row.addEventListener('pointerup', cancel);
    row.addEventListener('pointerleave', cancel);
    row.addEventListener('pointercancel', cancel);
    row.addEventListener('click', e => { if (lpFired) { e.stopImmediatePropagation(); e.preventDefault(); lpFired = false; } }, true);
  });
}

async function renderCommits(o, n) {
  const seq = ++RSEQ;
  const full = o + '/' + n;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let items;
  try { items = await api('/repos/' + full + '/commits?per_page=30'); }
  catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  if (!items.length) { view().innerHTML = '<div class="card empty">No commits found.</div>'; return; }
  if (seq !== RSEQ) return;
  view().innerHTML = '<div class="card list">' + items.map(commitRow).join('') + '</div>';
}

async function renderCommit(o, n, sha) {
  const seq = ++RSEQ;
  const full = o + '/' + n;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let c;
  try { c = await api('/repos/' + full + '/commits/' + sha); }
  catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  const lines = (c.commit && c.commit.message ? c.commit.message : '').split('\n');
  const title = lines[0];
  const rest = lines.slice(1).join('\n').trim();
  const who = c.author ? c.author.login : (c.commit && c.commit.author ? c.commit.author.name : 'unknown');
  const av = c.author ? c.author.avatar_url : '';
  let html = '<div class="card"><div class="crow">' + (av ? '<img class="cav" src="' + esc(av) + '" alt="">' : SVG.commit) +
    '<b data-go="#/user/' + esc(who) + '">' + esc(who) + '</b><span class="chip">' + c.sha.slice(0, 7) + '</span></div>' +
    '<div class="ihtitle">' + esc(title) + '</div>' +
    (rest ? '<p class="rcdesc" style="-webkit-line-clamp:8">' + esc(rest) + '</p>' : '') +
    '<div class="ihmeta">' + tAgo(c.commit && c.commit.author ? c.commit.author.date : '') + (c.commit && c.commit.verification && c.commit.verification.verified ? ' · verified' : '') + '</div>';
  if (c.stats) {
    html += '<div class="commitstats">' +
      '<div class="cstat add">+' + nf(c.stats.additions) + '<span>additions</span></div>' +
      '<div class="cstat del">-' + nf(c.stats.deletions) + '<span>deletions</span></div>' +
      '<div class="cstat total">' + nf(c.stats.total) + '<span>changes</span></div></div>';
  }
  html += '</div>';
  html += '<h2 class="sect">Changed files (' + (c.files ? c.files.length : 0) + ')</h2>';
  if (!c.files || !c.files.length) html += '<div class="card empty">No file changes listed.</div>';
  else c.files.slice(0, 40).forEach(f => {
    html += '<div class="card"><div class="filehead">' + SVG.file +
      '<b style="font-size:13px;word-break:break-all">' + esc(f.filename) + '</b>' +
      (f.status === 'added' ? '<span class="chip add">added</span>' : f.status === 'removed' ? '<span class="chip del">removed</span>' : f.status === 'renamed' ? '<span class="chip">renamed</span>' : '<span class="chip">modified</span>') + '</div>';
    if (f.patch) {
      const ls = f.patch.split('\n').slice(0, 400);
      html += '<div class="patchpre">' + ls.map(l => {
        let cls = '';
        if (l.startsWith('+')) cls = 'add'; else if (l.startsWith('-')) cls = 'del'; else if (l.startsWith('@@')) cls = 'hh';
        return '<div class="pline ' + cls + '">' + esc(l || ' ') + '</div>';
      }).join('') + '</div>';
    }
    html += '</div>';
  });
  if (seq !== RSEQ) return;
  view().innerHTML = html;
}

async function renderReleases(o, n) {
  const seq = ++RSEQ;
  const full = o + '/' + n;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let items;
  try { items = await api('/repos/' + full + '/releases?per_page=30'); }
  catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  if (!items.length) { view().innerHTML = '<button class="btn ghost btnblock" id="newRelBtn" style="margin-bottom:12px">New release</button><div class="card empty">No releases published yet.<br><span class="dim">Create one above — tag a version, describe it, done.</span></div><input type="file" id="relUpInput" hidden>'; $('#newRelBtn').addEventListener('click', () => newReleaseSheet(o, n)); return; }
  let html = '<button class="btn ghost btnblock" id="newRelBtn" style="margin-bottom:12px">New release</button><input type="file" id="relUpInput" hidden>';
  items.forEach(rl => {
    html += '<div class="card">' +
      '<div class="rcrow"><div class="rcname">' + esc(rl.name || rl.tag_name) + '</div>' +
      '<span class="chip">' + esc(rl.tag_name) + '</span></div>' +
      '<div class="chips">' + (rl.prerelease ? '<span class="chip warn">pre-release</span>' : '') +
      (rl.draft ? '<span class="chip">draft</span>' : '') + '</div>' +
      (rl.body ? '<div class="relbody">' + esc(rl.body) + '</div>' : '') +
      '<div class="rcmeta">' + tAgo(rl.published_at) + (rl.author ? ' · by ' + esc(rl.author.login) : '') + '</div>';
    // release assets — in-app downloads
    if (rl.assets && rl.assets.length) {
      html += '<div class="assetlist">';
      rl.assets.forEach(a => {
        html += '<div class="lrow" data-act="download" data-url="' + esc(a.browser_download_url) + '" data-name="' + esc(a.name) + '">' + SVG.dl +
          '<div class="lmain"><div class="ltitle">' + esc(a.name) + '</div>' +
          '<div class="lsub">' + fmtSize(a.size) + ' · ' + nf(a.download_count) + ' downloads</div></div>' +
          '<button class="iconbtn" data-act="delasset" data-full="' + esc(full) + '" data-aid="' + a.id + '" data-aname="' + esc(a.name) + '" aria-label="delete file">' + SVG.x + '</button></div>';
      });
      html += '</div>';
    }
    // source code archives
    html += '<div class="assetlist">' +
      '<div class="lrow" data-act="download" data-url="https://github.com/' + full + '/archive/refs/tags/' + esc(rl.tag_name) + '.zip" data-name="' + esc(n + '-' + rl.tag_name + '.zip') + '">' + SVG.dl +
      '<div class="lmain"><div class="ltitle">Source code (zip)</div><div class="lsub">complete snapshot of ' + esc(rl.tag_name) + '</div></div></div>' +
      '<div class="lrow" data-act="download" data-url="https://github.com/' + full + '/archive/refs/tags/' + esc(rl.tag_name) + '.tar.gz" data-name="' + esc(n + '-' + rl.tag_name + '.tar.gz') + '">' + SVG.dl +
      '<div class="lmain"><div class="ltitle">Source code (tar.gz)</div><div class="lsub">complete snapshot of ' + esc(rl.tag_name) + '</div></div></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn sm ghost" data-act="relup" data-relup="' + rl.id + '" style="flex:1">Upload files</button>' +
      '<button class="btn sm ghost" data-rel="' + rl.id + '" style="flex:1">Edit release</button></div></div>';
  });
  if (seq !== RSEQ) return;
  view().innerHTML = html;
  $$('[data-rel]').forEach(b => b.addEventListener('click', () => {
    const rl = items.find(x => String(x.id) === b.dataset.rel);
    if (rl) editReleaseSheet(o, n, rl);
  }));
  $('#newRelBtn').addEventListener('click', () => newReleaseSheet(o, n));
  $('#relUpInput').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    const rid = window._relTarget;
    e.target.value = '';
    if (!f || !rid) return;
    toast('Uploading ' + f.name + '…');
    try { await uploadAsset(full, rid, f); toast('Uploaded ' + f.name); renderReleases(o, n); }
    catch (er) { toast('Failed: ' + er.message); }
  });
}

function cloneSheet(full) {
  const https = 'https://github.com/' + full + '.git';
  const ssh = 'git@github.com:' + full + '.git';
  openSheet('<div class="sheethead"><b>Clone ' + esc(full) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">HTTPS</label>' +
    '<div class="clonebar"><input class="fld" readonly value="' + esc(https) + '"><button class="iconbtn" data-act="copy" data-copy="' + esc(https) + '">' + SVG.copy + '</button></div>' +
    '<label class="fldlabel" style="margin-top:12px">SSH</label>' +
    '<div class="clonebar"><input class="fld" readonly value="' + esc(ssh) + '"><button class="iconbtn" data-act="copy" data-copy="' + esc(ssh) + '">' + SVG.copy + '</button></div>' +
    '<button class="btn primary btnblock" style="margin-top:16px" data-act="download" data-url="https://github.com/' + full + '/archive/HEAD.zip" data-name="' + esc(full.split('/')[1]) + '-main.zip">Download ZIP</button>');
}

async function renderRepoIssues(o, n) {
  const seq = ++RSEQ;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let items;
  try { items = await api('/repos/' + o + '/' + n + '/issues?state=all&sort=updated&per_page=50'); }
  catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  const newBtn = '<button class="btn ghost btnblock" id="newIssueBtn" style="margin-bottom:12px">New issue</button>';
  if (!items.length) {
    if (seq !== RSEQ) return;
    view().innerHTML = newBtn + '<div class="card empty">No issues yet — nice and quiet.</div>';
    $('#newIssueBtn').addEventListener('click', () => newIssueSheet(o, n));
    return;
  }
  if (seq !== RSEQ) return;
  view().innerHTML = newBtn + '<div class="card list">' + items.map(issueRow).join('') + '</div>';
  $('#newIssueBtn').addEventListener('click', () => newIssueSheet(o, n));
}

function repoPickerSheet(cb) {
  openSheet('<div class="sheethead"><b>Pick a repository</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<div id="rpList" style="max-height:60vh;overflow:auto">' + spinner() + '</div>');
  api('/user/repos?per_page=100&sort=pushed').then(repos => {
    const el = $('#rpList');
    if (!el) return;
    if (!repos.length) { el.innerHTML = '<div class="card empty">No repositories found.</div>'; return; }
    el.innerHTML = '<div class="card list">' + repos.map(r =>
      '<div class="lrow" data-pick="' + esc(r.full_name) + '">' + SVG.folder + '<div class="lmain"><div class="ltitle">' + esc(r.name) + '</div><div class="lsub">' + esc(r.full_name) + (r.description ? ' · ' + esc(r.description.slice(0, 60)) : '') + '</div></div></div>').join('') + '</div>';
    $$('[data-pick]').forEach(row => row.addEventListener('click', () => {
      const parts = row.dataset.pick.split('/');
      cb(parts[0], parts[1]);
    }));
  }).catch(e => { const el = $('#rpList'); if (el) el.innerHTML = errCard(e); });
}

function newIssueSheet(o, n) {
  openSheet('<div class="sheethead"><b>New issue — ' + esc(n) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<input class="fld" id="niTitle" placeholder="Issue title" style="margin-bottom:10px">' +
    '<textarea id="niBody" class="replyta" placeholder="Describe the issue…"></textarea>' +
    '<button class="btn primary btnblock" id="niSubmit" style="margin-top:12px">Submit issue</button>');
  $('#niSubmit').addEventListener('click', async () => {
    const title = $('#niTitle').value.trim(), body = $('#niBody').value;
    if (!title) { toast('Add a title first'); return; }
    $('#niSubmit').disabled = true;
    try {
      const iss = await api('/repos/' + o + '/' + n + '/issues', { method: 'POST', body: JSON.stringify({ title, body }) });
      closeSheet(); toast('Issue #' + iss.number + ' created');
      location.hash = '#/issue/' + o + '/' + n + '/' + iss.number;
    } catch (e) { toast('Failed: ' + e.message); $('#niSubmit').disabled = false; }
  });
}

/* ================= create sheets (repo / gist / file / profile) ================= */
function newRepoSheet() {
  openSheet('<div class="sheethead"><b>New repository</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">Repository name</label>' +
    '<input class="fld" id="nrName" placeholder="my-awesome-project" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:12px">Description (optional)</label>' +
    '<input class="fld" id="nrDesc" placeholder="A short description" autocomplete="off">' +
    '<div class="seg" style="margin:16px 0 0"><button class="segb on" data-vis="private">Private</button><button class="segb" data-vis="public">Public</button></div>' +
    '<div class="setrow" style="margin-top:16px"><div class="lmain"><div class="ltitle">Initialize with README</div><div class="lsub">Adds a starter README.md</div></div><button class="switch" id="nrReadme"></button></div>' +
    '<button class="btn primary btnblock" id="nrSubmit" style="margin-top:18px">Create repository</button>');
  let vis = 'private';
  $$('[data-vis]').forEach(b => b.addEventListener('click', () => { vis = b.dataset.vis; $$('[data-vis]').forEach(x => x.classList.toggle('on', x === b)); }));
  const rmSw = $('#nrReadme');
  rmSw.addEventListener('click', () => rmSw.classList.toggle('on'));
  $('#nrSubmit').addEventListener('click', async () => {
    const name = $('#nrName').value.trim();
    if (!name) { toast('Give your repo a name'); return; }
    $('#nrSubmit').disabled = true;
    try {
      const r = await api('/user/repos', { method: 'POST', body: JSON.stringify({ name, description: $('#nrDesc').value.trim(), private: vis === 'private', auto_init: rmSw.classList.contains('on') }) });
      closeSheet(); toast('Created ' + r.full_name);
      location.hash = '#/repo/' + r.full_name;
    } catch (e) { toast('Failed: ' + e.message); $('#nrSubmit').disabled = false; }
  });
}

function newGistSheet() {
  openSheet('<div class="sheethead"><b>New gist</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">Description (optional)</label>' +
    '<input class="fld" id="ngDesc" placeholder="What is this snippet?">' +
    '<label class="fldlabel" style="margin-top:12px">Filename</label>' +
    '<input class="fld" id="ngFile" value="snippet.txt" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:12px">Content</label>' +
    '<textarea class="replyta" id="ngBody" placeholder="Paste or write your code here…"></textarea>' +
    '<div class="seg" style="margin:16px 0 0"><button class="segb on" data-gvis="secret">Secret</button><button class="segb" data-gvis="public">Public</button></div>' +
    '<button class="btn primary btnblock" id="ngSubmit" style="margin-top:18px">Create gist</button>');
  let gvis = 'secret';
  $$('[data-gvis]').forEach(b => b.addEventListener('click', () => { gvis = b.dataset.gvis; $$('[data-gvis]').forEach(x => x.classList.toggle('on', x === b)); }));
  $('#ngSubmit').addEventListener('click', async () => {
    const fname = $('#ngFile').value.trim() || 'snippet.txt';
    const content = $('#ngBody').value;
    if (!content.trim()) { toast('Write something first'); return; }
    $('#ngSubmit').disabled = true;
    try {
      const files = {}; files[fname] = { content };
      const g = await api('/gists', { method: 'POST', body: JSON.stringify({ description: $('#ngDesc').value.trim(), public: gvis === 'public', files }) });
      closeSheet(); toast('Gist created');
      location.hash = '#/gist/' + g.id;
    } catch (e) { toast('Failed: ' + e.message); $('#ngSubmit').disabled = false; }
  });
}

function addFileSheet(o, n, path) {
  openSheet('<div class="sheethead"><b>Add file — ' + esc(n + '/' + (path || '')) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">Filename</label>' +
    '<input class="fld" id="afName" placeholder="hello.js" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:12px">Content</label>' +
    '<textarea class="replyta" id="afBody" placeholder="File contents…"></textarea>' +
    '<label class="fldlabel" style="margin-top:12px">Commit message</label>' +
    '<input class="fld" id="afMsg" placeholder="Create file" autocomplete="off">' +
    '<button class="btn primary btnblock" id="afSubmit" style="margin-top:18px">Commit file</button>');
  $('#afSubmit').addEventListener('click', async () => {
    const fname = $('#afName').value.trim();
    if (!fname) { toast('Give the file a name'); return; }
    const content = $('#afBody').value;
    if (!content) { toast('File is empty'); return; }
    $('#afSubmit').disabled = true;
    try {
      const b64 = btoa(unescape(encodeURIComponent(content)));
      const p = path ? path + '/' + fname : fname;
      const body = { message: $('#afMsg').value.trim() || ('Create ' + fname), content: b64 };
      const meta = await api('/repos/' + o + '/' + n + '/contents/' + p, { status: true }).catch(() => null);
      if (meta && meta.ok && meta.data && meta.data.sha) body.sha = meta.data.sha;
      await api('/repos/' + o + '/' + n + '/contents/' + p, { method: 'PUT', body: JSON.stringify(body) });
      closeSheet(); toast('Committed ' + fname);
      renderFiles(o, n, path);
    } catch (e) { toast('Failed: ' + e.message); $('#afSubmit').disabled = false; }
  });
}

function editProfileSheet() {
  const u = USER || {};
  openSheet('<div class="sheethead"><b>Edit profile</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">Name</label>' +
    '<input class="fld" id="epName" value="' + esc(u.name || '') + '">' +
    '<label class="fldlabel" style="margin-top:12px">Bio</label>' +
    '<textarea class="replyta" id="epBio" style="min-height:90px">' + esc(u.bio || '') + '</textarea>' +
    '<label class="fldlabel" style="margin-top:12px">Location</label>' +
    '<input class="fld" id="epLoc" value="' + esc(u.location || '') + '">' +
    '<button class="btn primary btnblock" id="epSubmit" style="margin-top:18px">Save profile</button>');
  $('#epSubmit').addEventListener('click', async () => {
    $('#epSubmit').disabled = true;
    try {
      USER = await api('/user', { method: 'PATCH', body: JSON.stringify({ name: $('#epName').value.trim(), bio: $('#epBio').value.trim(), location: $('#epLoc').value.trim() }) });
      closeSheet(); toast('Profile updated');
      if (location.hash === '#/user/' + USER.login || location.hash === '#/user/' + u.login) renderUser(USER.login); else route();
    } catch (e) { toast('Failed: ' + e.message); $('#epSubmit').disabled = false; }
  });
}

/* ================= repo editing: upload / edit file / release / repo meta ================= */
function fileToB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}
let uplSeq = 0; const uplWait = {};
window.__uplDone = (jid, ok, msg) => { const w = uplWait[jid]; if (w) { delete uplWait[jid]; ok ? w.res(true) : w.rej(new Error(msg || 'upload failed')); } };
async function uploadAsset(full, id, file) {
  const viaBridge = () => {
    const jid = ++uplSeq;
    return fileToB64(file).then(b64 => new Promise((res, rej) => {
      uplWait[jid] = { res, rej };
      try { window.OneGit.uploadAsset(jid, full, String(id), file.name, file.type || 'application/octet-stream', b64); }
      catch (e) { delete uplWait[jid]; rej(e); }
    }));
  };
  if (window.OneGit && window.OneGit.uploadAsset) {
    try { return await viaBridge(); } catch (e) { /* fall through to the fetch path */ }
  }
  const buf = await file.arrayBuffer();
  const res = await fetch('https://uploads.github.com/repos/' + full + '/releases/' + id + '/assets?name=' + encodeURIComponent(file.name), {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/vnd.github+json', 'Content-Type': file.type || 'application/octet-stream' },
    body: buf
  });
  if (!res.ok) { let d = null; try { d = await res.json(); } catch (e) {} throw new Error((d && d.message) || ('HTTP ' + res.status)); }
  return res.json();
}

function editFileSheet(full, path, raw, sha) {
  const name = path.split('/').pop();
  openSheet('<div class="sheethead"><b>Edit — ' + esc(name) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<textarea class="replyta" id="efBody" style="min-height:40vh;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px"></textarea>' +
    '<label class="fldlabel" style="margin-top:12px">Commit message</label>' +
    '<input class="fld" id="efMsg" value="Update ' + esc(name) + '" autocomplete="off">' +
    '<button class="btn primary btnblock" id="efSave" style="margin-top:16px">Commit changes</button>');
  $('#efBody').value = raw;
  $('#efSave').addEventListener('click', async () => {
    const content = $('#efBody').value;
    if (content === raw) { toast('No changes to commit'); return; }
    $('#efSave').disabled = true;
    try {
      const b64 = btoa(unescape(encodeURIComponent(content)));
      await api('/repos/' + full + '/contents/' + path, { method: 'PUT', body: JSON.stringify({ message: $('#efMsg').value.trim() || ('Update ' + name), content: b64, sha }) });
      closeSheet(); toast('Committed changes');
      const parts = full.split('/'), dir = path.split('/').slice(0, -1).join('/');
      renderFiles(parts[0], parts[1], dir);
    } catch (e) { toast('Failed: ' + e.message); $('#efSave').disabled = false; }
  });
}

function confirmDeleteFile(full, path) {
  const name = path.split('/').pop();
  openSheet('<div class="sheethead"><b>Delete — ' + esc(name) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' + spinner(true));
  api('/repos/' + full + '/contents/' + encodeURIComponent(path).replace(/%2F/g, '/')).then(meta => {
    if (meta && meta.sha) deleteFileSheet(full, path, meta.sha);
    else { closeSheet(); toast('Cannot delete this file'); }
  }).catch(e => { closeSheet(); toast('Failed: ' + e.message); });
}

function editReleaseSheet(o, n, rl) {
  const full = o + '/' + n;
  const curTag = (rl.tag_name && rl.tag_name.indexOf('untagged-') === 0) ? '' : (rl.tag_name || '');
  openSheet('<div class="sheethead"><b>Edit release — ' + esc(rl.name || rl.tag_name) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">Tag</label>' +
    '<input class="fld" id="xrlTag" value="' + esc(curTag) + '" placeholder="v1.0.0" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:12px">Release title</label>' +
    '<input class="fld" id="xrlTitle" value="' + esc(rl.name || rl.tag_name) + '" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:12px">Release notes</label>' +
    '<textarea class="replyta" id="xrlBody">' + esc(rl.body || '') + '</textarea>' +
    '<button class="btn primary btnblock" id="xrlSave" style="margin-top:16px">Save release</button>' +
    (rl.draft ? '<label class="fldlabel" style="margin-top:20px">Publish draft</label>' +
      '<div class="lsub" style="margin-bottom:8px">This release is a draft — only you can see it. Publishing makes it public for everyone, using the tag above.</div>' +
      '<button class="btn primary btnblock" id="xrlPublish" style="margin-top:10px">Publish release</button>' : '') +
    '<label class="fldlabel" style="margin-top:20px">Attach files</label>' +
    '<div class="lsub" style="margin-bottom:8px">Uploads go straight into this release</div>' +
    '<button class="btn ghost btnblock" id="xrlFiles">Upload files to this release</button>' +
    '<div id="xrlAssets"></div>' +
    '<input type="file" id="xrlInput" multiple hidden>');
  const drawXAssets = () => {
    const el = $('#xrlAssets');
    if (!el) return;
    const as = rl.assets || [];
    el.innerHTML = as.length ? '<div class="lsub" style="margin-top:12px">Files in this release</div>' + as.map(a =>
      '<div style="display:flex;align-items:center;gap:10px;padding:8px 0">' +
      '<div class="lmain" style="flex:1;min-width:0"><div class="ltitle">' + esc(a.name) + '</div>' +
      '<div class="lsub">' + fmtSize(a.size) + ' · ' + nf(a.download_count) + ' downloads</div></div>' +
      '<button class="iconbtn" data-act="renasset" data-full="' + esc(full) + '" data-aid="' + a.id + '" data-aname="' + esc(a.name) + '" aria-label="rename">' + SVG.pen + '</button>' +
      '<button class="iconbtn" data-act="delasset" data-full="' + esc(full) + '" data-aid="' + a.id + '" data-aname="' + esc(a.name) + '" aria-label="delete">' + SVG.x + '</button></div>').join('') : '';
  };
  drawXAssets();
  $('#xrlSave').addEventListener('click', async () => {
    const tag = ($('#xrlTag').value || '').trim();
    if (/[^A-Za-z0-9._\-+]/.test(tag)) { toast('Tags cannot contain spaces — use letters, numbers, dots, dashes (e.g. First-Stable)'); return; }
    const patch = { name: $('#xrlTitle').value.trim() || rl.tag_name, body: $('#xrlBody').value };
    if (tag && tag !== curTag) patch.tag_name = tag;
    $('#xrlSave').disabled = true;
    try {
      await api('/repos/' + full + '/releases/' + rl.id, { method: 'PATCH', body: JSON.stringify(patch) });
      closeSheet(); toast('Release updated'); renderReleases(o, n);
    } catch (e) { toast('Failed: ' + e.message); $('#xrlSave').disabled = false; }
  });
  const pb = $('#xrlPublish');
  if (pb) pb.addEventListener('click', async () => {
    const tag = ($('#xrlTag').value || '').trim();
    if (!tag) { toast('Enter a tag like v1.0.0'); return; }
    if (/[^A-Za-z0-9._\-+]/.test(tag)) { toast('Tags cannot contain spaces — use letters, numbers, dots, dashes (e.g. First-Stable)'); return; }
    pb.disabled = true;
    try {
      await api('/repos/' + full + '/releases/' + rl.id, { method: 'PATCH', body: JSON.stringify({ tag_name: tag, draft: false, prerelease: !!rl.prerelease }) });
      closeSheet(); toast('Release published'); renderReleases(o, n);
    } catch (e) { toast('Failed: ' + e.message); pb.disabled = false; }
  });
  $('#xrlFiles').addEventListener('click', () => $('#xrlInput').click());
  $('#xrlInput').addEventListener('change', async e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    toast('Uploading ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '…');
    let done = 0;
    for (const f of files) {
      try { await uploadAsset(full, rl.id, f); done++; }
      catch (er) { toast('Failed: ' + f.name + ' — ' + er.message); }
    }
    toast(done ? 'Uploaded ' + done + ' file' + (done > 1 ? 's' : '') : 'No files uploaded');
    try {
      const rels = await api('/repos/' + full + '/releases');
      const fresh = (rels || []).find(x => x.id === rl.id);
      if (fresh) rl.assets = fresh.assets || [];
    } catch (er) {}
    drawXAssets();
    renderReleases(o, n);
  });
}

function renameAssetSheet(full, aid, name) {
  openSheet('<div class="sheethead"><b>Rename file</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">File name</label>' +
    '<input class="fld" id="raName" value="' + esc(name) + '" autocomplete="off" spellcheck="false">' +
    '<button class="btn primary btnblock" id="raSave" style="margin-top:16px">Rename</button>');
  $('#raName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#raSave').click(); });
  $('#raSave').addEventListener('click', async () => {
    const nn = $('#raName').value.trim();
    if (!nn) { toast('Enter a file name'); return; }
    if (nn === name) { closeSheet(); return; }
    $('#raSave').disabled = true;
    try {
      await api('/repos/' + full + '/releases/assets/' + aid, { method: 'PATCH', body: JSON.stringify({ name: nn }) });
      closeSheet(); toast('Renamed to ' + nn);
      const parts = full.split('/');
      renderReleases(parts[0], parts[1]);
    } catch (e) { toast('Failed: ' + e.message); $('#raSave').disabled = false; }
  });
}

function deleteAssetSheet(full, aid, name) {
  openSheet('<div class="sheethead"><b>Delete file — ' + esc(name) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<p class="dim" style="margin:4px 0 14px">Remove this file from the release? People who already downloaded it keep their copy.</p>' +
    '<button class="btn danger btnblock" id="daConfirm">Delete file</button>');
  $('#daConfirm').addEventListener('click', async () => {
    $('#daConfirm').disabled = true;
    try {
      await api('/repos/' + full + '/releases/assets/' + aid, { method: 'DELETE' });
      closeSheet(); toast('Deleted ' + name);
      const parts = full.split('/');
      renderReleases(parts[0], parts[1]);
    } catch (e) { toast('Failed: ' + e.message); $('#daConfirm').disabled = false; }
  });
}

function deleteFileSheet(full, path, sha) {
  const name = path.split('/').pop();
  openSheet('<div class="sheethead"><b>Delete — ' + esc(name) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<p class="dim" style="margin:4px 0 14px">Delete this file from the repository? This creates a commit — it can be reverted on GitHub but not undone from here.</p>' +
    '<button class="btn danger btnblock" id="dfConfirm">Delete file</button>');
  $('#dfConfirm').addEventListener('click', async () => {
    $('#dfConfirm').disabled = true;
    try {
      await api('/repos/' + full + '/contents/' + path, { method: 'DELETE', body: JSON.stringify({ message: 'Delete ' + name, sha }) });
      closeSheet(); toast('Deleted ' + name);
      const parts = full.split('/'), dir = path.split('/').slice(0, -1).join('/');
      renderFiles(parts[0], parts[1], dir);
    } catch (e) { toast('Failed: ' + e.message); $('#dfConfirm').disabled = false; }
  });
}

function newReleaseSheet(o, n) {
  openSheet('<div class="sheethead"><b>New release — ' + esc(n) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">Tag version</label>' +
    '<input class="fld" id="rlTag" placeholder="v1.0.0" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:12px">Release title</label>' +
    '<input class="fld" id="rlTitle" placeholder="Version 1.0.0" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:12px">Describe this release</label>' +
    '<textarea class="replyta" id="rlBody" placeholder="What is new in this release…"></textarea>' +
    '<div class="seg" style="margin:16px 0 0"><button class="segb on" data-rls="final">Final</button><button class="segb" data-rls="pre">Pre-release</button><button class="segb" data-rls="draft">Draft</button></div>' +
    '<label class="fldlabel" style="margin-top:20px">Attach files</label>' +
    '<div class="lsub" style="margin-bottom:8px">Picked files upload with the release</div>' +
    '<button class="btn ghost btnblock" id="rlFiles">Choose files</button>' +
    '<div id="rlFileList" style="margin-top:6px"></div>' +
    '<input type="file" id="rlInput" multiple hidden>' +
    '<button class="btn primary btnblock" id="rlPublish" style="margin-top:18px">Publish release</button>');
  let rls = 'final', pending = [];
  const drawFiles = () => {
    const el = $('#rlFileList');
    if (!el) return;
    el.innerHTML = pending.length ? pending.map((f, i) =>
      '<div style="display:flex;align-items:center;gap:10px;padding:8px 0">' +
      '<div class="lmain" style="flex:1;min-width:0"><div class="ltitle">' + esc(f.name) + '</div>' +
      '<div class="lsub">' + (f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB') + '</div></div>' +
      '<button class="iconbtn" data-rmfile="' + i + '" aria-label="remove">' + SVG.x + '</button></div>').join('') : '';
  };
  $$('[data-rls]').forEach(b => b.addEventListener('click', () => { rls = b.dataset.rls; $$('[data-rls]').forEach(x => x.classList.toggle('on', x === b)); }));
  $('#rlFiles').addEventListener('click', () => $('#rlInput').click());
  $('#rlInput').addEventListener('change', e => {
    pending = pending.concat(Array.from(e.target.files || []));
    e.target.value = '';
    drawFiles();
  });
  $('#rlFileList').addEventListener('click', e => {
    const b = e.target.closest('[data-rmfile]');
    if (b) { pending.splice(+b.dataset.rmfile, 1); drawFiles(); }
  });
  $('#rlPublish').addEventListener('click', async () => {
    const tag = $('#rlTag').value.trim();
    if (!tag) { toast('Enter a tag like v1.0.0'); return; }
    if (/[^A-Za-z0-9._\-+]/.test(tag)) { toast('Tags cannot contain spaces — use letters, numbers, dots, dashes (e.g. First-Stable)'); return; }
    $('#rlPublish').disabled = true;
    try {
      const rel = await api('/repos/' + o + '/' + n + '/releases', { method: 'POST', body: JSON.stringify({ tag_name: tag, name: $('#rlTitle').value.trim() || tag, body: $('#rlBody').value, draft: rls === 'draft', prerelease: rls === 'pre' }) });
      if (pending.length && rel && rel.id) {
        toast('Release published — uploading ' + pending.length + ' file' + (pending.length > 1 ? 's' : '') + '…');
        let done = 0;
        for (const f of pending.slice()) {
          try { await uploadAsset(o + '/' + n, rel.id, f); done++; }
          catch (er) { toast('Failed: ' + f.name + ' — ' + er.message); }
        }
        toast('Release published with ' + done + ' file' + (done === 1 ? '' : 's'));
      } else toast('Release published');
      closeSheet();
      renderReleases(o, n);
    } catch (e) { toast('Failed: ' + e.message); $('#rlPublish').disabled = false; }
  });
}

function editRepoSheet(o, n, r) {
  openSheet('<div class="sheethead"><b>Edit repository</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<label class="fldlabel">Description</label>' +
    '<input class="fld" id="erDesc" value="' + esc(r.description || '') + '" autocomplete="off">' +
    '<label class="fldlabel" style="margin-top:12px">Homepage</label>' +
    '<input class="fld" id="erHome" value="' + esc(r.homepage || '') + '" placeholder="https://…" autocomplete="off">' +
    '<div class="setrow" style="margin-top:16px"><div class="lmain"><div class="ltitle">Private repository</div><div class="lsub">Only you and collaborators can see it</div></div><button class="switch' + (r.private ? ' on' : '') + '" id="erPriv"></button></div>' +
    '<button class="btn primary btnblock" id="erSave" style="margin-top:18px">Save changes</button>' +
    '<div class="lsub" style="margin:20px 0 8px;text-align:center">Danger zone</div>' +
    '<button class="btn danger btnblock" id="erDelete">Delete repository</button>');
  const pv = $('#erPriv');
  pv.addEventListener('click', () => pv.classList.toggle('on'));
  $('#erSave').addEventListener('click', async () => {
    $('#erSave').disabled = true;
    try {
      await api('/repos/' + o + '/' + n, { method: 'PATCH', body: JSON.stringify({ description: $('#erDesc').value.trim(), homepage: $('#erHome').value.trim(), private: pv.classList.contains('on') }) });
      closeSheet(); toast('Repository updated');
      renderRepo(o, n);
    } catch (e) { toast('Failed: ' + e.message); $('#erSave').disabled = false; }
  });
  $('#erDelete').addEventListener('click', () => deleteRepoSheet(o, n));
}

function upProgShow(title) {
  let el = document.getElementById('upProgCard');
  if (!el) { el = document.createElement('div'); el.id = 'upProgCard'; document.body.appendChild(el); }
  el.innerHTML = '<div class="ltitle">' + esc(title) + '</div><div class="lsub" id="upProgSub" style="margin-top:3px"></div><div class="upbar"><i id="upProgBar" style="width:0%"></i></div>';
}
function upProgUpdate(sub, pct) {
  const s = document.getElementById('upProgSub'), b = document.getElementById('upProgBar');
  if (s) s.textContent = sub;
  if (b) b.style.width = Math.max(0, Math.min(100, Math.round(pct))) + '%';
}
function upProgHide() { const el = document.getElementById('upProgCard'); if (el) el.remove(); }
let folderCtx = null, folderQ = [], folderBusy = false, folderEnd = false, folderOk = 0, folderFail = 0, folderSkip = 0;
window.__folderFile = (jid, path, mime, b64) => {
  if (!folderCtx) return;
  if (folderCtx.jid === null) folderCtx.jid = jid;
  if (jid !== folderCtx.jid) return;
  if (!b64) { folderSkip++; toast('Skipped ' + path + ' — file too large'); return; }
  folderQ.push({ path, b64 });
  pumpFolder();
};
window.__folderDone = (jid) => {
  if (!folderCtx) return;
  if (folderCtx.jid === null) folderCtx.jid = jid;
  if (jid !== folderCtx.jid) return;
  folderEnd = true;
  pumpFolder();
};
async function pumpFolder() {
  if (folderBusy) return;
  folderBusy = true;
  while (folderQ.length) {
    const f = folderQ.shift();
    const done = folderOk + folderFail + folderSkip;
    const total = folderEnd ? done + folderQ.length + 1 : 0;
    upProgUpdate(total ? (done + 1) + ' / ' + total + ' · ' + f.path : (done ? done + ' done · ' : '') + f.path, total ? done / total * 100 : 0);
    try {
      const p = folderCtx.dir ? folderCtx.dir + '/' + f.path : f.path;
      const body = { message: 'Upload ' + f.path, content: f.b64 };
      const meta = await api('/repos/' + folderCtx.o + '/' + folderCtx.n + '/contents/' + p, { status: true }).catch(() => null);
      if (meta && meta.ok && meta.data && meta.data.sha) body.sha = meta.data.sha;
      await api('/repos/' + folderCtx.o + '/' + folderCtx.n + '/contents/' + p, { method: 'PUT', body: JSON.stringify(body) });
      folderOk++;
    } catch (e) { folderFail++; toast('Failed: ' + f.path + ' — ' + e.message); }
  }
  if (folderEnd) {
    const ctx = folderCtx;
    folderCtx = null;
    const summary = folderOk + ' file' + (folderOk === 1 ? '' : 's') + ' uploaded' + (folderFail ? ' · ' + folderFail + ' failed' : '');
    if (folderOk) {
      upProgUpdate('Complete — ' + summary, 100);
      setTimeout(upProgHide, 3000);
      try { if (window.OneGit && window.OneGit.notify) window.OneGit.notify('Upload complete', summary + ' to ' + ctx.o + '/' + ctx.n); } catch (e) {}
      renderFiles(ctx.o, ctx.n, ctx.dir);
    } else upProgHide();
    folderQ = []; folderEnd = false; folderOk = 0; folderFail = 0; folderSkip = 0;
  }
  folderBusy = false;
}

function deleteRepoSheet(o, n) {
  openSheet('<div class="sheethead"><b>Delete repository — ' + esc(n) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
    '<p class="dim" style="margin:4px 0 14px">This permanently deletes ' + esc(o + '/' + n) + ' — every file, issue, pull request, star and setting is gone for good. This cannot be undone, not even on GitHub.</p>' +
    '<label class="fldlabel">Type ' + esc(n) + ' to confirm</label>' +
    '<input class="fld" id="drConfirm" placeholder="' + esc(n) + '" autocomplete="off" spellcheck="false">' +
    '<button class="btn danger btnblock" id="drGo" style="margin-top:16px">Delete this repository</button>');
  $('#drConfirm').addEventListener('keydown', e => { if (e.key === 'Enter') $('#drGo').click(); });
  $('#drGo').addEventListener('click', async () => {
    if ($('#drConfirm').value.trim() !== n) { toast('Type ' + n + ' to confirm'); return; }
    $('#drGo').disabled = true;
    try {
      await api('/repos/' + o + '/' + n, { method: 'DELETE' });
      closeSheet();
      toast('Deleted ' + o + '/' + n);
      pins = pins.filter(p => p.full_name !== o + '/' + n); LS.set('pins', pins); queueSync();
      location.hash = '#/repos';
    } catch (e) { toast('Failed: ' + e.message); $('#drGo').disabled = false; }
  });
}

/* ================= views: issue / PR detail ================= */
async function renderIssue(o, n, num) {
  const seq = ++RSEQ;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let iss, comments;
  try {
    iss = await api('/repos/' + o + '/' + n + '/issues/' + num, { accept: 'application/vnd.github.html+json' });
    comments = await api('/repos/' + o + '/' + n + '/issues/' + num + '/comments?per_page=50', { accept: 'application/vnd.github.html+json' });
  } catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  const isPR = !!iss.pull_request;
  let html = '<div class="card issuehead"><div class="chips">' +
    '<span class="chip ' + (iss.state === 'open' ? 'ok' : 'closed') + '">' + (iss.state === 'open' ? 'Open' : 'Closed') + '</span>' +
    (isPR ? '<span class="chip pr">Pull Request</span>' : '') + '</div>' +
    '<div class="ihtitle">' + esc(iss.title) + '</div>' +
    '<div class="ihmeta">' + esc(iss.user.login) + ' opened ' + tAgo(iss.created_at) +
    (isPR && iss.pull_request.merged_at ? ' · merged' : '') + '</div>' +
    '<button class="btn ' + (iss.state === 'open' ? 'ghost' : 'primary') + '" id="stateBtn" style="margin-top:14px">' +
    (iss.state === 'open' ? (isPR ? 'Close pull request' : 'Close issue') : (isPR ? 'Reopen pull request' : 'Reopen issue')) + '</button></div>';
  html += '<div class="card md">' + (iss.body_html ? fixMd(iss.body_html) : '<p class="dim">No description.</p>') + '</div>';
  html += '<h2 class="sect">Comments (' + comments.length + ')</h2>';
  comments.forEach(c => {
    html += '<div class="card comment"><div class="crow"><img class="cav" src="' + esc(c.user.avatar_url) + '" alt=""><b data-go="#/user/' + esc(c.user.login) + '">' + esc(c.user.login) + '</b><span class="dim">' + tAgo(c.created_at) + '</span></div>' +
      '<div class="md">' + (c.body_html ? fixMd(c.body_html) : '') + '</div></div>';
  });
  html += '<div class="card reply"><textarea id="replyText" placeholder="Write a comment…"></textarea><button class="btn primary" id="replyBtn">Comment</button></div>';
  if (seq !== RSEQ) return;
  view().innerHTML = html;
  const sb = $('#stateBtn');
  if (sb) sb.addEventListener('click', async () => {
    sb.disabled = true;
    const target = iss.state === 'open' ? 'closed' : 'open';
    try {
      await api('/repos/' + o + '/' + n + '/issues/' + num, { method: 'PATCH', body: JSON.stringify({ state: target }) });
      toast(target === 'closed' ? 'Closed' : 'Reopened');
      renderIssue(o, n, num);
    } catch (e) { toast('Failed: ' + e.message); sb.disabled = false; }
  });
  $('#replyBtn').addEventListener('click', async () => {
    const body = $('#replyText').value.trim();
    if (!body) { toast('Write something first'); return; }
    $('#replyBtn').disabled = true;
    try {
      await api('/repos/' + o + '/' + n + '/issues/' + num + '/comments', { method: 'POST', body: JSON.stringify({ body }) });
      toast('Comment posted');
      renderIssue(o, n, num);
    } catch (e) { toast('Failed: ' + e.message); $('#replyBtn').disabled = false; }
  });
}

/* ================= views: global issues + PRs ================= */
let IS = { type: 'issues', state: 'open', filter: 'created' };
async function renderIssues() {
  const seq = ++RSEQ;
  if (seq !== RSEQ) return;
  view().innerHTML = '<button class="btn ghost btnblock" id="giNew" style="margin-bottom:12px">New issue</button>' +
    '<div class="seg sm"><button class="segb' + (IS.type === 'issues' ? ' on' : '') + '" data-it="issues">Issues</button>' +
    '<button class="segb' + (IS.type === 'prs' ? ' on' : '') + '" data-it="prs">Pull requests</button></div>' +
    '<div class="seg sm"><button class="segb' + (IS.state === 'open' ? ' on' : '') + '" data-is="open">Open</button>' +
    '<button class="segb' + (IS.state === 'closed' ? ' on' : '') + '" data-is="closed">Closed</button></div>' +
    '<div class="seg sm" style="margin-bottom:12px"><button class="segb' + (IS.filter === 'created' ? ' on' : '') + '" data-if="created">Created</button>' +
    '<button class="segb' + (IS.filter === 'assigned' ? ' on' : '') + '" data-if="assigned">Assigned</button></div>' +
    '<div id="issueList">' + spinner() + '</div>';
  $('#giNew').addEventListener('click', () => repoPickerSheet((o, n) => { closeSheet(); newIssueSheet(o, n); }));
  $$('[data-if]').forEach(b => b.addEventListener('click', () => { IS.filter = b.dataset.if; renderIssues(); }));
  $$('[data-is]').forEach(b => b.addEventListener('click', () => { IS.state = b.dataset.is; renderIssues(); }));
  $$('[data-it]').forEach(b => b.addEventListener('click', () => { IS.type = b.dataset.it; renderIssues(); }));
  loadIssues();
}
async function loadIssues() {
  const seq = ++RSEQ;
  const list = $('#issueList'); if (!list) return;
  const paintIssues = items => {
    const it = (items || []).filter(i => IS.type === 'prs' ? !!i.pull_request : !i.pull_request);
    if (seq !== RSEQ) return;
    list.innerHTML = it.length ? '<div class="card list">' + it.map(issueRow).join('') + '</div>' :
      '<div class="card empty">No ' + (IS.type === 'prs' ? 'pull requests' : 'issues') + ' here.</div>';
  };
  const ic = cached('/issues?filter=' + IS.filter + '&state=' + IS.state + '&sort=updated&direction=desc&per_page=60');
  if (ic && Array.isArray(ic)) paintIssues(ic);
  try {
    let items = await api('/issues?filter=' + IS.filter + '&state=' + IS.state + '&sort=updated&direction=desc&per_page=60');
    items = items.filter(i => IS.type === 'prs' ? !!i.pull_request : !i.pull_request);
    if (seq !== RSEQ) return;
    list.innerHTML = items.length ? '<div class="card list">' + items.map(issueRow).join('') + '</div>' :
      '<div class="card empty">No ' + (IS.type === 'prs' ? 'pull requests' : 'issues') + ' here.</div>';
  } catch (e) { if (seq !== RSEQ) return; list.innerHTML = errCard(e); }
}

/* ================= views: notifications ================= */
let NT = { all: false };
async function renderNotifs() {
  const seq = ++RSEQ;
  if (seq !== RSEQ) return;
  view().innerHTML = '<div class="seg sm"><button class="segb' + (NT.all ? '' : ' on') + '" data-ns="unread">Unread</button><button class="segb' + (NT.all ? ' on' : '') + '" data-ns="all">All</button></div>' +
    '<button class="btn ghost btnblock" id="markAll" style="margin-bottom:12px">Mark all as read</button><div id="notifList">' + spinner() + '</div>';
  $$('[data-ns]').forEach(b => b.addEventListener('click', () => { NT.all = b.dataset.ns === 'all'; renderNotifs(); }));
  let items;
  try { items = await api('/notifications?per_page=50' + (NT.all ? '&all=true' : '')); } catch (e) { if (seq !== RSEQ) return; $('#notifList').innerHTML = errCard(e); return; }
  let html = '';
  if (!items.length) html = '<div class="card empty">All caught up — nothing new.</div>';
  else {
    html = '<div class="card list">';
    items.forEach(nt => {
      html += '<div class="lrow' + (nt.unread ? ' unread' : '') + '" data-act="opennotif" data-id="' + nt.id + '" data-url="' + esc(nt.subject.url) + '">' +
        '<div class="ndot"></div><div class="lmain"><div class="ltitle">' + esc(nt.subject.title) + '</div>' +
        '<div class="lsub">' + esc(nt.repository.full_name) + ' · ' + esc(nt.subject.type) + ' · ' + esc(nt.reason) + ' · ' + tAgo(nt.updated_at) + '</div></div></div>';
    });
    html += '</div>';
  }
  const nl = $('#notifList');
  if (nl && seq === RSEQ) nl.innerHTML = html;
  $('#markAll').addEventListener('click', async () => {
    try { await api('/notifications', { method: 'PUT' }); toast('All marked as read'); renderNotifs(); } catch (e) { toast('Failed: ' + e.message); }
  });
}

/* ================= views: user profile ================= */
async function renderUser(login) {
  const seq = ++RSEQ;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let u = cached('/users/' + login) || null, repos = cached('/users/' + login + '/repos?per_page=100&sort=pushed') || null, followState = null;
  const self = USER && USER.login.toLowerCase() === login.toLowerCase();
  if (u) api('/users/' + login).catch(() => {});
  if (!u) { try { u = await api('/users/' + login); } catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; } }
  if (!self) { const f = await api('/user/following/' + login, { status: true }).catch(() => null); followState = f ? f.status === 204 : null; }
  if (repos) api('/users/' + login + '/repos?per_page=100&sort=pushed').catch(() => {});
  else { try { repos = await api('/users/' + login + '/repos?per_page=100&sort=pushed'); } catch (e) { repos = []; } }
  repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
  const top = repos.slice(0, 8);
  let html = '<div class="card profile"><button class="pavalert" data-go="#/notifs" aria-label="Alerts">' + SVG.bell + '</button><img class="pav" src="' + esc(u.avatar_url) + '" alt="">' +
    '<div class="pname">' + esc(u.name || u.login) + '</div>' +
    '<div class="plogin">@' + esc(u.login) + (u.type === 'Organization' ? ' · organization' : '') + '</div>' +
    (u.bio ? '<p class="pbio">' + esc(u.bio) + '</p>' : '') +
    (u.location ? '<p class="pbio" style="margin-top:6px;font-size:12.5px">' + esc(u.location) + '</p>' : '') +
    '<div class="pstats">' +
    '<div class="pstat" data-go="#/repos"><b>' + nf(u.public_repos) + '</b><span>repos</span></div>' +
    '<div class="pstat" data-go="#/users/' + esc(u.login) + '/followers"><b>' + nf(u.followers) + '</b><span>followers</span></div>' +
    '<div class="pstat" data-go="#/users/' + esc(u.login) + '/following"><b>' + nf(u.following) + '</b><span>following</span></div></div>';
  if (!self) {
    html += '<button class="btn follow ' + (followState ? 'on' : 'primary') + '" id="followBtn">' + (followState ? 'Following' : 'Follow') + '</button>';
  } else {
    html += '<button class="btn ghost" id="editProfBtn" style="margin-top:14px">Edit profile</button>';
  }
  html += '<div class="linkrow"><button class="btn sm ghost" data-act="ext" data-url="' + esc(u.html_url) + '">Open on GitHub</button></div>';
  html += '</div>';
  html += '<h2 class="sect">Popular repositories</h2>';
  html += top.length ? top.map(repoRow).join('') : '<div class="card empty">No public repositories.</div>';
  if (seq !== RSEQ) return;
  view().innerHTML = html;
  const fb = $('#followBtn');
  if (fb) fb.addEventListener('click', async () => {
    fb.disabled = true;
    const following = fb.classList.contains('on');
    try {
      await api('/user/following/' + login, { method: following ? 'DELETE' : 'PUT' });
      fb.classList.toggle('on', !following);
      fb.classList.remove('primary');
      fb.textContent = following ? 'Follow' : 'Following';
      toast(following ? 'Unfollowed ' + login : 'Following ' + login);
    } catch (e) { toast('Failed: ' + e.message); }
    fb.disabled = false;
  });
  const eb = $('#editProfBtn');
  if (eb) eb.addEventListener('click', editProfileSheet);
}

/* ================= views: user lists (followers / following) ================= */
async function renderUserList(login, which) {
  const seq = ++RSEQ;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let items;
  try { items = await api('/users/' + login + '/' + which + '?per_page=80'); }
  catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  if (seq !== RSEQ) return;
  view().innerHTML = items.length ? '<div class="card list">' + items.map(u =>
    '<div class="lrow" data-go="#/user/' + esc(u.login) + '">' +
    '<img class="cav" src="' + esc(u.avatar_url) + '" alt="">' +
    '<div class="lmain"><div class="ltitle">' + esc(u.login) + '</div>' +
    '<div class="lsub">' + esc(u.type || 'User') + '</div></div></div>').join('') + '</div>'
    : '<div class="card empty">Nobody here yet.</div>';
}

/* ================= views: gists ================= */
async function renderGists(login) {
  const seq = ++RSEQ;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let items;
  try { items = await api(login ? '/users/' + login + '/gists?per_page=30' : '/gists?per_page=30'); }
  catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  if (!items.length) { view().innerHTML = (login ? '' : '<button class="btn ghost btnblock" id="newGistBtn" style="margin-bottom:12px">New gist</button>') + '<div class="card empty">No gists yet.</div>'; if (!login) $('#newGistBtn').addEventListener('click', newGistSheet); return; }
  if (seq !== RSEQ) return;
  view().innerHTML = (login ? '' : '<button class="btn ghost btnblock" id="newGistBtn" style="margin-bottom:12px">New gist</button>') + '<div class="card list">' + items.map(g => {
    const files = Object.keys(g.files || {});
    const label = g.description || files[0] || 'gist';
    return '<div class="lrow" data-go="#/gist/' + g.id + '">' + SVG.file +
      '<div class="lmain"><div class="ltitle">' + esc(label) + '</div>' +
      '<div class="lsub">' + files.length + ' file' + (files.length > 1 ? 's' : '') + ' · ' + tAgo(g.updated_at) + (g.public ? '' : ' · secret') + '</div></div></div>';
  }).join('') + '</div>';
}

async function renderGist(id) {
  const seq = ++RSEQ;
  if (seq !== RSEQ) return;
  view().innerHTML = spinner();
  let g;
  try { g = await api('/gists/' + id); } catch (e) { if (seq !== RSEQ) return; view().innerHTML = errCard(e); return; }
  const files = Object.values(g.files || {});
  let html = '<div class="card"><div class="rcname">' + esc(g.description || 'Gist') + '</div>' +
    '<div class="rcmeta">' + (g.owner ? esc(g.owner.login) : 'anonymous') + ' · ' + tAgo(g.updated_at) + (g.public ? '' : ' · secret gist') + '</div></div>';
  files.forEach(f => {
    html += '<div class="card"><div class="filehead">' + SVG.file + '<b style="font-size:13px;word-break:break-all">' + esc(f.filename) + '</b>' +
      (f.language ? '<span class="chip">' + esc(f.language) + '</span>' : '') + '</div>' +
      (f.truncated ? '<div class="lsub" style="margin-top:8px">File too large to show here.</div>' :
        '<pre class="filepre">' + esc(f.content || '') + '</pre>') + '</div>';
  });
  if (seq !== RSEQ) return;
  view().innerHTML = html;
}

function langBars(langs) {
  const entries = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, e) => s + e[1], 0) || 1;
  const top = entries.slice(0, 4);
  const rest = entries.slice(4).reduce((s, e) => s + e[1], 0);
  let bar = '<div class="langbar">' + top.map(e => '<span style="width:' + (e[1] / total * 100).toFixed(1) + '%;background:' + langColor(e[0]) + '"></span>').join('') +
    (rest ? '<span style="width:' + (rest / total * 100).toFixed(1) + '%;background:#8a8a8a"></span>' : '') + '</div>';
  let legend = top.map(e => '<div class="lgd"><span class="dot" style="background:' + langColor(e[0]) + '"></span>' + esc(e[0]) + ' <span class="dim">' + (e[1] / total * 100).toFixed(1) + '%</span></div>').join('') +
    (rest ? '<div class="lgd"><span class="dot" style="background:#8a8a8a"></span>Other <span class="dim">' + (rest / total * 100).toFixed(1) + '%</span></div>' : '');
  return '<div class="card"><div class="ltitle" style="margin-bottom:12px">Languages</div>' + bar + '<div class="lgdrow">' + legend + '</div></div>';
}

/* ================= views: settings ================= */
let STAB = 'general';
function renderSettings() {
  const seq = ++RSEQ;
  const u = USER || {};
  let html = '<div class="seg" id="setSeg" style="margin-bottom:16px"><button class="segb' + (STAB === 'credits' ? '' : ' on') + '" data-st="general">Settings</button><button class="segb' + (STAB === 'credits' ? ' on' : '') + '" data-st="credits">Credits</button></div>';
  const wireTabs = () => $$('[data-st]').forEach(b => b.addEventListener('click', () => { STAB = b.dataset.st; renderSettings(); }));
  if (STAB === 'credits') {
    html += '<div class="card" style="text-align:center;padding:28px 20px">' +
      '<div style="font-size:34px;font-weight:800;letter-spacing:-0.5px">OneGit</div>' +
      '<ul class="creditslist" style="list-style:none;text-align:left;margin:16px auto 0;padding:0;max-width:290px">' +
      '<li class="lsub" style="padding:7px 0 7px 18px;position:relative;border-bottom:1px solid var(--divider)">Version ' + APPV + '</li>' +
      '<li class="lsub" style="padding:7px 0 7px 18px;position:relative;border-bottom:1px solid var(--divider)">Syncs via your GitHub account</li>' +
      '<li class="lsub" style="padding:7px 0 7px 18px;position:relative">Not affiliated with GitHub</li></ul></div>' +
      '<h2 class="sect">Developer</h2>' +
      '<div class="card" style="text-align:center">' +
      '<img src="logo.jpg" alt="BonkerUnkil (Bonki)" style="width:96px;height:96px;border-radius:32px;margin:0 auto 16px;box-shadow:0 8px 28px var(--glow)">' +
      '<div style="padding:8px 0;border-bottom:1px solid var(--divider)"><div class="ltitle">Name</div><div class="lsub" style="margin-top:2px">BonkerUnkil (Bonki)</div></div>' +
      '<div style="padding:8px 0;border-bottom:1px solid var(--divider)"><div class="ltitle">Age</div><div class="lsub" style="margin-top:2px">20</div></div>' +
      '<div style="padding:8px 0"><div class="ltitle">Profession</div><div class="lsub" style="margin-top:2px">Coding, problem solving, and more</div></div></div>' +
      '<h2 class="sect">Connect</h2>' +
      '<div class="card">' +
      '<button class="btn ghost btnblock" data-act="ext" data-url="https://t.me/BonkerUnkilBonki" style="display:flex;align-items:center;justify-content:flex-start;gap:12px">' + SVG.telegram + '<span>Telegram · @BonkerUnkilBonki</span></button>' +
      '<button class="btn ghost btnblock" data-act="ext" data-url="https://github.com/BonkerUnkilBonki" style="display:flex;align-items:center;justify-content:flex-start;gap:12px;margin-top:8px">' + SVG.github + '<span>GitHub · @BonkerUnkilBonki</span></button></div>' +
      '<h2 class="sect">Languages used</h2>' +
      '<div class="card"><div class="chips"><span class="chip">HTML</span><span class="chip">CSS</span><span class="chip">JavaScript</span><span class="chip">Java</span></div></div>';
    if (seq !== RSEQ) return;
    view().innerHTML = html;
    wireTabs();
    return;
  }
  const cur = LS.get('theme', 'light');
  const themes = { light: 'Light', dark: 'Dark', pitch: 'Pitch black' };
  const accents = { blue: ['#1B6EF3', 'Blue'], purple: ['#8B5CF6', 'Purple'], green: ['#12B76A', 'Green'], pink: ['#EC4899', 'Pink'], amber: ['#F59E0B', 'Amber'], teal: ['#14B8A6', 'Teal'], red: ['#EF4444', 'Red'], indigo: ['#6366F1', 'Indigo'], dynamic: ['', 'Dynamic'], custom: ['', 'Custom'] };
  const curA = LS.get('accent', 'blue');
  const curCustom = (LS.get('customAccent', '') || '').toUpperCase();
  html += '<div class="card profile"><img class="pav" src="' + esc(u.avatar_url || '') + '" alt=""><div class="pname">' + esc(u.name || u.login || '') + '</div><div class="plogin">@' + esc(u.login || '') + '</div></div>';
  html += '<h2 class="sect">Appearance</h2>';
  html += '<div class="card"><div class="setrow"><div class="lmain"><div class="ltitle">Theme</div><div class="lsub">Pitch black saves battery on AMOLED screens</div></div></div>' +
    '<div class="seg" style="margin:14px 0 0">' +
    Object.keys(themes).map(t => '<button class="segb' + (cur === t ? ' on' : '') + '" data-thm="' + t + '">' + themes[t] + '</button>').join('') + '</div></div>';
  const dotCls = a => (a === 'dynamic' ? ' dyn' : (a === 'custom' ? ' customdot' : ''));
  const dotStyle = a => (a === 'dynamic') ? '' : (a === 'custom' ? (curCustom ? ' style="background:' + curCustom + '"' : '') : ' style="background:' + accents[a][0] + '"');
  html += '<div class="card"><div class="ltitle">Accent color</div>' +
    '<div class="accentrow">' + Object.keys(accents).map(a => '<button class="accentdot' + (curA === a ? ' on' : '') + dotCls(a) + '" data-acc="' + a + '"' + dotStyle(a) + ' aria-label="' + accents[a][1] + '"></button>').join('') + '</div>' +
    '<div class="lsub" style="margin-top:10px">' + (curA === 'dynamic' ? 'Dynamic — follows your system / wallpaper color' : curA === 'custom' ? 'Custom — pick any color below' : accents[curA][1] + ' accent — applies to buttons, highlights and glows') + '</div>' +
    (curA === 'custom' ? '<div class="colorrow"><input type="color" id="colorPick" value="' + (curCustom || '#1B6EF3') + '"><input class="fld" id="colorHex" value="' + (curCustom || '#1B6EF3') + '" maxlength="7" spellcheck="false"><button class="btn primary" id="colorApply">Apply</button></div>' : '') + '</div>';
  html += '<div class="card"><div class="setrow"><div class="lmain"><div class="ltitle">Glow effects</div><div class="lsub">Neon glows on buttons, cards and highlights. Turn off for a flat, battery-friendlier look.</div></div>' +
    '<button class="switch' + (LS.get('glow', true) ? ' on' : '') + '" id="glowSw" aria-label="glow effects"></button></div></div>';
  html += '<div class="card"><div class="setrow"><div class="lmain"><div class="ltitle">Navigation glow</div><div class="lsub">Adds an accent-colored glow around the bottom navigation bar and its active tab. Off by default for a cleaner look.</div></div>' +
    '<button class="switch' + (LS.get('navglow', false) ? ' on' : '') + '" id="navglowSw" aria-label="navigation glow"></button></div></div>';
  html += '<h2 class="sect">App updates</h2>';
  html += '<div class="card"><div class="setrow"><div class="lmain"><div class="ltitle">Auto-download app updates</div><div class="lsub">When you publish a new OneGit release on GitHub, the update APK is downloaded to your Downloads folder automatically.</div></div>' +
    '<button class="switch' + (LS.get('autodl', false) ? ' on' : '') + '" id="autodlSw" aria-label="auto download updates"></button></div>' +
    '<div style="display:flex;gap:10px;align-items:center;padding:12px 0 2px;margin-top:12px;border-top:1px solid var(--divider)">' +
    '<div class="lmain" style="flex:1"><div class="ltitle">Installed</div><div class="lsub">Version ' + APPV + '</div></div>' +
    '<div class="lmain" style="flex:1;text-align:right"><div class="ltitle" id="updLatest">Checking…</div><div class="lsub">latest on GitHub</div></div></div>' +
    '<div id="updInfo"></div></div>';
  html += '<h2 class="sect">Notifications</h2>';
  html += '<div class="card"><div class="setrow"><div class="lmain"><div class="ltitle">GitHub activity alerts</div><div class="lsub">System notifications for new issues, pull requests, mentions, reviews, releases and CI results on repos you watch or participate in. Checked in the background roughly every 15 minutes — works even when the app is closed.</div></div>' +
    '<button class="switch' + (LS.get('notify', true) ? ' on' : '') + '" id="notifSw" aria-label="notifications"></button></div></div>';
  html += '<h2 class="sect">Sync across devices</h2>';
  html += '<div class="card"><p style="margin:0;font-size:13.5px;color:var(--text2);line-height:1.6">Sign in with the same GitHub account on any device and OneGit pulls your data from GitHub. Your pins, theme and preferences are also saved to a private Gist in your account, so a new device picks up where you left off. Your access token stays on this device only — it is never synced.</p>' +
    '<div class="btncol"><button class="btn primary" data-act="synctoast">Sync now</button><button class="btn ghost" data-act="syncrestore">Restore from GitHub</button></div>' +
    '<div class="syncstat" id="syncStat">' + (gistId ? 'Linked to a private Gist in your account' : 'No sync Gist yet — one is created on your first sync') + '</div></div>';
  html += '<h2 class="sect">Pinned repositories</h2>';
  if (pins.length) {
    html += '<div class="card list">';
    pins.forEach(p => {
      html += '<div class="lrow"><div class="lmain"><div class="ltitle">' + esc(p.full_name) + '</div></div><button class="pinbtn pinned" data-act="unpin" data-full="' + esc(p.full_name) + '" aria-label="unpin">' + SVG.star + '</button></div>';
    });
    html += '</div>';
  } else html += '<div class="card empty">Nothing pinned yet.</div>';
  html += '<h2 class="sect">Account</h2>';
  html += '<div class="card"><button class="btn danger btnblock" id="logoutBtn">Sign out</button></div>';
  if (seq !== RSEQ) return;
  view().innerHTML = html;
  wireTabs();
  $$('[data-thm]').forEach(b => b.addEventListener('click', () => {
    LS.set('theme', b.dataset.thm); applyTheme(); queueSync();
    $$('[data-thm]').forEach(x => x.classList.toggle('on', x === b));
    toast(themes[b.dataset.thm] + ' theme');
  }));
  $$('[data-acc]').forEach(b => b.addEventListener('click', () => {
    LS.set('accent', b.dataset.acc); applyTheme(); queueSync();
    $$('[data-acc]').forEach(x => x.classList.toggle('on', x === b));
    toast(b.dataset.acc === 'dynamic' ? 'Dynamic accent — following your system color' : b.dataset.acc === 'custom' ? 'Custom color — pick your shade below' : accents[b.dataset.acc][1] + ' accent');
    renderSettings();
  }));
  const cp = $('#colorPick'), chx = $('#colorHex'), cap = $('#colorApply');
  if (cp && chx) {
    cp.addEventListener('input', () => { chx.value = cp.value.toUpperCase(); });
    cp.addEventListener('change', () => { LS.set('customAccent', cp.value.toUpperCase()); applyTheme(); queueSync(); toast('Custom color applied'); });
    const applyHex = () => {
      let v = (chx.value || '').trim().toUpperCase();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9A-F]{6}$/.test(v)) { LS.set('customAccent', v); applyTheme(); queueSync(); toast('Custom color applied'); renderSettings(); }
      else toast('Enter a color like #1B6EF3');
    };
    if (cap) cap.addEventListener('click', applyHex);
    chx.addEventListener('keydown', e => { if (e.key === 'Enter') applyHex(); });
  }
  const glowSw = $('#glowSw');
  if (glowSw) glowSw.addEventListener('click', () => {
    const on = !glowSw.classList.contains('on');
    glowSw.classList.toggle('on', on);
    LS.set('glow', on); applyTheme(); queueSync();
    toast(on ? 'Glow effects on' : 'Glow effects off');
  });
  const nsw = $('#navglowSw');
  if (nsw) nsw.addEventListener('click', () => {
    const on = !nsw.classList.contains('on');
    nsw.classList.toggle('on', on);
    LS.set('navglow', on); applyTheme(); queueSync();
    toast(on ? 'Navigation glow on' : 'Navigation glow off');
  });
  const adw = $('#autodlSw');
  if (adw) adw.addEventListener('click', () => {
    const on = !adw.classList.contains('on');
    adw.classList.toggle('on', on);
    LS.set('autodl', on); queueSync();
    toast(on ? 'Auto-download updates on' : 'Auto-download updates off');
  });
  const latestEl = $('#updLatest'), infoEl = $('#updInfo');
  if (latestEl) {
    api('/repos/' + UPD_REPO + '/releases/latest').then(rel => {
      if (!latestEl.isConnected) return;
      const tag = String((rel && rel.tag_name) || '').replace(/^v/, '');
      latestEl.textContent = tag ? 'v' + tag : 'not found';
      if (!infoEl || !tag) return;
      if (newerVersion(tag, APPV)) {
        const asset = (rel.assets || []).find(a => /\.apk$/i.test(a.name || ''));
        infoEl.innerHTML = '<div class="lsub" style="padding:10px 0 4px">Update available — v' + esc(tag) + (rel.name ? ' · ' + esc(rel.name) : '') + '</div>' +
          (asset ? '<div class="lrow" data-act="download" data-url="' + esc(asset.browser_download_url) + '" data-name="' + esc(asset.name) + '" style="padding:10px 0">' + SVG.dl +
          '<div class="lmain"><div class="ltitle">' + esc(asset.name) + '</div><div class="lsub">' + fmtSize(asset.size) + ' · tap to download the update</div></div></div>' : '') +
          '<button class="btn ghost btnblock" id="updPopup" style="margin-top:10px">Show update popup</button>';
        const pu = $('#updPopup');
        if (pu) pu.addEventListener('click', () => { showUpdateCard(tag, rel.name, asset); });
      } else {
        infoEl.innerHTML = '<div class="lsub" style="padding:10px 0 4px">You are on the latest version.</div>';
      }
    }).catch(() => { if (latestEl.isConnected) latestEl.textContent = 'check failed'; });
  }
  $('#logoutBtn').addEventListener('click', () => doLogout('Signed out'));
  const notifSw = $('#notifSw');
  if (notifSw) notifSw.addEventListener('click', () => {
    const on = !notifSw.classList.contains('on');
    notifSw.classList.toggle('on', on);
    LS.set('notify', on);
    try { if (window.OneGit && window.OneGit.setNotifications) window.OneGit.setNotifications(on); } catch (e) {}
    toast(on ? 'GitHub alerts on — checked every ~15 minutes' : 'GitHub alerts off');
  });
}

/* ================= actions ================= */
const ACTIONS = {
  ext: el => { try { window.location.href = el.dataset.url; } catch (e) {} },
  discover: () => { RS.mode = 'discover'; location.hash = '#/repos'; },
  clone: el => cloneSheet(el.dataset.full),
  copy: el => {
    const t = el.dataset.copy;
    try { if (window.OneGit && window.OneGit.copy) { window.OneGit.copy(t); toast('Copied to clipboard'); return; } } catch (e) {}
    try { navigator.clipboard.writeText(t); toast('Copied to clipboard'); } catch (e) { toast('Copy not available here'); }
  },
  download: el => {
    toast('Downloading ' + el.dataset.name);
    try { if (window.OneGit && window.OneGit.download) { window.OneGit.download(el.dataset.url, el.dataset.name); return; } } catch (e) {}
    try { window.location.href = el.dataset.url; } catch (e) {}
  },
  openfile: async el => {
    const full = el.dataset.repo, path = el.dataset.file;
    openSheet('<div class="sheethead"><b>' + esc(path.split('/').pop()) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' + spinner(true));
    try {
      const meta = await api('/repos/' + full + '/contents/' + (path ? encodeURIComponent(path).replace(/%2F/g, '/') : ''));
      let raw = '';
      if (meta && typeof meta.content === 'string' && meta.encoding === 'base64') {
        const b64 = meta.content.replace(/\n/g, '');
        try { raw = decodeURIComponent(escape(atob(b64))); } catch (e2) { raw = atob(b64); }
      }
      const card = $('.sheetcard');
      if (card) {
        const MAX = 60000;
        let shown = raw, cut = false;
        if (raw.length > MAX) { shown = raw.slice(0, MAX); cut = true; }
        const lines = shown.split('\n');
        if (lines.length > 2000) { shown = lines.slice(0, 2000).join('\n'); cut = true; }
        card.innerHTML = '<div class="sheethead"><b>' + esc(path) + '</b><button class="iconbtn" data-act="closesheet">' + SVG.x + '</button></div>' +
          '<pre class="filepre">' + esc(shown || '(empty file)') + (cut ? '\n\n… — this file is large, showing the first ' + nf(Math.min(raw.length, MAX)) + ' characters.' : '') + '</pre>';
        if (raw) {
          card.innerHTML += '<div style="display:flex;gap:8px;margin-top:12px">' +
            '<button class="btn ghost" id="editFileBtn" style="flex:1">Edit</button>' +
            '<button class="btn danger" id="delFileBtn" style="flex:1">Delete</button></div>';
          $('#editFileBtn').addEventListener('click', () => editFileSheet(full, path, raw, meta.sha));
          $('#delFileBtn').addEventListener('click', () => deleteFileSheet(full, path, meta.sha));
        }
      }
    } catch (e) { closeSheet(); toast('Cannot open this file'); }
  },
  relup: el => { window._relTarget = el.dataset.relup; const inp = $('#relUpInput'); if (inp) inp.click(); },
  delasset: el => { deleteAssetSheet(el.dataset.full, el.dataset.aid, el.dataset.aname); },
  renasset: el => { renameAssetSheet(el.dataset.full, el.dataset.aid, el.dataset.aname); },
  closesheet: () => closeSheet(),
  synctoast: () => syncPush(false),
  syncrestore: () => syncRestore(false),
  unpin: el => { pins = pins.filter(p => p.full_name !== el.dataset.full); LS.set('pins', pins); queueSync(); toast('Unpinned'); renderSettings(); },
  opennotif: async el => {
    const id = el.dataset.id, url = el.dataset.url;
    try { await api('/notifications/threads/' + id, { method: 'PATCH' }); } catch (e) {}
    try {
      const s = await api(url.replace('https://api.github.com', ''));
      if (s && s.number && s.repository) { location.hash = '#/issue/' + s.repository.full_name + '/' + s.number; return; }
      if (s && s.html_url) { window.location.href = s.html_url; return; }
    } catch (e) {}
    el.classList.remove('unread'); toast('Marked as read');
  }
};

/* ================= global events ================= */
document.addEventListener('click', e => {
  const pin = e.target.closest('[data-pinbtn]');
  if (pin) { const r = repoCache.get(pin.dataset.pinbtn); if (r) togglePin(r); return; }
  const act = e.target.closest('[data-act]');
  if (act && ACTIONS[act.dataset.act]) { e.preventDefault(); ACTIONS[act.dataset.act](act, e); return; }
  const go = e.target.closest('[data-go]');
  if (go) location.hash = go.dataset.go;
});
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
/* ---- bottom nav auto-hide: hides on scroll-down and after idle, returns on any touch or scroll-up ---- */
let lastY = 0, idleT = null;
function navShow() { const nb = $('#navbar'); if (nb) nb.classList.remove('hide'); resetIdle(); }
function navHide() { const nb = $('#navbar'); if (nb) nb.classList.add('hide'); clearTimeout(idleT); }
function resetIdle() {
  clearTimeout(idleT);
  idleT = setTimeout(() => { const sc = $('#scroller'); if (sc && sc.scrollTop > 150) navHide(); }, 4000);
}
$('#scroller').addEventListener('scroll', () => {
  const sc = $('#scroller'); const y = sc.scrollTop;
  $('#appbar').classList.toggle('on', y > 110);
  if (y > lastY + 10 && y > 80) navHide();
  else if (y < lastY - 10) navShow();
  lastY = y;
  resetIdle();
});
document.addEventListener('pointerdown', () => navShow(), true);
window.addEventListener('keydown', () => navShow());
$('#backBig').addEventListener('click', () => history.back());
$('#backApp').addEventListener('click', () => history.back());
const doRefresh = () => { view().innerHTML = spinner(); route(); };
$('#refreshBig').addEventListener('click', doRefresh);
$('#refreshApp').addEventListener('click', doRefresh);
$('#loginBtn').addEventListener('click', async () => {
  const tok = $('#tokenInput').value.trim();
  if (!tok) { toast('Paste your GitHub token first'); return; }
  const btn = $('#loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in…'; $('#loginErr').textContent = '';
  const old = TOKEN; TOKEN = tok;
  try {
    USER = await api('/user');
    LS.set('token', tok);
    try { if (window.OneGit && window.OneGit.saveToken) window.OneGit.saveToken(tok); } catch (e) {}
    try { if (window.OneGit && window.OneGit.setNotifications) window.OneGit.setNotifications(LS.get('notify', true)); } catch (e) {}
    const restored = await syncRestore(true);
    if (location.hash === '#/home' || location.hash === '') route();
    else location.hash = '#/home';
    toast(restored ? 'Welcome back — data restored from GitHub' : 'Welcome, ' + USER.login);
  } catch (e) {
    TOKEN = old; USER = null;
    $('#loginErr').textContent = (e.message || 'Sign-in failed') + ' — check the token and its scopes.';
    toast('Sign-in failed');
  }
  btn.disabled = false; btn.textContent = 'Sign in';
});
$('#tokenInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#loginBtn').click(); });
window.addEventListener('hashchange', route);

/* ================= boot ================= */
applyTheme();
applyFont();
saveTokenNative();
route();
if (TOKEN) syncRestore(true).then(ok => { if (ok && (location.hash === '#/home' || location.hash === '')) route(); }).catch(() => {});
