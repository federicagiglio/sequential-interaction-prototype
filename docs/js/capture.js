/* Step 01 — Capture (from study 01).
   Take or upload the source picture. Complete when a picture has loaded; until "next" is pressed it can be replaced. */
const Capture = (() => {
  const S = Paper.S, status = document.getElementById('status'), dims = document.getElementById('dims'), next = document.getElementById('toTune');
  const READY = 'Nothing leaves your device. The picture stays in this page.';

  async function use(file) {
    if (!file || S.step !== 'capture') return;
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name)) {
      status.textContent = 'That file is not a picture. Choose a JPEG, PNG, WebP or GIF.'; status.classList.add('err'); return;
    }
    status.textContent = 'Reading ' + file.name + '…'; status.classList.remove('err');
    const url = URL.createObjectURL(file);
    try {
      const img = await Scan.loadImage(url);
      if (S.picURL) URL.revokeObjectURL(S.picURL);
      S.pic = img; S.picURL = url; S.mix = 0;
      dims.textContent = img.naturalWidth + ' × ' + img.naturalHeight;
      status.textContent = 'Picture ready · ' + (file.size / 1048576).toFixed(1) + ' MB. Choose again to replace it.';
      next.disabled = false;
      Paper.ask();
    } catch (e) {
      URL.revokeObjectURL(url);
      status.textContent = /hei[cf]$/i.test(file.name) ? 'This browser cannot open HEIC photos. Set the camera to "Most compatible" or upload a JPEG.' : e.message;
      status.classList.add('err');
    }
  }
  ['take', 'pick'].forEach(id => document.getElementById(id).addEventListener('change', e => { use(e.target.files[0]); e.target.value = ''; }));

  function reset() {
    if (S.picURL) URL.revokeObjectURL(S.picURL);
    S.pic = null; S.picURL = null; S.G = null; S.mix = 1;
    dims.textContent = '—'; status.textContent = READY; status.classList.remove('err'); next.disabled = true;
  }
  return { next, reset, focus: () => document.getElementById('take').focus() };
})();
