var LOGO = 'assets/logo.svg';
var THEMES = {
  blue: { label: 'Синій', hex: '#1f5bd8', mul: '#4d8dff', scr: '#0b1f5c', texture: 'assets/tx-blue.webp' },
  green: { label: 'Зелений', hex: '#2fa84f', mul: '#5fdc7c', scr: '#06331a', texture: 'assets/tx-green.webp' },
  yellow: { label: 'Жовтий', hex: '#f2a93b', mul: '#ffc04d', scr: '#4a2200', texture: 'assets/tx-yellow.webp' }
};
var SCALE = 480 / 1080;
// --- draw:start
// Card geometry in export pixels (1080×1350); the DOM preview uses the same numbers × SCALE.
var CARD = { w: 1080, h: 1350, frame: { x: 80, y: 600, w: 920, h: 750, cut: 100 }, logo: { x: 260, y: 195, w: 560 } };

function nameText(raw) {
  var n = (raw || '').trim();
  return (n || 'Твоє імʼя').toUpperCase();
}

// Shrinks long names so the label stays inside the card.
function nameFont(text) {
  return Math.round(Math.min(88, 800 / (Math.max(text.length, 1) * 0.66)));
}

function loadImage(src) {
  return new Promise(function (res, rej) {
    var img = new Image();
    if (src.indexOf('blob:') !== 0) img.crossOrigin = 'anonymous';
    img.onload = function () { res(img); };
    img.onerror = rej;
    img.src = src;
  });
}

// White "torn paper" label rotated around its top-left corner, matching the CSS clip-paths.
function drawLabel(ctx, text, size, padX, padY, x, y, deg, pts) {
  ctx.font = '800 ' + size + 'px Onest, sans-serif';
  var w = ctx.measureText(text).width + padX * 2;
  var h = size * 1.05 + padY * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(deg * Math.PI / 180);
  ctx.beginPath();
  pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * w, p[1] * h); else ctx.moveTo(p[0] * w, p[1] * h); });
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX, h / 2 + size * 0.04);
  ctx.restore();
}

// Same maths as CSS object-fit: cover + object-position 50% 40% + scale(zoom) around 50% 40%.
function drawCover(ctx, img, box, zoom) {
  var s0 = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  var dw0 = img.naturalWidth * s0, dh0 = img.naturalHeight * s0;
  var x0 = box.x + (box.w - dw0) * 0.5, y0 = box.y + (box.h - dh0) * 0.4;
  var cx = box.x + box.w * 0.5, cy = box.y + box.h * 0.4;
  ctx.drawImage(img, cx + (x0 - cx) * zoom, cy + (y0 - cy) * zoom, dw0 * zoom, dh0 * zoom);
}

async function renderCard(canvas, o) {
  var ctx = canvas.getContext('2d');
  var W = CARD.w, H = CARD.h, f = CARD.frame;
  canvas.width = W; canvas.height = H;
  try { await document.fonts.load('800 88px Onest'); await document.fonts.load('600 30px Onest'); } catch (e) {}
  var theme = THEMES[o.color];
  var imgs = await Promise.all([loadImage(o.photo || theme.texture), loadImage(o.logo || LOGO)]);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(f.x, f.y + f.cut); ctx.lineTo(f.x + f.w, f.y); ctx.lineTo(f.x + f.w, f.y + f.h); ctx.lineTo(f.x, f.y + f.h);
  ctx.closePath();
  ctx.clip();
  if (o.photo) {
    // Brand duotone: grayscale photo, multiplied by the light tint, then dark tint screened over the shadows.
    ctx.filter = 'grayscale(1) contrast(1.15)';
    drawCover(ctx, imgs[0], f, o.zoom || 1);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = theme.mul; ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = theme.scr; ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    drawCover(ctx, imgs[0], f, 1);
  }
  ctx.restore();

  var lg = imgs[1];
  ctx.drawImage(lg, CARD.logo.x, CARD.logo.y, CARD.logo.w, CARD.logo.w * lg.naturalHeight / lg.naturalWidth);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 30px Onest, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.textBaseline = 'top';
  // Mirrors the preview's flex space-between: the middle item sits halfway between its neighbours.
  var wl = ctx.measureText('12 ГРУДНЯ 2026').width, wm = ctx.measureText('ОФЛАЙН').width, wr = ctx.measureText('КИЇВ').width;
  var gap = (W - 140 - wl - wm - wr) / 2;
  ctx.textAlign = 'left';
  ctx.fillText('12 ГРУДНЯ 2026', 70, 64);
  ctx.fillText('ОФЛАЙН', 70 + wl + gap, 64);
  ctx.fillText('КИЇВ', W - 70 - wr, 64);
  ctx.textAlign = 'left';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  drawLabel(ctx, 'Я ЙДУ НА', 64, 32, 20, 90, 150, -4, [[0, .14], [1, 0], [.97, 1], [.03, .88]]);
  var text = nameText(o.name);
  drawLabel(ctx, text, nameFont(text), 34, 20, 80, 1170, 2, [[.03, 0], [1, .12], [.98, .9], [0, 1]]);
  return canvas;
}

