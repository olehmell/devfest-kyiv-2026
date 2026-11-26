import { drawNetworkingCard } from './card.js';

const form = document.getElementById('networking-form');
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photo-preview');
const connections = document.getElementById('connections');
const decrement = document.getElementById('decrement');
const increment = document.getElementById('increment');
const taskInputs = [...document.querySelectorAll('#bingo input[type="checkbox"]')];
const generate = document.getElementById('generate');
const formStatus = document.getElementById('form-status');
const placeholder = document.getElementById('placeholder');
const result = document.getElementById('result');
const resultImage = document.getElementById('result-image');
const download = document.getElementById('download');
const share = document.getElementById('share');
const shareStatus = document.getElementById('share-status');
const logo = new Image();
logo.src = '../assets/logo.svg';

let photoUrl;
let resultUrl;
let resultFile;
let inputVersion = 0;

function updateCounterControls() {
  const value = connections.valueAsNumber;
  decrement.disabled = !Number.isFinite(value) || value <= Number(connections.min);
  increment.disabled = value >= Number(connections.max);
}

function changeCount(direction) {
  if (direction > 0) connections.stepUp();
  else connections.stepDown();
  connections.dispatchEvent(new Event('input', { bubbles: true }));
}

function clearResult() {
  inputVersion += 1;
  formStatus.textContent = '';
  shareStatus.textContent = '';
  if (!resultUrl) return;
  URL.revokeObjectURL(resultUrl);
  resultUrl = undefined;
  resultFile = undefined;
  resultImage.removeAttribute('src');
  download.removeAttribute('href');
  result.hidden = true;
  placeholder.hidden = false;
}

decrement.addEventListener('click', () => changeCount(-1));
increment.addEventListener('click', () => changeCount(1));
connections.addEventListener('input', updateCounterControls);
form.addEventListener('input', clearResult);
updateCounterControls();
generate.disabled = false;

photoInput.addEventListener('change', async () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoInput.setCustomValidity('');
  const file = photoInput.files[0];
  const selectedUrl = file ? URL.createObjectURL(file) : undefined;
  photoUrl = selectedUrl;
  photoPreview.hidden = true;
  if (!selectedUrl) {
    photoPreview.removeAttribute('src');
    return;
  }

  photoPreview.src = selectedUrl;
  try {
    await photoPreview.decode();
    if (photoUrl === selectedUrl) photoPreview.hidden = false;
  } catch {
    if (photoUrl !== selectedUrl) return;
    const message = 'Не вдалося відкрити фото. Спробуй файл JPG, PNG або WebP.';
    photoInput.setCustomValidity(message);
    formStatus.textContent = message;
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (generate.disabled) return;
  clearResult();

  const version = inputVersion;
  const count = connections.valueAsNumber;
  const tasks = taskInputs.map((input) => ({
    label: input.labels[0].textContent.trim(),
    checked: input.checked,
  }));

  generate.disabled = true;
  formStatus.textContent = 'Генеруємо картку…';
  try {
    await Promise.all([photoPreview.decode(), logo.decode()]);
    const canvas = document.createElement('canvas');
    await drawNetworkingCard(canvas, { photo: photoPreview, logo, connections: count, tasks });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (version !== inputVersion) return;
    if (!blob) throw new Error('PNG encoding failed');

    resultFile = new File([blob], download.download, { type: 'image/png' });
    resultUrl = URL.createObjectURL(resultFile);
    resultImage.src = resultUrl;
    resultImage.alt = `Нетворкінг DevFest Kyiv 2026. Нові контакти в LinkedIn — ${count}. Бінго — ${tasks.filter(({ checked }) => checked).length} із ${tasks.length}.`;
    download.href = resultUrl;
    share.hidden = !navigator.canShare?.({ files: [resultFile] });
    placeholder.hidden = true;
    result.hidden = false;
    formStatus.textContent = 'Картка готова.';
  } catch {
    if (version === inputVersion) formStatus.textContent = 'Не вдалося згенерувати картку. Спробуй інше фото.';
  } finally {
    generate.disabled = false;
  }
});

share.addEventListener('click', async () => {
  if (!resultFile) return;
  shareStatus.textContent = '';
  try {
    await navigator.share({ files: [resultFile] });
  } catch (error) {
    if (error.name !== 'AbortError') {
      shareStatus.textContent = 'Завантаж PNG і додай його до допису в LinkedIn.';
    }
  }
});
