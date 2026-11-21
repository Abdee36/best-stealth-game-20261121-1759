// Every tuning number and colour for Lantern Archive in one place.
// The archive floor is a fixed 1280x720 logical area; the renderer scales
// it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 185,
  sneakSpeed: 105,
  /** Seconds a caught player is frozen before the respawn. */
  caughtFreeze: 1.1,
};

export const LIVES = 3;

/** How many lantern keys open the exit door. */
export const KEYS_NEEDED = 3;

export const GUARD = {
  radius: 14,
  patrolSpeed: 68,
  chaseSpeed: 168,
  investigateSpeed: 110,
  /** Vision cone: half-angle in radians, range in pixels. */
  coneHalfAngle: 0.52,
  coneRange: 235,
  /** Detection fills this fast (per second) when the player is seen. */
  spotRate: 1.35,
  /** Detection fills slower while the player stands in a shadow pool. */
  shadowSpotRate: 0.45,
  /** Detection drains this fast (per second) while unseen. */
  calmRate: 0.55,
  /** Seconds a guard chases after losing sight before giving up. */
  chaseMemory: 4.5,
  /** Seconds a guard waits at a noise point before resuming patrol. */
  investigateWait: 2.2,
  /** A running player's footsteps are heard inside this radius. */
  hearRadius: 185,
};

export const NOISE = {
  /** Seconds between footstep pings while walking; sneaking is silent. */
  stepInterval: 0.42,
  /** How long a footstep ring stays visible, in seconds. */
  ringLife: 0.7,
};

export const PALETTE = {
  backdrop: '#0b0e14',
  floor: '#232833',
  floorTile: '#272d3a',
  floorLine: '#1c212c',
  wall: '#4a4238',
  wallTop: '#6b5f4d',
  shelf: '#3d3428',
  shelfTop: '#5a4a33',
  crate: '#54432c',
  crateTop: '#6e5a38',
  shadow: '#141a26',
  shadowEdge: '#232c42',
  exit: '#39d98a',
  exitLocked: '#8a6d3b',
  key: '#ffd166',
  player: '#7dd3fc',
  playerSneak: '#38bdf8',
  guard: '#f87171',
  guardAlert: '#ef4444',
  cone: '#fbbf24',
  coneAlert: '#f87171',
  panel: '#171c26',
  text: '#eef1f5',
  muted: '#9aa3b2',
  danger: '#f87171',
  gold: '#ffd166',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best escape time is kept between visits (this browser only). */
export const BEST_KEY = 'lantern-archive.best-seconds';
