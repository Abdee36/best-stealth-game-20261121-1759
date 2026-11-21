// The game's rules and state, with no drawing and no browser in it: the
// courier, the guards, the lantern keys, the exit, footsteps and lives.
// step() advances one fixed step and returns what happened as bit flags, so
// the caller can react without the world knowing about screens or sound.
import { FIELD, GUARD, KEYS_NEEDED, LIVES, NOISE, PLAYER, STEP } from './config.js';
import { EXIT, KEY_SPOTS, OBSTACLES, PLAYER_START, circleHitsRect, inShadow } from './level.js';
import { alarmLevel, anyChasing, createGuards, stepGuards } from './guards.js';

export const EVENT_KEY = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_WIN = 4;
export const EVENT_ALARM = 8;
export const EVENT_STEP = 16;

function clampPlayer(player) {
  player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, player.x));
  player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, player.y));
  // Push out of any obstacle the move ran into, axis by axis.
  for (const obstacle of OBSTACLES) {
    if (!circleHitsRect(player.x, player.y, PLAYER.radius, obstacle)) continue;
    const left = player.x - (obstacle.x - PLAYER.radius);
    const right = obstacle.x + obstacle.w + PLAYER.radius - player.x;
    const top = player.y - (obstacle.y - PLAYER.radius);
    const bottom = obstacle.y + obstacle.h + PLAYER.radius - player.y;
    const push = Math.min(left, right, top, bottom);
    if (push === left) player.x = obstacle.x - PLAYER.radius;
    else if (push === right) player.x = obstacle.x + obstacle.w + PLAYER.radius;
    else if (push === top) player.y = obstacle.y - PLAYER.radius;
    else player.y = obstacle.y + obstacle.h + PLAYER.radius;
  }
}

export function createWorld(random) {
  const player = {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    sneaking: false,
    moving: false,
    inShadow: false,
  };
  const guards = createGuards();
  const keys = KEY_SPOTS.map((spot) => ({ x: spot.x, y: spot.y, taken: false }));
  const state = {
    player,
    guards,
    keys,
    keysTaken: 0,
    lives: LIVES,
    elapsed: 0,
    best: 0,
    alarm: 0,
    chasing: false,
    spotted: false,
    exitOpen: false,
    caughtTimer: 0,
    stepTimer: 0,
    /** The latest footstep ring, for the renderer and the guards. */
    noise: null,
    noiseLife: 0,
    won: false,
    over: false,
  };

  function reset() {
    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;
    player.sneaking = false;
    player.moving = false;
    for (const guard of guards) {
      const route = guard.route;
      guard.x = route[0].x;
      guard.y = route[0].y;
      guard.waypoint = 1;
      guard.mode = 'patrol';
      guard.detection = 0;
      guard.chaseTimer = 0;
      guard.waitTimer = 0;
    }
    for (const key of keys) key.taken = false;
    state.keysTaken = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    state.alarm = 0;
    state.chasing = false;
    state.spotted = false;
    state.exitOpen = false;
    state.caughtTimer = 0;
    state.noise = null;
    state.noiseLife = 0;
    state.won = false;
    state.over = false;
  }

  function respawnAfterCaught() {
    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;
    for (const guard of guards) {
      guard.mode = 'patrol';
      guard.detection = 0;
      guard.chaseTimer = 0;
      const route = guard.route;
      guard.x = route[0].x;
      guard.y = route[0].y;
      guard.waypoint = 1;
    }
    state.alarm = 0;
    state.chasing = false;
    state.caughtTimer = 0;
  }

  /**
   * One fixed step. `move` is {x, y} normalised, `sneaking` holds Shift.
   * With `harmless` set (the title screen's backdrop) the guards patrol
   * but nobody is caught and nothing is collected.
   */
  function step(dt, move, sneaking, harmless) {
    let events = 0;
    if (state.won || state.over) return events;
    state.elapsed += dt;

    if (state.caughtTimer > 0) {
      state.caughtTimer -= dt;
      if (state.caughtTimer <= 0) {
        if (state.lives <= 0) state.over = true;
        else respawnAfterCaught();
      }
      return events;
    }

    const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const moving = move.x !== 0 || move.y !== 0;
    player.moving = moving;
    player.sneaking = sneaking && moving;
    if (moving) {
      player.x += move.x * speed * dt;
      player.y += move.y * speed * dt;
      clampPlayer(player);
    }
    player.inShadow = inShadow(player.x, player.y);

    // Footsteps: walking is heard, sneaking is silent.
    state.stepTimer -= dt;
    if (moving && !sneaking && state.stepTimer <= 0) {
      state.stepTimer = NOISE.stepInterval;
      state.noise = { x: player.x, y: player.y, heard: true };
      state.noiseLife = NOISE.ringLife;
      events |= EVENT_STEP;
    }
    if (state.noiseLife > 0) {
      state.noiseLife -= dt;
      if (state.noiseLife <= 0) state.noise = null;
    }

    const sight = stepGuards(guards, dt, player, state.noise);
    state.spotted = sight === 'spotted';
    state.chasing = anyChasing(guards);
    const before = state.alarm;
    state.alarm = alarmLevel(guards);
    if (state.alarm >= 0.6 && before < 0.6) events |= EVENT_ALARM;

    if (harmless) return events;

    // Pick up a lantern key by walking over it.
    for (const key of keys) {
      if (key.taken) continue;
      if (Math.hypot(key.x - player.x, key.y - player.y) < PLAYER.radius + 16) {
        key.taken = true;
        state.keysTaken += 1;
        state.exitOpen = state.keysTaken >= KEYS_NEEDED;
        events |= EVENT_KEY;
      }
    }

    // Caught: a chasing guard touches the courier.
    for (const guard of guards) {
      if (guard.mode !== 'chase') continue;
      if (Math.hypot(guard.x - player.x, guard.y - player.y) < GUARD.radius + PLAYER.radius - 2) {
        state.lives -= 1;
        state.caughtTimer = PLAYER.caughtFreeze;
        events |= EVENT_CAUGHT;
        return events;
      }
    }

    // The exit: walk into the open door at the top wall.
    if (state.exitOpen) {
      const doorX = EXIT.x + EXIT.w / 2;
      const doorY = EXIT.y + EXIT.h / 2;
      if (Math.abs(player.x - doorX) < EXIT.w / 2 + 6 && player.y < 58) {
        state.won = true;
        if (state.best === 0 || state.elapsed < state.best) state.best = state.elapsed;
        events |= EVENT_WIN;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
