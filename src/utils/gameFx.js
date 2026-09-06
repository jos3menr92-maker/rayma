/**
 * gameFx.js — Shared 2.5D painting helpers for the Rayma AI Arcade.
 * ONE SOURCE for the arcade's modern depth look: gradient backdrops,
 * parallax starfields, vignettes, and glowing beveled sprites.
 * Render-layer only — game logic never lives here.
 *
 * Consumers: RetroSnake, SpaceInvaders, SkyStriker, CrystalCrusher, MeteorStorm.
 */

/** Gradient backdrop + vignette. `accent` adds a soft horizon glow (rgba string). */
export function drawSpaceBackdrop(ctx, W, H, opts = {}) {
  const { top = '#0b1026', mid, bottom = '#020617', accent } = opts;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  if (mid) g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (accent) {
    const rg = ctx.createRadialGradient(W / 2, H * 0.9, 10, W / 2, H * 0.9, H);
    rg.addColorStop(0, accent);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
  drawVignette(ctx, W, H);
}

/** Soft dark edges — instantly adds depth to a flat scene. */
export function drawVignette(ctx, W, H, strength = 0.45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Build a 3-layer parallax starfield (slow far → fast near). */
export function makeStarfield(W, H, layers = 3, perLayer = 40) {
  const speeds = [0.15, 0.4, 0.9];
  const sizes = [1, 1.6, 2.4];
  const out = [];
  for (let l = 0; l < layers; l++) {
    for (let i = 0; i < perLayer; i++) {
      out.push({
        x: Math.random() * W,
        y: Math.random() * H,
        layer: l,
        speed: speeds[l % 3],
        size: sizes[l % 3],
      });
    }
  }
  return out;
}

/** Drift + draw a starfield. `colors` maps layer index → tint. */
export function drawStarfield(ctx, stars, W, H, colors = ['#475569', '#94a3b8', '#e0f2fe']) {
  stars.forEach((s) => {
    s.y += s.speed;
    if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
    ctx.globalAlpha = 0.35 + s.layer * 0.3;
    ctx.fillStyle = colors[s.layer % colors.length];
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/**
 * Glowing beveled rectangle (alien, ship, brick, snake segment).
 * Top-lit highlight + dark bottom + soft glow + optional ground shadow.
 */
export function glowSlab(ctx, x, y, w, h, color, glow = 12, opts = {}) {
  const { shadow = true } = opts;
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + h * 0.4, w * 0.45, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = glow;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.3)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Glowing orb with a hot core (food, power-up, target). */
export function glowCircle(ctx, x, y, r, color, glow = 14) {
  ctx.shadowBlur = glow;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}