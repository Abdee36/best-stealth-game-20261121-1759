// Guards: patrol routes, vision cones, detection, chase and investigation.
// A guard never sees through an obstacle and never sees further than its
// cone; detection fills while the player is seen and drains while hidden,
// so a near miss is a scare, not a sentence.
import { GUARD } from './config.js';
import { PATROLS, inShadow, sightBlocked } from './level.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_CHASE = 'chase';
export const GUARD_INVESTIGATE = 'investigate';

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, target, rate, dt) {
  const diff = angleDiff(target, guard.facing);
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.facing += step;
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = angleTo(guard.x, guard.y, tx, ty);
  return dist - step < 2;
}

/** Can this guard see the player right now? */
export function guardSees(guard, px, py, sneaking) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = sneaking ? GUARD.coneRange * 0.8 : GUARD.coneRange;
  if (dist > range) return false;
  if (dist > 26 && Math.abs(angleDiff(angleTo(guard.x, guard.y, px, py), guard.facing)) > GUARD.coneHalfAngle) return false;
  return !sightBlocked(guard.x, guard.y, px, py);
}

export function createGuards() {
  return PATROLS.map((route, index) => ({
    id: index,
    x: route[0].x,
    y: route[0].y,
    facing: angleTo(route[0].x, route[0].y, route[1].x, route[1].y),
    route,
    waypoint: 1,
    mode: GUARD_PATROL,
    /** Shared detection meter, 0..1: any guard seeing the player fills it. */
    detection: 0,
    chaseTimer: 0,
    investigateX: 0,
    investigateY: 0,
    waitTimer: 0,
    lastSeenX: 0,
    lastSeenY: 0,
  }));
}

/**
 * Advance every guard one fixed step. `player` carries x, y and sneaking;
 * `noise` is the latest footstep {x, y, heard} or null. Returns 'spotted'
 * while any guard has the player in sight, else 'hidden'.
 */
export function stepGuards(guards, dt, player, noise) {
  let anySeen = false;
  for (const guard of guards) {
    const seen = guardSees(guard, player.x, player.y, player.sneaking);
    if (seen) {
      anySeen = true;
      guard.lastSeenX = player.x;
      guard.lastSeenY = player.y;
      guard.chaseTimer = GUARD.chaseMemory;
      if (guard.mode !== GUARD_CHASE) guard.mode = GUARD_CHASE;
    }
    // Detection fills on sight (slower in shadow), drains while hidden.
    const rate = seen
      ? (inShadow(player.x, player.y) ? GUARD.shadowSpotRate : GUARD.spotRate)
      : -GUARD.calmRate;
    guard.detection = Math.max(0, Math.min(1, guard.detection + rate * dt));

    if (guard.mode === GUARD_CHASE) {
      guard.chaseTimer -= dt;
      const arrived = moveToward(guard, guard.lastSeenX, guard.lastSeenY, GUARD.chaseSpeed, dt);
      if (arrived || guard.chaseTimer <= 0) {
        guard.mode = GUARD_PATROL;
        guard.chaseTimer = 0;
      }
      continue;
    }
    if (guard.mode === GUARD_INVESTIGATE) {
      const arrived = moveToward(guard, guard.investigateX, guard.investigateY, GUARD.investigateSpeed, dt);
      if (arrived) {
        guard.waitTimer -= dt;
        // Look around while waiting at the noise.
        guard.facing += dt * 1.6;
        if (guard.waitTimer <= 0) guard.mode = GUARD_PATROL;
      }
      continue;
    }
    // Patrol: a footstep heard nearby pulls the guard off its route.
    if (noise && noise.heard) {
      const dist = Math.hypot(noise.x - guard.x, noise.y - guard.y);
      if (dist < GUARD.hearRadius) {
        guard.mode = GUARD_INVESTIGATE;
        guard.investigateX = noise.x;
        guard.investigateY = noise.y;
        guard.waitTimer = GUARD.investigateWait;
        continue;
      }
    }
    const target = guard.route[guard.waypoint];
    const arrived = moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt);
    if (arrived) guard.waypoint = (guard.waypoint + 1) % guard.route.length;
    else turnToward(guard, angleTo(guard.x, guard.y, target.x, target.y), 2.4, dt);
  }
  return anySeen ? 'spotted' : 'hidden';
}

/** The highest detection among the guards: the HUD's alarm meter. */
export function alarmLevel(guards) {
  let top = 0;
  for (const guard of guards) top = Math.max(top, guard.detection);
  return top;
}

/** True when any guard is actively chasing the player. */
export function anyChasing(guards) {
  return guards.some((g) => g.mode === GUARD_CHASE);
}
