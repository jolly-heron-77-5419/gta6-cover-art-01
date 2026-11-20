// Draws a GTA VI-style multi-panel cover onto a canvas: panel photos with a
// colour grade, a bold outlined title, a tagline and an original M rating box.
// Everything is drawn with the canvas 2D API — no images, logos or fonts
// taken from any game. `state` is the editor state (see main.js).

export const GRADES = {
  sunset: {
    sky: ['#2b0f45', '#7a1e6e', '#e8436b', '#ff7a18'],
    tint: 'rgba(255, 90, 60, 0.20)',
    accent: '#ff7a18',
    name: 'Sunset',
  },
  neon: {
    sky: ['#0a0618', '#1c0b3d', '#4d0a5e', '#ff2e88'],
    tint: 'rgba(255, 46, 136, 0.22)',
    accent: '#19e3c2',
    name: 'Neon Night',
  },
  teal: {
    sky: ['#04141c', '#0a2e3d', '#0f5a5e', '#19a7a0'],
    tint: 'rgba(20, 160, 190, 0.20)',
    accent: '#ffc53d',
    name: 'Teal Noir',
  },
  gold: {
    sky: ['#2a1503', '#6b2d05', '#c96a12', '#ffc53d'],
    tint: 'rgba(255, 170, 40, 0.20)',
    accent: '#ff2e88',
    name: 'Golden Hour',
  },
};

/** Panel rectangles for a layout, as fractions of the canvas, minus gutters. */
export function panelRects(layout, w, h) {
  const g = w * 0.012; // gutter between panels
  const m = w * 0.02; // outer margin
  const x0 = m, y0 = m, x1 = w - m, y1 = h - m;
  const fullW = x1 - x0, fullH = y1 - y0;
  const halfW = (fullW - g) / 2, halfH = (fullH - g) / 2;
  const thirdW = (fullW - 2 * g) / 3;
  switch (layout) {
    case 'hero': // one big panel left, two stacked right
      return [
        { x: x0, y: y0, w: fullW * 0.6, h: fullH },
        { x: x0 + fullW * 0.6 + g, y: y0, w: fullW * 0.4 - g, h: halfH },
        { x: x0 + fullW * 0.6 + g, y: y0 + halfH + g, w: fullW * 0.4 - g, h: halfH },
      ];
    case 'strips': // three vertical strips
      return [0, 1, 2].map((i) => ({
        x: x0 + i * (thirdW + g), y: y0, w: thirdW, h: fullH,
      }));
    case 'banner': // one wide panel on top, two below
      return [
        { x: x0, y: y0, w: fullW, h: fullH * 0.55 },
        { x: x0, y: y0 + fullH * 0.55 + g, w: halfW, h: fullH * 0.45 - g },
        { x: x0 + halfW + g, y: y0 + fullH * 0.55 + g, w: halfW, h: fullH * 0.45 - g },
      ];
    case 'grid': // four-up
    default:
      return [
        { x: x0, y: y0, w: halfW, h: halfH },
        { x: x0 + halfW + g, y: y0, w: halfW, h: halfH },
        { x: x0, y: y0 + halfH + g, w: halfW, h: halfH },
        { x: x0 + halfW + g, y: y0 + halfH + g, w: halfW, h: halfH },
      ];
  }
}

/** How many panels a layout uses. */
export function panelCount(layout) {
  return layout === 'grid' ? 4 : 3;
}

/** Draws `img` into `rect` with cover-fit, zoom and pan, clamped to cover. */
function drawPhoto(ctx, img, rect, crop) {
  const zoom = crop?.zoom ?? 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  let dx = rect.x + (rect.w - pw) / 2 + (crop?.panX ?? 0) * rect.w;
  let dy = rect.y + (rect.h - ph) / 2 + (crop?.panY ?? 0) * rect.h;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - pw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - ph, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** Placeholder for an empty panel: gradient rays and the panel number. */
function drawPlaceholder(ctx, rect, index, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, grade.sky[1]);
  g.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.lineTo(rect.x + rect.w, rect.y);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h * 0.35);
  ctx.closePath();
  ctx.fill();
  const size = Math.min(rect.w, rect.h) * 0.16;
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.font = `600 ${size * 0.45}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('add a photo', rect.x + rect.w / 2, rect.y + rect.h / 2 + size * 0.75);
  ctx.textBaseline = 'alphabetic';
}

/** Fits `text` to `maxWidth` by shrinking the font, returns the size used.
 * `tracking` is letter-spacing as a fraction of the font size; it is set on
 * the context while measuring, so the measured width is the drawn width. */
function fitFont(ctx, text, maxWidth, startSize, weight = 800, tracking = 0) {
  let size = startSize;
  const set = () => {
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * tracking)}px`;
  };
  set();
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= Math.max(2, size * 0.04);
    set();
  }
  return size;
}

