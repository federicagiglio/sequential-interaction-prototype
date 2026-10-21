/* Recorder — saves the moving sheet as a video for video art.
   Every rendered frame, the sheet area of the stage canvas is copied into a recording canvas, which is streamed into
   MediaRecorder at 30 fps. If the microphone is on when recording starts, its sound is recorded too.
   Any button with data-rec toggles recording; the file downloads when recording stops (or after MAX seconds). */
const Recorder = (() => {
  const MAX = 120;                              // seconds, safety stop
  const buttons = [...document.querySelectorAll('[data-rec]')];
  const TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = typeof MediaRecorder !== 'undefined' ? TYPES.find(t => MediaRecorder.isTypeSupported(t)) : null;
  const can = !!(mime && HTMLCanvasElement.prototype.captureStream);
  let rec = null, chunks = [], t0 = 0, tick = null, audio = null;

  const label = () => {
    const s = Math.floor((performance.now() - t0) / 1000);
    return rec ? '■ stop ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : '● rec video';
  };
  function paint() { for (const b of buttons) { b.textContent = label(); b.setAttribute('aria-pressed', !!rec); } }
  if (!can) for (const b of buttons) { b.disabled = true; b.title = 'This browser cannot record video. Try Chrome, Edge, Firefox or Safari 14.1+.'; }

  function start() {
    if (rec || !can) return;
    const cv = Paper.canvas, Sh = Paper.sheet(); if (!Sh) return;
    const dpr = cv.width / cv.clientWidth, w = Math.round(Sh.w * dpr / 2) * 2, h = Math.round(Sh.h * dpr / 2) * 2;   // even sizes for the encoder
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const g = out.getContext('2d');
    Paper.onFrame = (src, S) => { const k = src.width / src.clientWidth; g.drawImage(src, S.x * k, S.y * k, S.w * k, S.h * k, 0, 0, w, h); };
    Paper.render();
    const stream = out.captureStream(30);
    const track = audio && audio(); if (track) stream.addTrack(track);
    chunks = [];
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime.split(';')[0] }), url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'scan-lines-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + (mime.includes('mp4') ? '.mp4' : '.webm');
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    rec.start(250); t0 = performance.now();
    tick = setInterval(() => { paint(); if (performance.now() - t0 > MAX * 1000) stop(); }, 250);
    paint();
  }
  function stop() {
    if (!rec) return;
    Paper.onFrame = null; clearInterval(tick);
    const r = rec; rec = null; r.stop();
    paint();
  }
  for (const b of buttons) b.addEventListener('click', () => rec ? stop() : start());
  paint();
  return { start, stop, active: () => !!rec, can, set audio(fn) { audio = fn; } };
})();
