/* Paper — the one surface that persists through the sequence.
   Holds the shared state every step reads and writes, works out where the paper sits, and draws it.
   The paper rectangle depends only on the picture and the window, never on the step, so it does not move between steps.
   Look-and-feel values come from Settings.T (js/settings.js). */
const Paper = (() => {
  const cv = document.getElementById('cv'), frame = document.getElementById('frame'), dock = document.getElementById('dock');
  const FW = 72, FH = 48;                       // warp field resolution (study 03)
  const S = {
    step: 'capture',
    pic: null, picURL: null,                    // study 01 output
    G: null,                                    // grey signal, Scan.toGrey(pic, T.res)
    P: { lines: 110, angle: 0, weight: 1.4, colour: false },   // study 02 output (+ b/w or colour lines)
    FX: new Float32Array(FW * FH), FY: new Float32Array(FW * FH), edits: 0,   // study 03 output
    ring: null,                                 // brush ring overlay (study 03)
    mix: 1,                                     // 0 = photo, 1 = scan lines; animated when the picture becomes the signal
    live: null,                                 // webcam <video> while the snap preview is open (capture step)
    feed: null,                                 // webcam <video> in live view: S.pic is then a canvas refreshed every frame
    fx: { drift: 4, speed: 0.3, pull: 18, size: 18, gain: 1 },   // play controls: drift px / Hz, magnet px / % height, sound gain
    hover: null, magnet: 0,                     // cursor or finger position (magnet) and its eased strength 0–1
    spectrum: null,                             // Float32Array 0–1 per frequency band while the microphone is on
  };
  let R = null, Sheet = null, queued = false;
  const api = { onFrame: null };                // public surface, filled in at the end; onFrame is set while recording
  const T = () => Settings.T;

  /* Reserve room for the tallest panel so the paper keeps one size and position for the whole sequence. */
  function pad(H) {
    let tallest = 0;
    for (const p of dock.children) tallest = Math.max(tallest, p.offsetHeight);
    const dockBottom = dock.getBoundingClientRect().bottom;
    return [72, 16, H - dockBottom + tallest + 14, 16];
  }

  /* The picture becomes the signal: grey array at the chosen resolution, optionally inverted. */
  function signal() {
    if (!S.pic) return null;
    const G = Scan.toGrey(S.pic, T().res);
    if (T().invert) for (let i = 0; i < G.a.length; i++) G.a[i] = 1 - G.a[i];
    return G;
  }
  function resignal() { if (S.G) { S.G = signal(); ask(); } }

  function fieldAt(u, v) {
    const x = Math.min(FW - 1.001, Math.max(0, u * (FW - 1))), y = Math.min(FH - 1.001, Math.max(0, v * (FH - 1)));
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * FW + x0;
    const l = (A) => (A[i] * (1 - fx) + A[i + 1] * fx) * (1 - fy) + (A[i + FW] * (1 - fx) + A[i + FW + 1] * fx) * fy;
    return [l(S.FX), l(S.FY)];
  }
  const fieldWarp = (x, y) => { const d = fieldAt((x - R.x) / R.w, (y - R.y) / R.h); return [d[0] * R.h, d[1] * R.h]; };

  /* Living lines: drift (a wave rolling along the lines), magnet (lines bend away from the cursor or finger)
     and sound (each stretch of line shakes with its own frequency band, low on one side, high on the other).
     Returns a warp(x, y) for time t in seconds, or null when everything is still. */
  function motion(t, Rect) {
    const F = S.fx, th = S.P.angle * Math.PI / 180, ax = Math.cos(th), ay = Math.sin(th), nx = -ay, ny = ax;
    const drift = F.drift > 0, mag = S.magnet > 0.001 && S.hover && F.pull > 0, B = S.spectrum && F.gain > 0 ? S.spectrum : null;
    if (!drift && !mag && !B) return null;
    const ph = 2 * Math.PI * F.speed * t, h = S.hover, r2 = (Rect.h * F.size / 100) ** 2, pull = F.pull * S.magnet;
    const nb = B ? B.length : 0, top = nb * 0.7, sAmp = Rect.h * 0.06 * F.gain;
    return (x, y) => {
      let dx = 0, dy = 0;
      const along = Math.min(1, Math.max(0, ((x - Rect.x) * ax + (y - Rect.y) * ay) / Rect.w));
      if (drift) { const s = F.drift * Math.sin(ph - along * 4 * Math.PI); dx += nx * s; dy += ny * s; }
      if (B) { const k = B[Math.min(nb - 1, Math.round(2 * Math.pow(top / 2, along)))]; const s = sAmp * k * Math.sin(t * 38 + y * 0.35); dx += nx * s; dy += ny * s; }
      if (mag) {
        const ex = x - h.x, ey = y - h.y, d2 = ex * ex + ey * ey;
        if (d2 < 9 * r2) { const d = Math.sqrt(d2) || 1, w = pull * Math.exp(-d2 / r2); dx += ex / d * w; dy += ey / d * w; }
      }
      return [dx, dy];
    };
  }

  function lines(ctx, Rect, t) {
    const o = T(), mv = motion(t, Rect), fw = S.edits ? fieldWarp : null;
    const warp = fw && mv ? (x, y) => { const a = fw(x, y), b = mv(x, y); return [a[0] + b[0], a[1] + b[1]]; } : fw || mv;
    ctx.save();
    ctx.globalAlpha *= o.lineA;
    if (o.glow) { ctx.shadowColor = S.P.colour ? 'rgba(255,255,255,.5)' : o.ink; ctx.shadowBlur = o.glow; }
    Scan.draw(ctx, S.G, Rect, { lines: S.P.lines, angle: S.P.angle, weight: S.P.weight, depth: o.depth, smooth: o.smooth, ink: o.ink, tint: S.P.colour, warp });
    ctx.restore();
  }

  function paint(ctx, t) {
    const under = Math.max(1 - S.mix, T().underlay);
    if (under > 0) { ctx.globalAlpha = under; ctx.drawImage(S.pic, R.x, R.y, R.w, R.h); }
    if (S.mix > 0 && S.G) { ctx.globalAlpha = S.mix; lines(ctx, R, t); }
    ctx.globalAlpha = 1;
  }

  function render(now) {
    queued = false;
    const o = T(), { ctx, W, H } = Scan.canvasFit(cv, o.bg);
    /* The sheet: the frame from study 01 (4:3 by default), kept for every step. The picture sits inside it, contained, never cropped. */
    Sheet = Scan.fit({ w: o.aspect, h: 1 }, W, H, pad(H));
    Object.assign(frame.style, { left: Sheet.x + 'px', top: Sheet.y + 'px', width: Sheet.w + 'px', height: Sheet.h + 'px' });
    const cam = S.live && S.live.videoWidth ? S.live : null;
    frame.classList.toggle('blank', !S.pic && !cam);
    if (cam) {                                  // live webcam preview, mirrored like a mirror, on the same sheet
      const V = inner(Sheet, cam.videoWidth, cam.videoHeight);
      ctx.save(); ctx.translate(V.x + V.w, V.y); ctx.scale(-1, 1); ctx.drawImage(cam, 0, 0, V.w, V.h); ctx.restore();
      R = null; return;
    }
    if (!S.pic) { R = null; return; }
    R = inner(Sheet);
    paint(ctx, (now || performance.now()) / 1000);
    if (S.ring && o.ringA) { ctx.strokeStyle = o.ink; ctx.globalAlpha = o.ringA; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(S.ring.x, S.ring.y, S.ring.r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    if (api.onFrame) api.onFrame(cv, Sheet);    // video recorder copies the sheet from here
  }
  /* Picture rectangle inside the sheet; extra room on top for the brightness lift. */
  function inner(F, w = S.pic.naturalWidth || S.pic.width, h = S.pic.naturalHeight || S.pic.height) {
    const m = T().margin / 100, top = m + T().depth * 0.75;
    const r = Scan.fit({ w, h }, F.w, F.h, [F.h * top, F.w * m, F.h * m, F.w * m]);
    return { x: F.x + r.x, y: F.y + r.y, w: r.w, h: r.h };
  }
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(render); } };

  /* Live view: copy each new camera frame (mirrored, as in the preview) into S.pic and, once the lines exist, rebuild the signal. */
  let lastFrame = -1;
  function grab() {
    const v = S.feed; if (!v || !v.videoWidth || v.currentTime === lastFrame) return false;
    lastFrame = v.currentTime;
    const c = S.pic, g = c.getContext('2d');
    if (c.width !== v.videoWidth || c.height !== v.videoHeight) { c.width = v.videoWidth; c.height = v.videoHeight; }
    g.setTransform(-1, 0, 0, 1, c.width, 0); g.drawImage(v, 0, 0, c.width, c.height);
    if (S.G) S.G = signal();
    return true;
  }
  function setFeed(v) { S.feed = v; S.pic = document.createElement('canvas'); lastFrame = -1; grab(); ask(); }
  function clearFeed() { S.feed = null; lastFrame = -1; }

  /* Keep redrawing while a camera is showing, while the lines are alive (drift, magnet, sound) or while recording. */
  (function loop() {
    const target = S.hover && S.G ? 1 : 0;
    S.magnet += (target - S.magnet) * 0.12;     // magnet eases in and lets go softly
    if (S.magnet < 0.001 && !target) S.magnet = 0;
    const alive = S.G && S.mix > 0 && (S.fx.drift > 0 || S.magnet > 0 || S.spectrum);
    if (S.live || (S.feed && grab()) || alive || api.onFrame) ask();
    requestAnimationFrame(loop);
  })();

  /* Picture → signal: fade the photo out while its scan lines fade in. */
  function crossfade(ms) {
    if (ms <= 0) { S.mix = 1; ask(); return; }
    const t0 = performance.now(); S.mix = 0;
    const tick = (now) => { S.mix = Math.min(1, (now - t0) / ms); render(now); if (S.mix < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /* Draw the finished sheet on its own, at 2× the on-screen size, and hand back a PNG blob. */
  function exportPNG() {
    return new Promise(res => {
      const s = 2, c = document.createElement('canvas');
      c.width = Math.round(Sheet.w * s); c.height = Math.round(Sheet.h * s);
      const ctx = c.getContext('2d');
      ctx.fillStyle = T().bg; ctx.fillRect(0, 0, c.width, c.height);
      ctx.setTransform(s, 0, 0, s, -Sheet.x * s, -Sheet.y * s);
      paint(ctx, performance.now() / 1000);
      c.toBlob(res, 'image/png');
    });
  }

  function clearWarp() { S.FX.fill(0); S.FY.fill(0); S.edits = 0; }

  addEventListener('resize', ask);
  Object.assign(api, { S, FW, FH, rect: () => R, sheet: () => Sheet, canvas: cv, render, ask, crossfade, exportPNG, clearWarp, signal, resignal, setFeed, clearFeed });
  return api;
})();
