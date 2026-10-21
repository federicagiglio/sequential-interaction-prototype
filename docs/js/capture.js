/* Step 01 — Capture (from study 01).
   Take a picture with the device camera, upload one, or start a live view. Complete when a source is in; until "next" is pressed it can be replaced.
   Live view keeps the webcam running through every later step, so the lines follow the camera instead of a still picture.
   Upload a video does the same with a video file, playing muted on a loop.
   "Take a picture" opens the camera directly (getUserMedia) with a live preview on the sheet, so it works on computers
   with a webcam as well as on phones. If the browser cannot open the camera that way, it falls back to the study's
   file input with capture="user". */
const Capture = (() => {
  const S = Paper.S, $ = id => document.getElementById(id);
  const status = $('status'), dims = $('dims'), next = $('toTune'), choices = $('choices'), cam = $('cam');
  const READY = 'Nothing leaves your device. The picture stays in this page.';
  let stream = null, feedStream = null, feedVideo = null, feedURL = null;   // feed: live camera stream, or an uploaded video
  const say = (msg, err) => { status.textContent = msg; status.classList.toggle('err', !!err); };

  async function use(file) {
    if (!file || S.step !== 'capture') return;
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name)) {
      say('That file is not a picture. Choose a JPEG, PNG, WebP or GIF.', true); return;
    }
    say('Reading ' + file.name + '…');
    const url = URL.createObjectURL(file);
    try {
      const img = await Scan.loadImage(url);
      stopFeed();
      if (S.picURL) URL.revokeObjectURL(S.picURL);
      S.pic = img; S.picURL = url; S.mix = 0;
      dims.textContent = img.naturalWidth + ' × ' + img.naturalHeight;
      const size = file.size >= 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(file.size / 1024)) + ' KB';
      say('Picture ready · ' + size + '. Choose again to replace it.');
      next.disabled = false;
      Paper.ask();
    } catch (e) {
      URL.revokeObjectURL(url);
      say(/hei[cf]$/i.test(file.name) ? 'This browser cannot open HEIC photos. Set the camera to "Most compatible" or upload a JPEG.' : e.message, true);
    }
  }
  $('pick').addEventListener('change', e => { use(e.target.files[0]); e.target.value = ''; });
  $('takeFile').addEventListener('change', e => { use(e.target.files[0]); e.target.value = ''; });

  /* ---- camera ---- */
  const camError = e => e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site in the address bar, or upload a picture.'
    : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'No camera was found on this device. Upload a picture instead.'
    : e.name === 'NotReadableError' ? 'The camera is in use by another app. Close it and try again, or upload a picture.'
    : 'The camera could not be opened. Upload a picture instead.';
  async function openStream() {
    const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.srcObject = st;
    await v.play();
    return { st, v };
  }
  const hasCam = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  /* Take a picture: preview on the sheet, then Snap or Cancel. */
  function showCam(on) { choices.hidden = on; cam.hidden = !on; next.disabled = on || !S.pic; }
  function stopCam() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; S.live = null; showCam(false); Paper.ask();
  }
  async function openCam() {
    if (!hasCam()) { $('takeFile').click(); return; }
    say('Opening the camera… allow access if the browser asks.');
    try {
      const { st, v } = await openStream(); stream = st;
      S.live = v; showCam(true); Paper.ask();
      say('Camera on. Snap when you like the frame.');
      $('snap').focus();
    } catch (e) { stopCam(); say(camError(e), true); }
  }

  /* Live view and video: a moving source that stays running all the way to the end. */
  function stopFeed() {
    if (!feedStream && !feedVideo) return;
    if (feedStream) feedStream.getTracks().forEach(t => t.stop());
    if (feedVideo) { feedVideo.pause(); feedVideo.removeAttribute('src'); feedVideo.load(); }
    if (feedURL) URL.revokeObjectURL(feedURL);
    feedStream = feedVideo = feedURL = null;
    Paper.clearFeed(); S.pic = null; S.G = null;
    $('live').setAttribute('aria-pressed', 'false');
  }
  async function openFeed() {
    if (S.step !== 'capture' || feedStream) return;
    if (!hasCam()) { say('This browser cannot stream the camera here. Open the site over https, or take or upload a picture.', true); return; }
    say('Starting live view… allow access if the browser asks.');
    try {
      const { st, v } = await openStream();
      stopFeed();
      if (S.picURL) { URL.revokeObjectURL(S.picURL); S.picURL = null; }
      feedStream = st; Paper.setFeed(v); S.mix = 0;
      $('live').setAttribute('aria-pressed', 'true');
      dims.textContent = v.videoWidth + ' × ' + v.videoHeight + ' · live';
      say('Live view on. The lines will keep following the camera. Choose again to switch to a still picture.');
      next.disabled = false; Paper.ask();
    } catch (e) { say(camError(e), true); }
  }

  /* Upload a video: it plays muted and on a loop, and the lines follow it through every step. */
  async function useVideo(file) {
    if (!file || S.step !== 'capture') return;
    if (!/^video\//.test(file.type) && !/\.(mp4|m4v|mov|webm|ogv)$/i.test(file.name)) { say('That file is not a video. Choose an MP4, WebM or MOV.', true); return; }
    say('Loading ' + file.name + '…');
    const url = URL.createObjectURL(file), v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url;
    try {
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('format')); });
      await v.play();
    } catch (e) {
      URL.revokeObjectURL(url);
      say('This browser cannot play that video. Try an MP4 (H.264) or WebM file.', true); return;
    }
    stopCam(); stopFeed();
    if (S.picURL) { URL.revokeObjectURL(S.picURL); S.picURL = null; }
    feedVideo = v; feedURL = url; Paper.setFeed(v, false); S.mix = 0;
    const secs = Math.round(v.duration || 0);
    dims.textContent = v.videoWidth + ' × ' + v.videoHeight + ' · video' + (secs ? ' ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') : '');
    say('Video ready. It loops behind the lines in every step. Choose again to replace it.');
    next.disabled = false; Paper.ask();
  }
  $('pickVideo').addEventListener('change', e => { useVideo(e.target.files[0]); e.target.value = ''; });

  /* Keep the frame as it was seen in the (mirrored) preview. */
  function snap() {
    const v = S.live; if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(v, 0, 0);
    stopCam();
    c.toBlob(b => use(new File([b], 'camera.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92);
  }
  $('take').addEventListener('click', () => { stopFeedIfStill(); openCam(); });
  $('live').addEventListener('click', openFeed);
  $('snap').addEventListener('click', snap);
  $('camCancel').addEventListener('click', () => { stopCam(); say(S.pic ? 'Camera closed. Your picture is kept.' : READY); $('take').focus(); });
  addEventListener('pagehide', () => { stopCam(); stopFeed(); });
  /* Taking a still picture replaces live view or a video; the old frame stays on the sheet until the snap lands. */
  function stopFeedIfStill() { if (feedStream || feedVideo) { stopFeed(); dims.textContent = '—'; next.disabled = true; Paper.ask(); } }

  function reset() {
    stopCam(); stopFeed();
    if (S.picURL) URL.revokeObjectURL(S.picURL);
    S.pic = null; S.picURL = null; S.G = null; S.mix = 1;
    dims.textContent = '—'; say(READY); next.disabled = true;
  }
  return { next, reset, focus: () => $('take').focus() };
})();