(function () {
  var state = { name: '', color: 'blue', photo: null, zoom: 1, result: null, saving: false };
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    photoInput: $('gen-photo'), photoLabel: $('photo-label'), clear: $('photo-clear'),
    zoomRow: $('zoom-row'), zoom: $('gen-zoom'), name: $('gen-name'),
    download: $('download'), downloadLabel: $('download-label'), status: $('status'),
    result: $('result'), resultImg: $('result-img'), resultLink: $('result-link'),
    frame: $('frame'), framePhoto: $('frame-photo'), photoImg: $('photo-img'),
    tintMul: $('tint-mul'), tintScr: $('tint-scr'), frameTexture: $('frame-texture'),
    textureImg: $('texture-img'), nameLabel: $('name-label'),
    swatches: document.querySelectorAll('.swatch[data-color]')
  };

  function render() {
    var theme = THEMES[state.color];
    var shown = nameText(state.name);
    el.nameLabel.textContent = shown;
    el.nameLabel.style.fontSize = (nameFont(shown) * SCALE).toFixed(1) + 'px';
    el.frame.style.background = theme.scr;
    el.tintMul.style.background = theme.mul;
    el.tintScr.style.background = theme.scr;
    el.textureImg.src = theme.texture;
    el.framePhoto.hidden = !state.photo;
    el.frameTexture.hidden = !!state.photo;
    if (state.photo) {
      el.photoImg.src = state.photo;
      el.photoImg.style.transform = 'scale(' + state.zoom + ')';
    }
    el.clear.hidden = !state.photo;
    el.zoomRow.hidden = !state.photo;
    el.photoLabel.textContent = state.photo ? 'Змінити фото' : 'Завантажити фото';
    el.swatches.forEach(function (b) {
      var on = b.dataset.color === state.color;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.style.border = on ? '2px solid #ffffff' : '2px solid rgba(255,255,255,.22)';
    });
    el.download.disabled = state.saving;
    el.downloadLabel.textContent = state.saving ? 'Готуємо…' : 'Завантажити PNG';
    el.result.hidden = !state.result;
    if (state.result) { el.resultImg.src = state.result; el.resultLink.href = state.result; }
  }

  function set(patch) { Object.assign(state, patch); render(); }

  el.name.addEventListener('input', function (e) { set({ name: e.target.value.slice(0, 28) }); });
  el.zoom.addEventListener('input', function (e) { set({ zoom: parseFloat(e.target.value) || 1 }); });
  el.swatches.forEach(function (b) {
    b.addEventListener('click', function () { set({ color: b.dataset.color }); });
  });
  el.photoInput.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (state.photo) URL.revokeObjectURL(state.photo);
    el.zoom.value = '1';
    set({ photo: URL.createObjectURL(file), zoom: 1 });
    el.status.textContent = '';
    e.target.value = '';
  });
  el.clear.addEventListener('click', function () {
    if (state.photo) URL.revokeObjectURL(state.photo);
    el.zoom.value = '1';
    set({ photo: null, zoom: 1 });
  });

  el.download.addEventListener('click', async function () {
    set({ saving: true });
    el.status.textContent = '';
    try {
      var canvas = await renderCard(document.createElement('canvas'), state);
      var blob = await new Promise(function (res) { canvas.toBlob(res, 'image/png'); });
      if (state.result) URL.revokeObjectURL(state.result);
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'devfest-kyiv-2026-ya-ydu.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      set({ saving: false, result: url });
      el.status.textContent = 'Готово! Якщо файл не скачався, збережи картинку нижче.';
    } catch (err) {
      set({ saving: false });
      el.status.textContent = 'Не вдалося зібрати картинку. Спробуй інше фото або зроби скріншот превʼю.';
    }
  });

  // On narrow screens the 480px preview is scaled down to the column width instead of being cropped.
  var card = $('card'), wrap = card.parentElement;
  function fit() {
    var k = Math.min(1, wrap.clientWidth / 480);
    card.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    wrap.style.height = k < 1 ? Math.round(600 * k) + 'px' : '';
  }
  window.addEventListener('resize', fit);

  render();
  fit();
})();
