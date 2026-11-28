const fileInput = document.getElementById('fileInput');
const chooseBtn = document.getElementById('chooseBtn');
const dropZone = document.getElementById('dropZone');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const fileName = document.getElementById('fileName');
const fileMeta = document.getElementById('fileMeta');
const removeBtn = document.getElementById('removeBtn');
const quality = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const targetSize = document.getElementById('targetSize');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const keepRatio = document.getElementById('keepRatio');
const format = document.getElementById('format');
const processBtn = document.getElementById('processBtn');
const statusBox = document.getElementById('status');
const result = document.getElementById('result');
const resultPreview = document.getElementById('resultPreview');
const downloadBtn = document.getElementById('downloadBtn');

let currentFile = null;
let sourceImage = null;
let sourceUrl = null;
let outputUrl = null;
let originalWidth = 0;
let originalHeight = 0;

document.getElementById('year').textContent = new Date().getFullYear();

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return value.toFixed(value >= 10 ? 1 : 2) + ' ' + units[i];
}

function clearOutput() {
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = null;
  result.classList.add('hidden');
  downloadBtn.removeAttribute('href');
}

function loadFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    statusBox.textContent = 'Please choose a valid image file.';
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    statusBox.textContent = 'This file is larger than 20 MB. Please choose a smaller image.';
    return;
  }

  clearOutput();
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  currentFile = file;
  sourceUrl = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    sourceImage = img;
    originalWidth = img.naturalWidth;
    originalHeight = img.naturalHeight;
    fileName.textContent = file.name;
    fileMeta.textContent = `${formatBytes(file.size)} · ${originalWidth} × ${originalHeight}px`;
    preview.src = sourceUrl;
    widthInput.value = originalWidth;
    heightInput.value = originalHeight;
    editor.classList.remove('hidden');
    dropZone.classList.add('hidden');
    statusBox.textContent = '';
    processBtn.disabled = false;
  };
  img.onerror = () => {
    statusBox.textContent = 'The image could not be opened. Try another file.';
    URL.revokeObjectURL(sourceUrl);
    sourceUrl = null;
  };
  img.src = sourceUrl;
}

chooseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => loadFile(e.target.files[0]));
removeBtn.addEventListener('click', resetApp);
quality.addEventListener('input', () => {
  qualityValue.textContent = quality.value + '%';
  clearOutput();
});

widthInput.addEventListener('input', () => {
  clearOutput();
  if (keepRatio.checked && originalWidth && widthInput.value) {
    heightInput.value = Math.max(1, Math.round(Number(widthInput.value) * originalHeight / originalWidth));
  }
});
heightInput.addEventListener('input', () => {
  clearOutput();
  if (keepRatio.checked && originalHeight && heightInput.value) {
    widthInput.value = Math.max(1, Math.round(Number(heightInput.value) * originalWidth / originalHeight));
  }
});
format.addEventListener('change', clearOutput);

keepRatio.addEventListener('change', () => {
  if (keepRatio.checked && originalWidth && widthInput.value) {
    heightInput.value = Math.round(Number(widthInput.value) * originalHeight / originalWidth);
  }
});

['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
}));
['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
}));
dropZone.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

function getOutputDimensions() {
  let w = widthInput.value.trim() ? Number(widthInput.value) : originalWidth;
  let h = heightInput.value.trim() ? Number(heightInput.value) : originalHeight;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
    throw new Error('Enter valid width and height values.');
  }
  if (w > 12000 || h > 12000 || w * h > 40000000) {
    throw new Error('The requested dimensions are too large. Maximum area is 40 megapixels.');
  }
  return { w, h };
}

function canvasToBlob(canvas, mime, q) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('This format is not supported by your browser.'));
    }, mime, q);
  });
}

processBtn.addEventListener('click', async () => {
  if (!sourceImage || !currentFile) return;async function compressToTarget(canvas, mime, targetKB) {
  let low = 0.1;
  let high = 1;
  let bestBlob = await canvasToBlob(canvas, mime, low);

  if (bestBlob.size <= targetKB * 1024) {
    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      const blob = await canvasToBlob(canvas, mime, mid);

      if (blob.size <= targetKB * 1024) {
        bestBlob = blob;
        low = mid;
      } else {
        high = mid;
      }
    }
  }

  return bestBlob;
}
  processBtn.disabled = true;
  processBtn.textContent = 'Processing…';
  statusBox.textContent = 'Processing your image on this device…';
  clearOutput();

  try {
    const { w, h } = getOutputDimensions();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Your browser does not support image processing.');

    // JPG has no transparency: paint a white background before drawing.
    const mime = format.value;
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImage, 0, 0, w, h);

    const targetKB = Number(targetSize.value);
const blob = targetSize.value.trim() && targetKB > 0
  ? await compressToTarget(canvas, mime, targetKB)
  : await canvasToBlob(canvas, mime, q);
    outputUrl = URL.createObjectURL(blob);

    const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
    const baseName = (currentFile.name.replace(/\.[^.]+$/, '') || 'image').replace(/[^a-z0-9_-]/gi, '-');
    downloadBtn.href = outputUrl;
    downloadBtn.download = `${baseName}-photolite.${extension}`;
    resultPreview.src = outputUrl;

    document.getElementById('originalSize').textContent = formatBytes(currentFile.size);
    document.getElementById('newSize').textContent = formatBytes(blob.size);
    const saved = currentFile.size - blob.size;
    document.getElementById('savedSize').textContent = saved >= 0
      ? `${((saved / currentFile.size) * 100).toFixed(1)}%`
      : `${formatBytes(Math.abs(saved))} larger`;

    result.classList.remove('hidden');
    statusBox.textContent = 'Done! Your processed image is ready to download.';
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    statusBox.textContent = error.message || 'Something went wrong. Please try again.';
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = 'Compress image';
  }
});

function resetApp() {
  clearOutput();
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = null;
  sourceImage = null;
  currentFile = null;
  fileInput.value = '';
  editor.classList.add('hidden');
  dropZone.classList.remove('hidden');
  statusBox.textContent = '';
  processBtn.disabled = false;
}

window.addEventListener('beforeunload', () => {
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  if (outputUrl) URL.revokeObjectURL(outputUrl);
});
