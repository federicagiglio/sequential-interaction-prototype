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
    feed: null,                                 // <video> in live view or video upload: S.pic is then a canvas refreshed every frame
    fx: { kind: 'none', amount: 8, speed: 0.4, pull: 18, size: 18, gain: 1 },   // play controls: motion style, amount px, speed Hz, magnet px / % height, sound gain
    origin: null,                               // where the last tap landed in Play (ripple and twist centre); null = sheet centre
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

  /* Living lines. One chosen motion style (S.fx.kind) plus the magnet (lines bend away from the cursor or finger)
     and sound (each stretch of line shakes with its own frequency band, low on one side, high on the other).
     Returns a warp(x, y) for time t in seconds, or null when everything is still. */
  const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };   // 0–1, repeatable
  function style(kind, A, f, t, Rect, ax, ay, nx, ny) {
    const ph = 2 * Math.PI * f * t, o = S.origin || { x: Rect.x + Rect.w / 2, y: Rect.y + Rect.h / 2 }, H = Rect.h;
    switch (kind) {
      case 'wave':                              // a wave rolling along the lines
        return (x, y, along) => { const s = A * Math.sin(ph - along * 4 * Math.PI); return [nx * s, ny * s]; };
      case 'flow':                              // organic, wind-like wandering: overlapping slow sines
        return (x, y) => {
          const q = f * t;
          const a = Math.sin(x * 0.011 + q * 1.3) + Math.sin(y * 0.017 - q * 0.9) + Math.sin((x + y) * 0.007 + q * 0.6);
          const b = Math.sin(y * 0.013 + q * 0.7) + Math.sin((x - y) * 0.009 - q * 1.1);
          return [ax * b * A * 0.35 + nx * a * A * 0.4, ay * b * A * 0.35 + ny * a * A * 0.4];
        };
      case 'ripple':                            // rings spreading out from the centre, or from where you tapped
        return (x, y) => {
          const ex = x - o.x, ey = y - o.y, d = Math.hypot(ex, ey) || 1, k = A * Math.sin(d / (H * 0.12) * 2 * Math.PI - ph * 2) * Math.exp(-d / (H * 0.9));
          return [ex / d * k, ey / d * k];
        };
      case 'breathe': {                         // the whole sheet slowly swells and settles
        const k = A * 2 / H * Math.sin(ph);
        return (x, y) => [(x - o.x) * k, (y - o.y) * k];
      }
      case 'glitch': {                          // VHS: bands of lines tear sideways, now and then the picture jumps
        const slot = Math.floor(t * f * 8), band = H * 0.035, jump = hash(slot, 7) < 0.08 ? (hash(slot, 9) - 0.5) * A * 3 : 0;
        return (x, y) => {
          const b = Math.floor((x * nx + y * ny) / band), r = hash(b, slot);
          const s = r < 0.14 ? (hash(b, slot + 1) - 0.5) * A * 10 : 0;
          return [ax * s + nx * jump, ay * s + ny * jump];
        };
      }
      case 'twist': {                           // a slow vortex turning back and forth around the centre
        const th0 = A * 0.012 * Math.sin(ph);
        return (x, y) => {
          const ex = x - o.x, ey = y - o.y, th = th0 * Math.exp(-Math.hypot(ex, ey) / (H * 0.6)), c = Math.cos(th), s = Math.sin(th);
          return [ex * c - ey * s - ex, ex * s + ey * c - ey];
        };
      }
      case 'jitter': {                          // nervous static: every point shivers
        const fr = Math.floor(t * f * 24);
        return (x, y) => { const s = (hash(x * 0.37 + fr, y * 0.53) - 0.5) * A * 0.4; return [nx * s, ny * s]; };
      }
    }
    return null;
  }
  function motion(t, Rect) {
    const F = S.fx, th = S.P.angle * Math.PI / 180, ax = Math.cos(th), ay = Math.sin(th), nx = -ay, ny = ax;
    const mv = F.kind !== 'none' && F.amount > 0 ? style(F.kind, F.amount, F.speed, t, Rect, ax, ay, nx, ny) : null;
    const mag = S.magnet > 0.001 && S.hover && F.pull > 0, B = S.spectrum && F.gain > 0 ? S.spectrum : null;
    if (!mv && !mag && !B) return null;
    const h = S.hover, r2 = (Rect.h * F.size / 100) ** 2, pull = F.pull * S.magnet;
    const nb = B ? B.length : 0, top = nb * 0.7, sAmp = Rect.h * 0.06 * F.gain;
    return (x, y) => {
      let dx = 0, dy = 0;
      const along = Math.min(1, Math.max(0, ((x - Rect.x) * ax + (y - Rect.y) * ay) / Rect.w));
      if (mv) { const d = mv(x, y, along); dx += d[0]; dy += d[1]; }
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

  /* Live view and video: copy each new frame (mirrored for the camera, as in the preview) into S.pic and, once the lines exist, rebuild the signal. */
  let lastFrame = -1, mirror = true;
  function grab() {
    const v = S.feed; if (!v || !v.videoWidth || v.currentTime === lastFrame) return false;
    lastFrame = v.currentTime;
    const c = S.pic, g = c.getContext('2d'), k = Math.min(1, 960 / Math.max(v.videoWidth, v.videoHeight));   // big videos are copied at most 960px wide
    const w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    if (mirror) g.setTransform(-1, 0, 0, 1, w, 0); else g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(v, 0, 0, w, h);
    if (S.G) S.G = signal();
    return true;
  }
  /* v: a playing <video> (camera or file). mirror: true for the camera, so it behaves like a mirror. */
  function setFeed(v, mirrored = true) { S.feed = v; mirror = mirrored; S.pic = document.createElement('canvas'); lastFrame = -1; grab(); ask(); }
  function clearFeed() { S.feed = null; lastFrame = -1; }

  /* Keep redrawing while a camera is showing, while the lines are alive (drift, magnet, sound) or while recording. */
  (function loop() {
    const target = S.hover && S.G ? 1 : 0;
    S.magnet += (target - S.magnet) * 0.12;     // magnet eases in and lets go softly
    if (S.magnet < 0.001 && !target) S.magnet = 0;
    const alive = S.G && S.mix > 0 && ((S.fx.kind !== 'none' && S.fx.amount > 0) || S.magnet > 0 || S.spectrum);
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
