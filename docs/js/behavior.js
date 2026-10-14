/* Behavior controls — a collapsible panel that exposes the prototype's real look-and-feel parameters.
   Every control writes into T, which the drawing, layout and gesture code read directly.
   Values persist per browser (localStorage, best effort). "Restore defaults" puts every control back;
   "Reset state" restarts the sequence but keeps the controls; "Copy as prompt" writes the values as paste-able text. */
const Behavior = (() => {
  const FONTS = {
    plex:  { label: 'IBM Plex Mono', css: '"IBM Plex Mono","SF Mono",ui-monospace,Menlo,Consolas,monospace' },
    mono:  { label: 'system monospace', css: 'ui-monospace,"SF Mono",Menlo,Consolas,monospace' },
    sans:  { label: 'system sans-serif', css: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif' },
    serif: { label: 'serif', css: 'Georgia,"Times New Roman",serif' },
  };
  const ASPECTS = { '4:3': 4 / 3, '3:2': 3 / 2, '1:1': 1, '16:9': 16 / 9, '3:4': 3 / 4 };

  /* type: range | color | select | toggle. unit is shown next to the value and in the range note. */
  const SCHEMA = [
    { group: 'Colors', open: true, items: [
      { k: 'bg',    label: 'background',      type: 'color', def: '#000000', note: 'stage and sheet ground' },
      { k: 'ink',   label: 'line ink',        type: 'color', def: '#e8e8e8', note: 'colour of the scan lines' },
      { k: 'ui',    label: 'interface text',  type: 'color', def: '#e8e8e8', note: 'labels, buttons, slider thumbs' },
      { k: 'rule',  label: 'frame & rules',   type: 'color', def: '#333333', note: 'sheet border and panel rules' },
    ] },
    { group: 'Type', items: [
      { k: 'font',     label: 'font',           type: 'select', def: 'plex', options: Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, v.label])) },
      { k: 'fontSize', label: 'text size',      type: 'range', min: 10, max: 16, step: 0.5, def: 12, unit: 'px' },
      { k: 'tracking', label: 'letter spacing', type: 'range', min: 0, max: 0.2, step: 0.01, def: 0.04, unit: 'em' },
    ] },
    { group: 'Dimensions', items: [
      { k: 'aspect',  label: 'sheet shape',      type: 'select', def: '4:3', options: Object.fromEntries(Object.keys(ASPECTS).map(a => [a, a + (a === '4:3' ? ' (study 01)' : '')])), note: 'width : height' },
      { k: 'margin',  label: 'sheet margin',     type: 'range', min: 0, max: 12, step: 0.5, def: 4, unit: '% of sheet', note: 'space between picture and sheet edge' },
      { k: 'bracket', label: 'corner brackets',  type: 'range', min: 0, max: 40, step: 1, def: 18, unit: 'px' },
      { k: 'dockW',   label: 'control bar width', type: 'range', min: 420, max: 960, step: 10, def: 640, unit: 'px', note: 'max width; the sheet resizes to fit' },
    ] },
    { group: 'Lines', items: [
      { k: 'depth',  label: 'lift depth',        type: 'range', min: 0, max: 0.25, step: 0.005, def: 0.08, unit: '× picture height', note: 'how far brightness lifts a line' },
      { k: 'smooth', label: 'signal smoothing',  type: 'range', min: 0, max: 0.9, step: 0.05, def: 0.3, unit: '', note: '0 = raw, 0.9 = very smooth' },
      { k: 'res',    label: 'signal resolution', type: 'range', min: 80, max: 520, step: 10, def: 260, unit: 'px', note: 'longest side of the sampled picture' },
      { k: 'invert', label: 'invert signal',     type: 'toggle', def: false, note: 'dark areas lift instead of bright' },
    ] },
    { group: 'Motion', items: [
      { k: 'motion',    label: 'idle motion',      type: 'select', def: 'none', options: { none: 'none (studies)', wave: 'wave — travels along the lines', bounce: 'bounce — sheet hops', breathe: 'breathe — expands and settles', jitter: 'jitter — signal noise' } },
      { k: 'amp',       label: 'motion amplitude', type: 'range', min: 0, max: 30, step: 0.5, def: 6, unit: 'px' },
      { k: 'speed',     label: 'motion speed',     type: 'range', min: 0.1, max: 3, step: 0.05, def: 0.5, unit: 'Hz', note: 'cycles per second' },
      { k: 'crossfade', label: 'photo → lines fade', type: 'range', min: 0, max: 3000, step: 50, def: 900, unit: 'ms' },
      { k: 'fade',      label: 'panel transition', type: 'range', min: 0, max: 1500, step: 25, def: 450, unit: 'ms' },
    ] },
    { group: 'Warp gestures', items: [
      { k: 'brush',   label: 'brush radius',      type: 'range', min: 4, max: 30, step: 0.5, def: 12, unit: '% picture height', note: 'drag area; pinch and wheel scale with it' },
      { k: 'wheel',   label: 'scroll sensitivity', type: 'range', min: 0.25, max: 4, step: 0.05, def: 1, unit: '×' },
      { k: 'dbl',     label: 'double-tap window', type: 'range', min: 150, max: 600, step: 10, def: 300, unit: 'ms' },
      { k: 'ringA',   label: 'brush ring opacity', type: 'range', min: 0, max: 1, step: 0.05, def: 0.35, unit: '' },
      { k: 'ringHold', label: 'ring hold after scroll', type: 'range', min: 100, max: 1500, step: 50, def: 400, unit: 'ms' },
    ] },
    { group: 'Effects', items: [
      { k: 'glow',     label: 'line glow',      type: 'range', min: 0, max: 20, step: 0.5, def: 0, unit: 'px blur' },
      { k: 'lineA',    label: 'line opacity',   type: 'range', min: 0.1, max: 1, step: 0.05, def: 1, unit: '' },
      { k: 'underlay', label: 'photo underlay', type: 'range', min: 0, max: 0.6, step: 0.05, def: 0, unit: 'opacity', note: 'faint photo kept under the lines' },
    ] },
  ];
  const ITEMS = SCHEMA.flatMap(g => g.items);
  const DEF = Object.fromEntries(ITEMS.map(it => [it.k, it.def]));
  const KEY = 'scanlines.behavior.v1';
  const T = { ...DEF };
  try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); for (const it of ITEMS) if (it.k in saved && typeof saved[it.k] === typeof it.def) T[it.k] = saved[it.k]; } catch (e) {}

  const decimals = it => (String(it.step).split('.')[1] || '').length;
  const show = (it, v) => it.type === 'range' ? (+v).toFixed(decimals(it)) + (it.unit ? ' ' + it.unit : '')
    : it.type === 'toggle' ? (v ? 'on' : 'off') : it.type === 'select' ? it.options[v] : v;

  /* Push T into CSS and ask the paper to redraw. Signal-level changes (resolution, invert) rebuild the grey signal. */
  let lastSignal = '';
  function apply() {
    const s = document.documentElement.style;
    s.setProperty('--bg', T.bg); s.setProperty('--ink', T.ui); s.setProperty('--line', T.rule);
    s.setProperty('--mono', FONTS[T.font].css); s.setProperty('--size', T.fontSize + 'px'); s.setProperty('--track', T.tracking + 'em');
    s.setProperty('--bracket', T.bracket + 'px'); s.setProperty('--dock-w', T.dockW + 'px'); s.setProperty('--fade', T.fade / 1000 + 's');
    const sig = T.res + '|' + T.invert;
    if (sig !== lastSignal) { lastSignal = sig; if (typeof Paper !== 'undefined') Paper.resignal(); }
    if (typeof Paper !== 'undefined') Paper.ask();
    try { localStorage.setItem(KEY, JSON.stringify(T)); } catch (e) {}
  }

  /* ---- panel UI ---- */
  const panel = document.getElementById('bc'), body = document.getElementById('bcBody'), toggle = document.getElementById('bcToggle'), note = document.getElementById('bcNote');
  const inputs = {};
  for (const g of SCHEMA) {
    const d = document.createElement('details'); d.open = !!g.open;
    d.innerHTML = '<summary>' + g.group + '</summary>';
    for (const it of g.items) {
      const row = document.createElement('div'); row.className = 'bc-row bc-' + it.type;
      const id = 'bc_' + it.k;
      let ctl;
      if (it.type === 'range') ctl = `<input type="range" id="${id}" min="${it.min}" max="${it.max}" step="${it.step}">`;
      else if (it.type === 'color') ctl = `<input type="color" id="${id}">`;
      else if (it.type === 'toggle') ctl = `<input type="checkbox" id="${id}">`;
      else ctl = `<select id="${id}">` + Object.entries(it.options).map(([v, l]) => `<option value="${v}">${l}</option>`).join('') + '</select>';
      const range = it.type === 'range' ? `${it.min}–${it.max}${it.unit ? ' ' + it.unit : ''} · default ${it.def}` : it.type === 'color' ? `default ${it.def}` : `default ${show(it, it.def)}`;
      row.innerHTML = `<label for="${id}">${it.label}</label><output for="${id}"></output>${ctl}<small>${range}${it.note ? ' · ' + it.note : ''}</small>`;
      d.appendChild(row);
      const el = row.querySelector('#' + id), out = row.querySelector('output');
      inputs[it.k] = { el, out, it, row };
      el.addEventListener(it.type === 'select' || it.type === 'toggle' ? 'change' : 'input', () => {
        T[it.k] = it.type === 'range' ? +el.value : it.type === 'toggle' ? el.checked : el.value;
        sync(it.k); apply();
      });
    }
    body.appendChild(d);
  }
  function sync(k) {
    const { el, out, it, row } = inputs[k];
    if (it.type === 'toggle') el.checked = T[k]; else el.value = T[k];
    out.textContent = show(it, T[k]);
    row.classList.toggle('changed', T[k] !== it.def);
  }
  const syncAll = () => ITEMS.forEach(it => sync(it.k));

  function setOpen(open) {
    panel.hidden = !open; toggle.setAttribute('aria-expanded', open);
    if (open) panel.querySelector('summary').focus();
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  document.getElementById('bcClose').addEventListener('click', () => { setOpen(false); toggle.focus(); });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { setOpen(false); toggle.focus(); } });

  const say = (msg) => { note.textContent = msg; clearTimeout(say.t); say.t = setTimeout(() => note.textContent = '', 2500); };
  document.getElementById('bcDefaults').addEventListener('click', () => { Object.assign(T, DEF); syncAll(); apply(); say('All controls restored to their defaults.'); });
  document.getElementById('bcReset').addEventListener('click', () => { document.getElementById('restart').click(); say('Sequence reset to the empty frame. Controls kept.'); });

  function prompt() {
    const changed = ITEMS.filter(it => T[it.k] !== it.def);
    const line = it => `- ${it.label} (\`${it.k}\`): ${show(it, T[it.k])}` + (it.type === 'range' ? ` [range ${it.min}–${it.max}${it.unit ? ' ' + it.unit : ''}, default ${it.def}]` : ` [default ${show(it, it.def)}]`);
    return [
      'Update the Scan Lines sequence prototype (GitHub Pages site in /docs) so these Behavior Controls values become the new defaults.',
      'Set each value as the `def` of the matching key in the SCHEMA in docs/js/behavior.js, and keep the controls panel working.',
      '',
      changed.length ? `Changed from the defaults (${changed.length}):` : 'No values differ from the current defaults.',
      ...changed.map(line),
      '',
      'Full parameter set:',
      ...SCHEMA.flatMap(g => [`${g.group}:`, ...g.items.map(line)]),
    ].join('\n');
  }
  document.getElementById('bcCopy').addEventListener('click', async () => {
    const text = prompt();
    try { await navigator.clipboard.writeText(text); say('Copied ' + text.split('\n').length + ' lines. Paste them into Claude.'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove();
      say(ok ? 'Copied. Paste it into Claude.' : 'Copy was blocked by the browser.');
    }
  });

  syncAll(); apply();
  return { T, DEF, ASPECTS, apply, prompt };
})();
