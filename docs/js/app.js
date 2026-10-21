/* Sequence controller: one linear path, capture → tune → warp → done.
   Each step's "next" only becomes available after that step succeeds; completed steps never reopen. */
(() => {
  const S = Paper.S;
  const ORDER = ['capture', 'tune', 'warp', 'done'];
  const COPY = {
    capture: { tag: '01 / capture', hint: 'the picture becomes the signal for the lines', say: 'Step 1 of 3: capture. Take a picture, upload one, or start a live view.' },
    tune:    { tag: '02 / tune',    hint: 'brightness lifts every line',                 say: 'Step 2 of 3: tune. Sliders are optional; continue whenever you are ready.' },
    warp:    { tag: '03 / warp',    hint: 'the picture travels with the lines you move',  say: 'Step 3 of 3: warp. Drag, pinch or scroll on the picture, then finish.' },
    done:    { tag: '04 / done',    hint: 'signal you can touch',                         say: 'Finished. Save the image or start over.' },
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const focusFor = { capture: Capture.focus, tune: Tune.focus, warp: Warp.focus, done: () => document.getElementById('save').focus() };

  function go(step) {
    S.step = step; document.body.dataset.step = step;
    const i = ORDER.indexOf(step);
    document.querySelectorAll('.progress li').forEach(li => {
      const j = ORDER.indexOf(li.dataset.for);
      li.className = j < i ? 'past' : j === i ? 'now' : '';
      if (j === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.dataset.panel === step));
    document.getElementById('stepTag').textContent = COPY[step].tag;
    document.getElementById('hint').textContent = COPY[step].hint;
    document.getElementById('announce').textContent = COPY[step].say;
    Paper.ask();
    setTimeout(focusFor[step], 50);
  }

  Capture.next.addEventListener('click', () => {
    if (!S.pic) return;
    S.G = Paper.signal();                    // the picture becomes the signal
    go('tune'); Paper.crossfade(reduced ? 0 : Settings.T.crossfade);
  });
  Tune.next.addEventListener('click', () => go('warp'));
  Warp.next.addEventListener('click', () => { Warp.release(); go('done'); });

  document.getElementById('save').addEventListener('click', async () => {
    const blob = await Paper.exportPNG(); if (!blob) return;
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = 'scan-lines.png'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.getElementById('restart').addEventListener('click', () => {
    Warp.reset(); Tune.reset(); Capture.reset(); go('capture');
  });

  go('capture');
})();
