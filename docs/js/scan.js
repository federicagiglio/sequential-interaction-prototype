/* Scan — the shared scan-line core, extracted from the three studies (the block was byte-identical in each).
   Only change: canvasFit takes an optional ground colour.
   Rule: the brightness under each line lifts it, Rutt/Etra style. */
const Scan = (() => {
  // Turn any image source into a small grey array we can sample quickly.
  function toGrey(src, maxSide) {
    const s = Math.min(1, maxSide / Math.max(src.width, src.height));
    const w = Math.max(2, Math.round(src.width * s)), h = Math.max(2, Math.round(src.height * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data, a = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
    return { w, h, a };
  }
  function sample(G, u, v) {               // u,v in 0..1, bilinear
    const x = Math.min(G.w - 1.001, Math.max(0, u * (G.w - 1))), y = Math.min(G.h - 1.001, Math.max(0, v * (G.h - 1)));
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * G.w + x0, a = G.a;
    return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + G.w] * (1 - fx) + a[i + G.w + 1] * fx) * fy;
  }
  function fit(G, W, H, pad) {              // picture rectangle, contained and centred
    const s = Math.min((W - pad[1] - pad[3]) / G.w, (H - pad[0] - pad[2]) / G.h);
    const rw = G.w * s, rh = G.h * s;
    return { x: pad[3] + (W - pad[1] - pad[3] - rw) / 2, y: pad[0] + (H - pad[0] - pad[2] - rh) / 2, w: rw, h: rh };
  }
  /* Draw the picture as scan lines.
     o.lines   number of lines (counted across the picture height at 0°)
     o.angle   direction in degrees (0 = horizontal, 90 = vertical)
     o.weight  line thickness in CSS px
     o.depth   how far brightness lifts a line, as a fraction of the picture height
     o.warp    optional function (x, y) -> [dx, dy] that moves each point (and the picture with it) */
  function draw(ctx, G, R, o) {
    const th = (o.angle || 0) * Math.PI / 180, dx = Math.cos(th), dy = Math.sin(th), nx = -dy, ny = dx;
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2, L = Math.hypot(R.w, R.h) / 2;
    const gap = R.h / o.lines, step = Math.max(2, Math.min(4, gap / 1.5)), lift = (o.depth == null ? 0.045 : o.depth) * R.h;
    ctx.lineWidth = o.weight; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = o.ink || '#e8e8e8';
    ctx.beginPath();
    for (let t = -L + ((L % gap) || gap) / 2; t <= L; t += gap) {
      let pen = false, prev = 0; const sm = o.smooth == null ? 0.3 : o.smooth;
      for (let u = -L; u <= L; u += step) {
        let x = cx + dx * u + nx * t, y = cy + dy * u + ny * t;
        if (x < R.x || x > R.x + R.w || y < R.y || y > R.y + R.h) { pen = false; continue; }
        let b = sample(G, (x - R.x) / R.w, (y - R.y) / R.h);
        b = pen ? prev + (b - prev) * (1 - sm) : b; prev = b;   // smooth the signal along the line, as in scanlines.html
        let px = x - nx * b * lift, py = y - ny * b * lift;
        if (o.warp) { const d = o.warp(x, y); px += d[0]; py += d[1]; }
        if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
      }
    }
    ctx.stroke();
  }
  function canvasFit(cv, fill) {              // fill: ground colour (added for the behavior controls; studies used #000)
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = fill || '#000'; ctx.fillRect(0, 0, W, H);
    return { ctx, W, H };
  }
  function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file could not be read as a picture.')); i.src = src; }); }
  return { toGrey, sample, fit, draw, canvasFit, loadImage };
})();
