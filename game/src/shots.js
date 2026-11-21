// The screenshot scenes behind ?shot=cover|patrol|alarm|win. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (sneak toward the nearest key, wait out of
// sight when a guard looks our way, then slip to the exit), so the frame
// is what a short game really looks like and the same seed always gives
// the same frame.
import { STEP } from './config.js';
import { EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = STEP;

/**
 * Steer toward a target point like a careful player: sneak when a guard is
 * close, freeze when a guard's cone is sweeping toward the courier, and
 * run away from a chasing guard at full speed.
 */
function steerTo(state, tx, ty) {
  const player = state.player;
  // Flee a chasing guard at full speed, blending away from the guard
  // with toward the target: straight away once cornered the courier
  // against a wall, and straight at the target runs head-on into a
  // guard standing between the courier and the goal. When the two
  // cancel out, sidestep around the guard toward the target.
  const chaser = state.guards.find((guard) => guard.mode === 'chase');
  if (chaser) {
    const gx = player.x - chaser.x;
    const gy = player.y - chaser.y;
    const gd = Math.hypot(gx, gy) || 1;
    const txd = tx - player.x;
    const tyd = ty - player.y;
    const td = Math.hypot(txd, tyd) || 1;
    let bx = gx / gd + (txd / td) * 0.9;
    let by = gy / gd + (tyd / td) * 0.9;
    if (Math.hypot(bx, by) < 0.3) {
      bx = -gy / gd;
      by = gx / gd;
      if (bx * (txd / td) + by * (tyd / td) < 0) {
        bx = -bx;
        by = -by;
      }
    }
    const bl = Math.hypot(bx, by) || 1;
    return { x: bx / bl, y: by / bl, sneak: false };
  }
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 14) return { x: 0, y: 0, sneak: true };
  let near = false;
  for (const guard of state.guards) {
    if (Math.hypot(guard.x - player.x, guard.y - player.y) < 260) near = true;
  }
  return { x: dx / dist, y: dy / dist, sneak: near };
}

function runSteps(world, seconds, steer, done) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const move = steer(world.state);
    const events = world.step(SAMPLE, { x: move.x, y: move.y }, move.sneak, false);
    if (events & EVENT_WIN) break;
    if (world.state.over) break;
    if (done && done(world.state)) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * cover: the title over a live floor, guards mid-patrol.
 * patrol: mid-play, courier sneaking past a cone toward a key.
 * alarm: the courier spotted, a guard chasing, meter high.
 * win: all keys taken, courier at the open exit.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'cover') {
    // The cover shows the game itself, not the title panel: the courier
    // sneaking through the open floor, guards and cones in full view.
    runSteps(world, 6, (state) => steerTo(state, 300, 560));
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'alarm') {
    // Stage the near miss directly: the middle-hall guard stands facing
    // down its corridor, the courier is caught in its cone, the meter is
    // high and the chase has begun; the rules then play it forward.
    const guard = world.state.guards[2];
    guard.x = 640;
    guard.y = 280;
    guard.facing = Math.PI / 2;
    guard.mode = 'chase';
    guard.detection = 0.85;
    guard.chaseTimer = 4.5;
    guard.lastSeenX = 640;
    guard.lastSeenY = 430;
    world.state.player.x = 640;
    world.state.player.y = 430;
    runSteps(world, 1.1, (state) => steerTo(state, 500, 560));
    return { screen: stateOver(world) ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    // The final leg, played forward from a real mid-game state: the first
    // two keys are already in hand, the courier stands by the last key in
    // the bottom-right, and the guards are at their patrol starts. The
    // autopilot sneaks to the last key, then runs the right lane to the
    // open exit while the east guard gives chase from behind.
    world.state.keys[0].taken = true;
    world.state.keys[1].taken = true;
    world.state.keysTaken = 2;
    // The clock reads the run so far: this scene stages the final leg
    // of a longer escape, not a three-second game.
    world.state.elapsed = 96;
    world.state.player.x = 1080;
    world.state.player.y = 560;
    runSteps(world, 30, (state) => steerTo(state, 1120, 590), (state) => state.keys[2].taken);
    runSteps(world, 30, (state) => steerTo(state, 1115, 60), (state) => state.won);
    return { screen: world.state.won ? SCREEN_WIN : world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.elapsed };
  }
  // patrol (default): a few seconds in, courier in shadow near a cone.
  runSteps(world, 11, (state) => steerTo(state, 260, 350));
  return { screen: SCREEN_PLAY, best: 0 };
}

function stateOver(world) {
  return world.state.over;
}
