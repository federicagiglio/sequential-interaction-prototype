/* Step 02 — Tune (from study 02).
   Three sliders redraw the lines live, and the ink can be b/w or the picture's own colours. Tuning is optional: "next" is available straight away. */
const Tune = (() => {
  const S = Paper.S, next = document.getElementById('toWarp');
  const DEFAULTS = { lines: 110, angle: 0, weight: 1.4 };
  const fmt = {
    lines: v => v + ' lines',
    angle: v => v + '°' + (v === 0 || v === 180 ? ' horizontal' : v === 90 ? ' vertical' : ''),
    weight: v => v.toFixed(2) + ' px ink',
  };
  for (const k of Object.keys(DEFAULTS)) {
    const el = document.getElementById(k), out = document.getElementById('o_' + k);
    el.addEventListener('input', () => {
      if (S.step !== 'tune') return;
      S.P[k] = +el.value; out.textContent = fmt[k](S.P[k]);
      Paper.ask();
    });
  }

  const bw = document.getElementById('inkBW'), colour = document.getElementById('inkColour'), inkOut = document.getElementById('o_ink');
  function setInk(c) {
    S.P.colour = c; bw.setAttribute('aria-pressed', !c); colour.setAttribute('aria-pressed', c);
    inkOut.textContent = c ? "the picture's colours" : 'b/w'; Paper.ask();
  }
  bw.addEventListener('click', () => setInk(false));
  colour.addEventListener('click', () => setInk(true));

  function reset() {
    Object.assign(S.P, DEFAULTS); setInk(false);
    for (const k of Object.keys(DEFAULTS)) {
      const el = document.getElementById(k);
      el.value = DEFAULTS[k]; document.getElementById('o_' + k).textContent = fmt[k](DEFAULTS[k]);
    }
  }
  reset();
  return { next, reset, focus: () => document.getElementById('lines').focus() };
})();
