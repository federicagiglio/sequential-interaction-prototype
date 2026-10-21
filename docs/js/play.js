/* Step 04 — Play. Make the lines move, then record them.
   Motion: choose a style (still, flow, ripple, breathe, glitch, twist, jitter, wave) with an amount and a speed.
   Magnet: lines bend away from the cursor or finger. Tapping the sheet moves the centre of ripple and twist.
   Sound: with the microphone on, each stretch of line shakes with its own frequency band. Everything here is optional. */
const Play = (() => {
  const S = Paper.S, $ = id => document.getElementById(id), next = $('toDone'), status = $('playStatus'), soundBtn = $('sound');
  const DEFAULTS = { amount: 8, speed: 0.4, pull: 18, size: 18, gain: 1 };
  const fmt = {
    amount: v => v.toFixed(1) + ' px',
    speed: v => v.toFixed(2) + ' Hz',
    pull: v => v + ' px',
    size: v => v + ' % of height',
    gain: v => v.toFixed(2) + ' ×',
  };
  for (const k of Object.keys(DEFAULTS)) {
    const el = $('fx_' + k), out = $('o_fx_' + k);
    el.addEventListener('input', () => { S.fx[k] = +el.value; out.textContent = fmt[k](S.fx[k]); Paper.ask(); });
  }

  /* ---- motion style ---- */
  const kinds = [...document.querySelectorAll('.moves [data-kind]')];
  function setKind(k) {
    S.fx.kind = k;
    for (const b of kinds) b.setAttribute('aria-pressed', b.dataset.kind === k);
    Paper.ask();
  }
  for (const b of kinds) b.addEventListener('click', () => setKind(b.dataset.kind));

  /* ---- magnet: follow the cursor (hover) or a finger (touch) over the stage ---- */
  const stage = $('stage'), cv = Paper.canvas;
  const local = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  function track(e) {
    if (S.step === 'capture') return;
    // In Warp, dragging warps; only a hovering mouse pulls the magnet there.
    if (S.step === 'warp' && (e.pointerType !== 'mouse' || e.buttons)) { S.hover = null; return; }
    S.hover = local(e);
  }
  stage.addEventListener('pointermove', track);
  stage.addEventListener('pointerdown', e => {
    track(e);
    if (S.step === 'play' || S.step === 'done') { S.origin = local(e); Paper.ask(); }   // tap: new centre for ripple and twist
  });
  const lose = e => { if (e.type !== 'pointerup' || e.pointerType !== 'mouse') S.hover = null; };
  ['pointerleave', 'pointercancel', 'pointerup'].forEach(t => stage.addEventListener(t, lose));

  /* ---- sound: microphone → analyser → S.spectrum (0–1 per band) ---- */
  let mic = null, ac = null, an = null, raw = null;
  function soundLoop() {
    if (!an) return;
    an.getByteFrequencyData(raw);
    for (let i = 0; i < raw.length; i++) S.spectrum[i] = Math.pow(raw[i] / 255, 1.6);
    requestAnimationFrame(soundLoop);
  }
  async function soundOn() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('This browser cannot use the microphone here (open the site over https).'); return; }
    say('Turning the microphone on… allow access if the browser asks.');
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      ac = new (window.AudioContext || window.webkitAudioContext)(); await ac.resume();
      an = ac.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.72;
      ac.createMediaStreamSource(mic).connect(an);
      raw = new Uint8Array(an.frequencyBinCount); S.spectrum = new Float32Array(an.frequencyBinCount);
      soundBtn.setAttribute('aria-pressed', 'true'); soundBtn.textContent = 'sound: on';
      say('Sound on. Talk, clap or play music: low sounds move the left of the lines, high sounds the right.');
      soundLoop();
    } catch (e) {
      soundOff();
      say(e.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it for this site in the address bar.' : 'The microphone could not be opened.');
    }
  }
  function soundOff() {
    if (mic) mic.getTracks().forEach(t => t.stop());
    if (ac) ac.close();
    mic = ac = an = null; S.spectrum = null;
    soundBtn.setAttribute('aria-pressed', 'false'); soundBtn.textContent = 'sound: off';
    Paper.ask();
  }
  soundBtn.addEventListener('click', () => mic ? (soundOff(), say(HINT)) : soundOn());
  Recorder.audio = () => mic && mic.getAudioTracks()[0];   // recordings include the microphone when it is on

  const HINT = 'pick a motion · move over the lines · tap to move the centre';
  const say = msg => { status.textContent = msg; };

  function reset() {
    Object.assign(S.fx, DEFAULTS); setKind('none'); S.hover = null; S.magnet = 0; S.origin = null;
    for (const k of Object.keys(DEFAULTS)) { $('fx_' + k).value = DEFAULTS[k]; $('o_fx_' + k).textContent = fmt[k](DEFAULTS[k]); }
    soundOff(); say(HINT);
  }
  reset();
  addEventListener('pagehide', soundOff);
  return { next, reset, focus: () => kinds[0].focus() };
})();
