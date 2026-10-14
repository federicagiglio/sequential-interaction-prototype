/* Step 02 — Tune (from study 02).
   Three sliders redraw the lines live. Complete when each slider has been moved at least once. */
const Tune = (() => {
  const S = Paper.S, next = document.getElementById('toWarp'), count = document.getElementById('tuneCount');
  const DEFAULTS = { lines: 110, angle: 0, weight: 1.4 };
  const fmt = {
    lines: v => v + ' lines',
    angle: v => v + '°' + (v === 0 || v === 180 ? ' horizontal' : v === 90 ? ' vertical' : ''),
    weight: v => v.toFixed(2) + ' px ink',
  };
  const moved = new Set();

  function progress() {
    const n = moved.size;
    count.textContent = n < 3 ? 'move each slider · ' + n + ' / 3' : 'signal set';
    next.disabled = n < 3;
  }

  for (const k of Object.keys(DEFAULTS)) {
    const el = document.getElementById(k), out = document.getElementById('o_' + k), row = el.closest('.ctl');
    el.addEventListener('input', () => {
      if (S.step !== 'tune') return;
      S.P[k] = +el.value; out.textContent = fmt[k](S.P[k]);
      if (!moved.has(k)) { moved.add(k); row.classList.add('moved'); progress(); }
      Paper.ask();
    });
  }

  function reset() {
    Object.assign(S.P, DEFAULTS); moved.clear();
    for (const k of Object.keys(DEFAULTS)) {
      const el = document.getElementById(k);
      el.value = DEFAULTS[k]; document.getElementById('o_' + k).textContent = fmt[k](DEFAULTS[k]); el.closest('.ctl').classList.remove('moved');
    }
    progress();
  }
  reset();
  return { next, reset, focus: () => document.getElementById('lines').focus() };
})();
