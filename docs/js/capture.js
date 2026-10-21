/* Step 01 — Capture (from study 01).
   Take a picture with the device camera or upload one. Complete when a picture has loaded; until "next" is pressed it can be replaced.
   "Take a picture" opens the camera directly (getUserMedia) with a live preview on the sheet, so it works on computers
   with a webcam as well as on phones. If the browser cannot open the camera that way, it falls back to the study's
   file input with capture="user". */
const Capture = (() => {
  const S = Paper.S, $ = id => document.getElementById(id);
  const status = $('status'), dims = $('dims'), next = $('toTune'), choices = $('choices'), cam = $('cam');
  const READY = 'Nothing leaves your device. The picture stays in this page.';
  let stream = null;
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
  function showCam(on) { choices.hidden = on; cam.hidden = !on; next.disabled = on || !S.pic; }
  function stopCam() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; S.live = null; showCam(false); Paper.ask();
  }
  async function openCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('takeFile').click(); return; }
    say('Opening the camera… allow access if the browser asks.');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.srcObject = stream;
      await v.play();
      S.live = v; showCam(true); Paper.ask();
      say('Camera on. Snap when you like the frame.');
      $('snap').focus();
    } catch (e) {
      stopCam();
      say(e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site in the address bar, or upload a picture.'
        : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'No camera was found on this device. Upload a picture instead.'
        : e.name === 'NotReadableError' ? 'The camera is in use by another app. Close it and try again, or upload a picture.'
        : 'The camera could not be opened. Upload a picture instead.', true);
    }
  }
  /* Keep the frame as it was seen in the (mirrored) preview. */
  function snap() {
    const v = S.live; if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(v, 0, 0);
    stopCam();
    c.toBlob(b => use(new File([b], 'camera.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92);
  }
  $('take').addEventListener('click', openCam);
  $('snap').addEventListener('click', snap);
  $('camCancel').addEventListener('click', () => { stopCam(); say(S.pic ? 'Camera closed. Your picture is kept.' : READY); $('take').focus(); });
  addEventListener('pagehide', stopCam);

  function reset() {
    stopCam();
    if (S.picURL) URL.revokeObjectURL(S.picURL);
    S.pic = null; S.picURL = null; S.G = null; S.mix = 1;
    dims.textContent = '—'; say(READY); next.disabled = true;
  }
  return { next, reset, focus: () => $('take').focus() };
})();