/** The bold title: accent offset shadow, thick dark outline, white fill.
 * `tracking` is the letter-spacing fraction fitFont measured with. */
function drawTitle(ctx, text, cx, baselineY, maxWidth, grade, scale) {
  const size = fitFont(ctx, text, maxWidth, 150 * scale, 800, 0.02);
  ctx.save();
  ctx.translate(cx, baselineY);
  ctx.transform(1, 0, -0.06, 1, 0, 0); // slight forward lean
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = grade.accent;
  ctx.fillText(text, size * 0.045, size * 0.045);
  ctx.lineWidth = size * 0.09;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a24';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return size;
}

/** Original rating box, drawn from shapes: M over MATURE 17+. */
function drawRatingBox(ctx, w, h, scale) {
  const bw = 118 * scale, bh = 150 * scale;
  const x = w - w * 0.02 - bw, y = h - h * 0.02 - bh;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, 6 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.font = `900 ${86 * scale}px system-ui, sans-serif`;
  ctx.fillText('M', x + bw / 2, y + bh * 0.56);
  ctx.fillRect(x + 8 * scale, y + bh * 0.66, bw - 16 * scale, 2.5 * scale);
  ctx.font = `800 ${17 * scale}px system-ui, sans-serif`;
  ctx.fillText('MATURE 17+', x + bw / 2, y + bh * 0.82);
  ctx.font = `700 ${11.5 * scale}px system-ui, sans-serif`;
  ctx.fillText('FAN-MADE COVER', x + bw / 2, y + bh * 0.94);
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` (at its own width/height).
 * state: { layout, grade, title, tagline, badge, photos, crops, onePhoto }
 * photos: array of images (or null); crops: [{zoom, panX, panY}] per panel.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const scale = w / 1080;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = panelRects(state.layout, w, h);
  const count = panelCount(state.layout);

  // Sky: vertical sunset gradient with a soft sun glow top-right.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.78, h * 0.16, 0, w * 0.78, h * 0.16, w * 0.55);
  glow.addColorStop(0, 'rgba(255, 220, 130, 0.55)');
  glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Panels.
  for (let i = 0; i < count; i++) {
    const rect = rects[i];
    const photo = state.onePhoto ? state.photos[0] : state.photos[i];
    if (photo) drawPhoto(ctx, photo, rect, state.crops[i]);
    else drawPlaceholder(ctx, rect, i, grade);
    // Grade tint + bottom shade inside the panel.
    ctx.fillStyle = grade.tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(20, 5, 35, 0)');
    shade.addColorStop(1, 'rgba(20, 5, 35, 0.35)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    // White frame with a dark keyline, poster style.
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.strokeStyle = 'rgba(20, 5, 35, 0.6)';
    ctx.strokeRect(rect.x + 3 * scale, rect.y + 3 * scale, rect.w - 6 * scale, rect.h - 6 * scale);
  }

  // Scrim so the title reads over the art.
  const scrim = ctx.createLinearGradient(0, h * 0.68, 0, h);
  scrim.addColorStop(0, 'rgba(12, 4, 22, 0)');
  scrim.addColorStop(1, 'rgba(12, 4, 22, 0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  // Title + tagline, anchored to the bottom so the tagline never runs off
  // the canvas, and kept in the width left of the rating box so the title
  // never slides behind it.
  const title = (state.title || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim();
  const margin = w * 0.02;
  const badgeReserve = state.badge ? 118 * scale + margin * 1.5 : 0;
  const titleMaxW = (state.badge ? w - 2 * margin - badgeReserve : w * 0.92) * 0.96;
  const titleCx = state.badge ? margin + (w - 2 * margin - badgeReserve) / 2 : w / 2;
  const tagSize = tagline
    ? fitFont(ctx, tagline.toUpperCase(), w * 0.8, 30 * scale, 700, 0.14)
    : 0;
  const taglineBaseline = h - h * 0.025;
  let titleSize = 0;
  if (title) {
    // Measure first so the baseline can sit above the tagline.
    titleSize = fitFont(ctx, title, titleMaxW, 150 * scale, 800, 0.02);
  }
  const titleBaseline = tagline
    ? taglineBaseline - tagSize - titleSize * 0.1
    : h - h * 0.03;
  if (title) drawTitle(ctx, title, titleCx, titleBaseline, titleMaxW, grade, scale);
  if (tagline) {
    ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(tagSize * 0.14)}px`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6 * scale;
    ctx.fillText(tagline.toUpperCase(), w / 2, taglineBaseline);
    ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // Rating box, bottom-right, clear of the tagline.
  if (state.badge) drawRatingBox(ctx, w, h, scale);

  // Vignette.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,20,0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}
