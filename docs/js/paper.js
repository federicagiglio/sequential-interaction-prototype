/* Paper — the one surface that persists through the sequence.
   Holds the shared state every step reads and writes, works out where the paper sits, and draws it.
   The paper rectangle depends only on the picture and the window, never on the step, so it does not move between steps. */
const Paper = (() => {
  const cv = document.getElementById('cv'), frame = document.getElementById('frame'), dock = document.getElementById('dock');
  const FW = 72, FH = 48;                       // warp field resolution (study 03)
  const S = {
    step: 'capture',
    pic: null, picURL: null,                    // study 01 output
    G: null,                                    // grey signal, Scan.toGrey(pic, 260)
    P: { lines: 110, angle: 0, weight: 1.4 },   // study 02 output
    FX: new Float32Array(FW * FH), FY: new Float32Array(FW * FH), edits: 0,   // study 03 output
    ring: null,                                 // brush ring overlay (study 03)
    mix: 1,                                     // 0 = photo, 1 = scan lines; animated when the picture becomes the signal
  };
  let R = null, Sheet = null, queued = false;

  /* Reserve room for the tallest panel so the paper keeps one size and position for the whole sequence. */
  function pad(H) {
    let tallest = 0;
    for (const p of dock.children) tallest = Math.max(tallest, p.offsetHeight);
    const dockBottom = dock.getBoundingClientRect().bottom;
    return [72, 16, H - dockBottom + tallest + 14, 16];
  }

  function fieldAt(u, v) {
    const x = Math.min(FW - 1.001, Math.max(0, u * (FW - 1))), y = Math.min(FH - 1.001, Math.max(0, v * (FH - 1)));
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * FW + x0;
    const l = (A) => (A[i] * (1 - fx) + A[i + 1] * fx) * (1 - fy) + (A[i + FW] * (1 - fx) + A[i + FW + 1] * fx) * fy;
    return [l(S.FX), l(S.FY)];
  }
  const warp = (x, y) => { const d = fieldAt((x - R.x) / R.w, (y - R.y) / R.h); return [d[0] * R.h, d[1] * R.h]; };

  function lines(ctx, Rect) {
    Scan.draw(ctx, S.G, Rect, { lines: S.P.lines, angle: S.P.angle, weight: S.P.weight, depth: 0.08, warp: S.edits ? warp : null });
  }

  function render() {
    queued = false;
    const { ctx, W, H } = Scan.canvasFit(cv);
    /* The sheet: the 4:3 frame from study 01, kept for every step. The picture sits inside it, contained, never cropped. */
    Sheet = Scan.fit({ w: 4, h: 3 }, W, H, pad(H));
    Object.assign(frame.style, { left: Sheet.x + 'px', top: Sheet.y + 'px', width: Sheet.w + 'px', height: Sheet.h + 'px' });
    frame.classList.toggle('blank', !S.pic);
    if (!S.pic) { R = null; return; }
    R = inner(Sheet);
    if (S.mix < 1) { ctx.globalAlpha = 1 - S.mix; ctx.drawImage(S.pic, R.x, R.y, R.w, R.h); }
    if (S.mix > 0 && S.G) { ctx.globalAlpha = S.mix; lines(ctx, R); }
    ctx.globalAlpha = 1;
    if (S.ring) { ctx.strokeStyle = 'rgba(232,232,232,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(S.ring.x, S.ring.y, S.ring.r, 0, 7); ctx.stroke(); }
  }
  /* Picture rectangle inside the sheet; extra room on top for the brightness lift (depth 0.08). */
  function inner(F) {
    const r = Scan.fit({ w: S.pic.naturalWidth, h: S.pic.naturalHeight }, F.w, F.h, [F.h * 0.1, F.w * 0.04, F.h * 0.04, F.w * 0.04]);
    return { x: F.x + r.x, y: F.y + r.y, w: r.w, h: r.h };
  }
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(render); } };

  /* Picture → signal: fade the photo out while its scan lines fade in. */
  function crossfade(ms) {
    if (ms <= 0) { S.mix = 1; ask(); return; }
    const t0 = performance.now(); S.mix = 0;
    const tick = (now) => { S.mix = Math.min(1, (now - t0) / ms); render(); if (S.mix < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /* Draw the finished sheet on its own, at 2× the on-screen size, and hand back a PNG blob. */
  function exportPNG() {
    return new Promise(res => {
      const s = 2, c = document.createElement('canvas');
      c.width = Math.round(Sheet.w * s); c.height = Math.round(Sheet.h * s);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.setTransform(s, 0, 0, s, -Sheet.x * s, -Sheet.y * s);
      lines(ctx, R);
      c.toBlob(res, 'image/png');
    });
  }

  function clearWarp() { S.FX.fill(0); S.FY.fill(0); S.edits = 0; }

  addEventListener('resize', ask);
  return { S, FW, FH, rect: () => R, sheet: () => Sheet, canvas: cv, render, ask, crossfade, exportPNG, clearWarp };
})();
