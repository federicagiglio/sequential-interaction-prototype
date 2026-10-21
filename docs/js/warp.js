/* Step 03 — Warp (from study 03).
   Drag pulls lines, pinch spreads or squeezes them, the wheel does the same with a mouse; double-tap clears the warp.
   The warp sits on top of the lines tuned in step 02. "next: play" is available at any time. */
const Warp = (() => {
  const S = Paper.S, FW = Paper.FW, FH = Paper.FH, stage = document.getElementById('stage'), cv = Paper.canvas;
  const stateOut = document.getElementById('state'), next = document.getElementById('toPlay');
  const live = () => S.step === 'warp' && Paper.rect();
  const T = Settings.T, brushR = () => Paper.rect().h * T.brush / 100;   // brush radius from settings.js (study: 12%)

  /* Apply a move to every node near (cx, cy): fn(nodeX, nodeY) returns the push in screen px. */
  function brush(cx, cy, radius, fn) {
    const R = Paper.rect(), r2 = radius * radius;
    for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
      const k = j * FW + i;
      const nx = R.x + i / (FW - 1) * R.w + S.FX[k] * R.h, ny = R.y + j / (FH - 1) * R.h + S.FY[k] * R.h;   // where this node is now
      const d2 = (nx - cx) ** 2 + (ny - cy) ** 2; if (d2 > 9 * r2) continue;
      const w = Math.exp(-d2 / r2), p = fn(nx, ny);
      S.FX[k] += p[0] * w / R.h; S.FY[k] += p[1] * w / R.h;
    }
    S.edits++; stateOut.textContent = 'warped';
  }
  function clear() { Paper.clearWarp(); stateOut.textContent = 'untouched'; Paper.ask(); }

  /* Pointers: one finger or the mouse drags, two fingers pinch. */
  const pts = new Map(); let pinch = null, lastTap = 0;
  const local = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  function pinchState() { const [a, b] = [...pts.values()]; return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)) }; }
  stage.addEventListener('pointerdown', e => {
    if (!live()) return;
    stage.setPointerCapture(e.pointerId); const p = local(e); pts.set(e.pointerId, p);
    if (pts.size === 2) pinch = pinchState();
    const now = performance.now();
    if (pts.size === 1 && now - lastTap < T.dbl) clear();
    lastTap = now;
    S.ring = { x: p.x, y: p.y, r: brushR() }; Paper.ask();
  });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !live()) return;
    const prev = pts.get(e.pointerId), p = local(e); pts.set(e.pointerId, p);
    if (pts.size === 1) {                                   // drag: pull the lines along with the finger
      const dx = p.x - prev.x, dy = p.y - prev.y, r = brushR();
      brush(prev.x, prev.y, r, () => [dx, dy]); S.ring = { x: p.x, y: p.y, r };
    } else if (pts.size === 2 && pinch) {                   // pinch: spread or squeeze around the midpoint, and carry it
      const now = pinchState(), s = now.d / pinch.d, mx = now.cx - pinch.cx, my = now.cy - pinch.cy, r = Math.max(brushR() * 7 / 6, now.d * 0.7);
      brush(pinch.cx, pinch.cy, r, (nx, ny) => [(nx - pinch.cx) * (s - 1) + mx, (ny - pinch.cy) * (s - 1) + my]);
      pinch = now; S.ring = { x: now.cx, y: now.cy, r };
    }
    Paper.ask();
  });
  const up = e => { pts.delete(e.pointerId); pinch = pts.size === 2 ? pinchState() : null; if (!pts.size) { S.ring = null; Paper.ask(); } };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', e => {                     // mouse wheel or trackpad pinch
    if (!live()) return; e.preventDefault();
    const p = local(e), s = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015) * T.wheel), r = brushR() * 4 / 3;
    brush(p.x, p.y, r, (nx, ny) => [(nx - p.x) * (s - 1), (ny - p.y) * (s - 1)]); S.ring = { x: p.x, y: p.y, r }; Paper.ask();
    clearTimeout(stage._t); stage._t = setTimeout(() => { S.ring = null; Paper.ask(); }, T.ringHold);
  }, { passive: false });
  stage.addEventListener('dblclick', () => { if (live()) clear(); });

  /* Leaving the step drops any live gesture so the ring never lingers on the finished paper. */
  function release() { pts.clear(); pinch = null; S.ring = null; clearTimeout(stage._t); }
  function reset() { release(); Paper.clearWarp(); stateOut.textContent = 'untouched'; }
  return { next, release, reset, focus: () => next.focus() };
})();
