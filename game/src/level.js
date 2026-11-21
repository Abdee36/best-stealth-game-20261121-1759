// The archive floor: one hand-drawn level. Walls, shelves and crates block
// movement and block a guard's line of sight; shadow pools slow detection;
// three lantern keys open the exit door at the top-right wall.
// Nothing here moves: guards, the player and the pickups live in world.js.
import { FIELD } from './config.js';

const WALL = 24;

/** Rectangles that block movement and sight: {x, y, w, h, kind}. */
export const OBSTACLES = [
  // Outer walls.
  { x: 0, y: 0, w: FIELD.width, h: WALL, kind: 'wall' },
  { x: 0, y: FIELD.height - WALL, w: FIELD.width, h: WALL, kind: 'wall' },
  { x: 0, y: 0, w: WALL, h: FIELD.height, kind: 'wall' },
  { x: FIELD.width - WALL, y: 0, w: WALL, h: FIELD.height, kind: 'wall' },
  // Reading-room shelves: long cover you can slip behind.
  { x: 300, y: 120, w: 180, h: 36, kind: 'shelf' },
  { x: 300, y: 420, w: 180, h: 36, kind: 'shelf' },
  { x: 700, y: 120, w: 180, h: 36, kind: 'shelf' },
  { x: 760, y: 420, w: 180, h: 36, kind: 'shelf' },
  { x: 500, y: 260, w: 36, h: 180, kind: 'shelf' },
  { x: 1020, y: 260, w: 36, h: 180, kind: 'shelf' },
  // Freestanding crates: low cover in the open floor.
  { x: 880, y: 300, w: 54, h: 54, kind: 'crate' },
  { x: 950, y: 300, w: 54, h: 54, kind: 'crate' },
  { x: 180, y: 520, w: 54, h: 54, kind: 'crate' },
  { x: 620, y: 560, w: 54, h: 54, kind: 'crate' },
  // A stub wall that splits the middle hall and makes a blind corner.
  { x: 620, y: 24, w: 36, h: 110, kind: 'wall' },
];

/** Shadow pools: standing inside one, a guard spots you far slower. */
export const SHADOWS = [
  { x: 150, y: 300, w: 170, h: 110 },
  { x: 900, y: 480, w: 190, h: 110 },
  { x: 560, y: 520, w: 150, h: 90 },
  { x: 1060, y: 60, w: 120, h: 80 },
];

/** The three lantern keys, in the order the HUD counts them. */
export const KEY_SPOTS = [
  { x: 170, y: 130 },
  { x: 1120, y: 130 },
  { x: 1120, y: 590 },
];

/** The exit door, set into the top wall; it opens once all keys are held. */
export const EXIT = { x: 1060, y: 0, w: 110, h: 30 };

/** Where the courier starts: bottom-left, off the bottom patrol's lane. */
export const PLAYER_START = { x: 95, y: 560 };

/** Patrol routes: each guard walks its points in order, then loops. */
export const PATROLS = [
  [
    { x: 240, y: 240 },
    { x: 560, y: 240 },
    { x: 560, y: 480 },
    { x: 240, y: 480 },
  ],
  [
    { x: 760, y: 180 },
    { x: 1080, y: 180 },
    { x: 1080, y: 520 },
    { x: 760, y: 520 },
  ],
  [
    { x: 640, y: 110 },
    { x: 640, y: 600 },
  ],
  [
    { x: 300, y: 650 },
    { x: 1000, y: 650 },
  ],
];

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function circleHitsRect(cx, cy, radius, r) {
  const nearX = Math.max(r.x, Math.min(cx, r.x + r.w));
  const nearY = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < radius * radius;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick reject, then sample the segment: cheap and exact enough for sight.
  if (Math.max(x1, x2) < r.x || Math.min(x1, x2) > r.x + r.w) return false;
  if (Math.max(y1, y2) < r.y || Math.min(y1, y2) > r.y + r.h) return false;
  const steps = 24;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (pointInRect(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r)) return true;
  }
  return false;
}

/** True when any obstacle stands between the two points. */
export function sightBlocked(x1, y1, x2, y2) {
  for (const obstacle of OBSTACLES) {
    if (segmentHitsRect(x1, y1, x2, y2, obstacle)) return true;
  }
  return false;
}

/** True when the point is inside any shadow pool. */
export function inShadow(x, y) {
  for (const pool of SHADOWS) if (pointInRect(x, y, pool)) return true;
  return false;
}
