import { drawNetworkingCard } from './card.js?v=4';

const form = document.getElementById('networking-form');
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photo-preview');
const connections = document.getElementById('connections');
const acquaintances = document.getElementById('acquaintances');
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

function setupCounter(input) {
  const decrement = input.parentElement.querySelector('[data-step="-1"]');
  const increment = input.parentElement.querySelector('[data-step="1"]');

  function updateControls() {
    const value = input.valueAsNumber;
    decrement.disabled = !Number.isFinite(value) || value <= Number(input.min);
    increment.disabled = value >= Number(input.max);
  }

  decrement.addEventListener('click', () => {
    input.stepDown();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  increment.addEventListener('click', () => {
    input.stepUp();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  input.addEventListener('input', updateControls);
  updateControls();
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

setupCounter(connections);
setupCounter(acquaintances);
form.addEventListener('input', clearResult);
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
  const newContacts = connections.valueAsNumber;
  const familiarFaces = acquaintances.valueAsNumber;
  const tasks = taskInputs.map((input) => ({
    label: input.labels[0].textContent.trim(),
    checked: input.checked,
  }));

  generate.disabled = true;
  formStatus.textContent = 'Генеруємо картку…';
  try {
    await Promise.all([photoPreview.decode(), logo.decode()]);
    const canvas = document.createElement('canvas');
    await drawNetworkingCard(canvas, { photo: photoPreview, logo, connections: newContacts, acquaintances: familiarFaces, tasks });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (version !== inputVersion) return;
    if (!blob) throw new Error('PNG encoding failed');

    resultFile = new File([blob], download.download, { type: 'image/png' });
    resultUrl = URL.createObjectURL(resultFile);
    resultImage.src = resultUrl;
    resultImage.alt = `Мій DevFest нетворкінг. Нові контакти в LinkedIn — ${newContacts}. Знайомих зустрів — ${familiarFaces}. Бінго — ${tasks.filter(({ checked }) => checked).length} із ${tasks.length}.`;
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
