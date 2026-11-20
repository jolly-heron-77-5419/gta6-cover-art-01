// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows one exported cover alone, drawn by the app
// at the export size. Query params: layout, grade, size (1080x1080, 1080x1350
// or 1920x1080), photo (pier, boulevard or both), title, tagline, badge.
// window.__shotReady (and a data attribute, for --dump-dom checks) is set
// once the scene has painted.

export async function runShot(shot, query, api) {
  const { state, loadImage, redraw, buildSlots, selectPanel } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  state.layout = query.get('layout') ?? 'grid';
  state.grade = query.get('grade') ?? 'sunset';
  state.size = query.get('size') ?? '1080x1080';
  state.title = query.get('title') ?? 'SUNSET HEIST';
  state.tagline = query.get('tagline') ?? 'One last job. One long sunset.';
  state.badge = query.get('badge') !== 'off';
  state.onePhoto = false;

  const which = query.get('photo') ?? 'both';
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  if (which === 'pier') state.photos = [pier, pier, pier, pier];
  else if (which === 'boulevard') state.photos = [boulevard, boulevard, boulevard, boulevard];
  else state.photos = [pier, boulevard, pier, boulevard];

  // A little framing so the panels read as composed, not raw samples.
  state.crops[0] = { zoom: 1.15, panX: 0.05, panY: -0.04 };
  state.crops[1] = { zoom: 1.25, panX: -0.06, panY: 0.03 };
  state.crops[2] = { zoom: 1.1, panX: 0, panY: 0.05 };
  state.crops[3] = { zoom: 1.3, panX: 0.04, panY: -0.02 };

  const titleEl = document.getElementById('title');
  const taglineEl = document.getElementById('tagline');
  if (titleEl) titleEl.value = state.title;
  if (taglineEl) taglineEl.value = state.tagline;
  document.querySelectorAll('#layouts input').forEach((r) => { r.checked = r.value === state.layout; });
  document.querySelectorAll('#grades input').forEach((r) => { r.checked = r.value === state.grade; });
  document.querySelectorAll('#sizes input').forEach((r) => { r.checked = r.value === state.size; });
  const badgeEl = document.getElementById('badge');
  if (badgeEl) badgeEl.checked = state.badge;

  buildSlots();
  selectPanel(0);
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
    document.documentElement.dataset.shotReady = 'true';
  }));
}
