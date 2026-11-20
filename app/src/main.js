// Wires the editor: layout / grade / size radios, four photo slots with
// per-panel zoom and pan, sample photos, live preview and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (shots.js).

import { drawCover, panelCount } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const taglineInput = document.getElementById('tagline');
const badgeInput = document.getElementById('badge');
const onePhotoInput = document.getElementById('onePhoto');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panX');
const panYInput = document.getElementById('panY');
const slotsEl = document.getElementById('slots');
const tabsEl = document.getElementById('panelTabs');

const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

const state = {
  layout: 'grid',
  grade: 'sunset',
  size: '1080x1080',
  title: titleInput.value,
  tagline: taglineInput.value,
  badge: true,
  onePhoto: false,
  photos: [null, null, null, null],
  crops: [
    { zoom: 1, panX: 0, panY: 0 },
    { zoom: 1, panX: 0, panY: 0 },
    { zoom: 1, panX: 0, panY: 0 },
    { zoom: 1, panX: 0, panY: 0 },
  ],
};
let selectedPanel = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
}

/** Rebuilds the four photo slot cards and the panel tabs for the layout. */
function buildSlots() {
  const count = panelCount(state.layout);
  slotsEl.innerHTML = '';
  tabsEl.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const card = document.createElement('div');
    card.className = 'slot' + (state.photos[i] ? ' filled' : '');
    card.innerHTML = `<strong>Panel ${i + 1}${i >= count ? ' (unused)' : ''}</strong>`;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.disabled = i >= count;
    input.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        state.photos[i] = await loadImage(URL.createObjectURL(file));
        nameEl.textContent = file.name;
        card.classList.add('filled');
        redraw();
      } catch {
        status.textContent = `Could not read ${file.name}. Try another image.`;
      }
    });
    const nameEl = document.createElement('div');
    nameEl.className = 'file-name';
    nameEl.textContent = state.photos[i] ? 'photo loaded' : 'no photo yet';
    card.append(input, nameEl);
    slotsEl.append(card);

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.textContent = `Panel ${i + 1}`;
    tab.disabled = i >= count;
    tab.setAttribute('aria-selected', String(i === selectedPanel));
    tab.addEventListener('click', () => selectPanel(i));
    tabsEl.append(tab);
  }
}

function selectPanel(i) {
  selectedPanel = i;
  const crop = state.crops[i];
  zoomInput.value = crop.zoom;
  panXInput.value = crop.panX;
  panYInput.value = crop.panY;
  tabsEl.querySelectorAll('button').forEach((b, j) =>
    b.setAttribute('aria-selected', String(j === i)));
}

function syncCropInputs() {
  const crop = state.crops[selectedPanel];
  crop.zoom = Number(zoomInput.value);
  crop.panX = Number(panXInput.value);
  crop.panY = Number(panYInput.value);
  redraw();
}

zoomInput.addEventListener('input', syncCropInputs);
panXInput.addEventListener('input', syncCropInputs);
panYInput.addEventListener('input', syncCropInputs);

document.querySelectorAll('#layouts input').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.layout = radio.value;
    if (selectedPanel >= panelCount(state.layout)) selectPanel(0);
    buildSlots();
    redraw();
  });
});
document.querySelectorAll('#grades input').forEach((radio) => {
  radio.addEventListener('change', () => { state.grade = radio.value; redraw(); });
});
document.querySelectorAll('#sizes input').forEach((radio) => {
  radio.addEventListener('change', () => { state.size = radio.value; redraw(); });
});
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });
badgeInput.addEventListener('change', () => { state.badge = badgeInput.checked; redraw(); });
onePhotoInput.addEventListener('change', () => { state.onePhoto = onePhotoInput.checked; redraw(); });

document.querySelectorAll('.samples button').forEach((button) => {
  button.addEventListener('click', async () => {
    const which = button.dataset.sample;
    try {
      if (which === 'both') {
        state.photos[0] = await loadImage('samples/pier.jpg');
        state.photos[1] = await loadImage('samples/boulevard.jpg');
        state.photos[2] = await loadImage('samples/pier.jpg');
        state.photos[3] = await loadImage('samples/boulevard.jpg');
      } else {
        const img = await loadImage(`samples/${which}.jpg`);
        state.photos = state.photos.map(() => img);
      }
      buildSlots();
      redraw();
      status.textContent = 'Sample photo(s) loaded — replace any panel with your own.';
    } catch {
      status.textContent = 'Could not load the sample photo.';
    }
  });
});

/** Renders the cover at the chosen export size and downloads it as a PNG. */
export function exportCover() {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved vice-cover-${w}x${h}.png`;
      resolve(blob);
    }, 'image/png');
  });
}
document.getElementById('export').addEventListener('click', exportCover);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, loadImage, redraw, buildSlots, selectPanel, SIZES });
} else {
  buildSlots();
  selectPanel(0);
  redraw();
}
