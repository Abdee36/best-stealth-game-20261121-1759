// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 archive floor is scaled to fit the window and centred.
// Vision cones are painted under the shelves, so cover reads as cover;
// the HUD carries the detection meter, the keys, the lives and the timer.
import { EXIT, KEY_SPOTS, OBSTACLES, SHADOWS } from './level.js';
import { FIELD, FONT, GUARD, KEYS_NEEDED, LIVES, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 72 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const keysLabel = cachedLabel('Keys ');
  const timeLabel = cachedLabel('Time ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Convert a client (mouse) point to archive-floor coordinates. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const px = (clientX - rect.left) * ratio;
    const py = (clientY - rect.top) * ratio;
    return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.floorTile;
    for (let x = 24; x < FIELD.width - 24; x += 80) {
      for (let y = 24; y < FIELD.height - 24; y += 80) {
        context.fillRect(x, y, 76, 76);
      }
    }
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 1;
    for (let x = 24; x <= FIELD.width - 24; x += 80) {
      context.beginPath();
      context.moveTo(x, 24);
      context.lineTo(x, FIELD.height - 24);
      context.stroke();
    }
    for (let y = 24; y <= FIELD.height - 24; y += 80) {
      context.beginPath();
      context.moveTo(24, y);
      context.lineTo(FIELD.width - 24, y);
      context.stroke();
    }
  }

  function drawShadows() {
    for (const pool of SHADOWS) {
      context.fillStyle = PALETTE.shadow;
      context.fillRect(pool.x, pool.y, pool.w, pool.h);
      context.strokeStyle = PALETTE.shadowEdge;
      context.lineWidth = 2;
      context.strokeRect(pool.x, pool.y, pool.w, pool.h);
      text('SHADOW', pool.x + pool.w / 2, pool.y + pool.h / 2 + 5, 13, PALETTE.muted, 'center');
    }
  }

  function drawExit(exitOpen) {
    context.fillStyle = exitOpen ? PALETTE.exit : PALETTE.exitLocked;
    context.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h + 6);
    context.fillStyle = '#0b0e14';
    text(exitOpen ? 'EXIT OPEN' : 'EXIT · LOCKED', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h + 26, 15, exitOpen ? PALETTE.exit : PALETTE.exitLocked, 'center');
  }

  function drawKeys(state) {
    for (const key of state.keys) {
      if (key.taken) continue;
      const pulse = 0.75 + 0.25 * Math.sin(state.elapsed * 4 + key.x);
      context.fillStyle = PALETTE.key;
      context.globalAlpha = pulse;
      context.beginPath();
      context.arc(key.x, key.y, 11, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.fillStyle = '#3a2c00';
      context.beginPath();
      context.arc(key.x, key.y, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawCones(state) {
    for (const guard of state.guards) {
      const alert = guard.mode === 'chase';
      context.fillStyle = alert ? PALETTE.coneAlert : PALETTE.cone;
      context.globalAlpha = alert ? 0.34 : 0.22;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.arc(guard.x, guard.y, GUARD.coneRange, guard.facing - GUARD.coneHalfAngle, guard.facing + GUARD.coneHalfAngle);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
    }
  }

  function drawObstacles() {
    for (const obstacle of OBSTACLES) {
      const top = obstacle.kind === 'shelf' ? PALETTE.shelfTop : obstacle.kind === 'crate' ? PALETTE.crateTop : PALETTE.wallTop;
      const body = obstacle.kind === 'shelf' ? PALETTE.shelf : obstacle.kind === 'crate' ? PALETTE.crate : PALETTE.wall;
      context.fillStyle = body;
      context.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      context.fillStyle = top;
      if (obstacle.h <= 40) context.fillRect(obstacle.x, obstacle.y, obstacle.w, 7);
      else context.fillRect(obstacle.x, obstacle.y, obstacle.w, 7);
      if (obstacle.kind === 'shelf') {
        context.strokeStyle = 'rgba(0,0,0,0.35)';
        context.lineWidth = 1;
        for (let x = obstacle.x + 18; x < obstacle.x + obstacle.w - 6; x += 22) {
          context.beginPath();
          context.moveTo(x, obstacle.y + 10);
          context.lineTo(x, obstacle.y + obstacle.h - 6);
          context.stroke();
        }
      }
    }
  }

  function drawNoise(state) {
    if (!state.noise) return;
    const age = 1 - state.noiseLife / 0.7;
    context.strokeStyle = `rgba(238,241,245,${0.7 * (1 - age)})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(state.noise.x, state.noise.y, 12 + age * 46, 0, Math.PI * 2);
    context.stroke();
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      const alert = guard.mode === 'chase';
      context.fillStyle = alert ? PALETTE.guardAlert : PALETTE.guard;
      context.beginPath();
      context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      // Facing tick and a white eye-dot so the guard reads at a glance.
      context.strokeStyle = '#0b0e14';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.lineTo(guard.x + Math.cos(guard.facing) * (GUARD.radius + 8), guard.y + Math.sin(guard.facing) * (GUARD.radius + 8));
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(guard.x + Math.cos(guard.facing) * 6, guard.y + Math.sin(guard.facing) * 6, 3.5, 0, Math.PI * 2);
      context.fill();
      if (guard.mode === 'investigate') text('?', guard.x, guard.y - GUARD.radius - 8, 20, PALETTE.gold, 'center');
      if (alert) text('!', guard.x, guard.y - GUARD.radius - 8, 22, PALETTE.danger, 'center');
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    if (state.caughtTimer > 0 && Math.floor(state.caughtTimer * 8) % 2 === 0) return;
    context.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#0b0e14';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius - 4, 0, Math.PI * 2);
    context.stroke();
    if (player.inShadow) {
      context.strokeStyle = 'rgba(125,211,252,0.8)';
      context.beginPath();
      context.arc(player.x, player.y, PLAYER.radius + 5, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(keysLabel(`${state.keysTaken}/${KEYS_NEEDED}`), 30, 18, 26, PALETTE.gold, 'left');
    text('LANTERN KEYS', 30, 48, 13, PALETTE.muted, 'left');
    const seconds = Math.floor(state.elapsed);
    text(timeLabel(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`), FIELD.width / 2, 18, 26, PALETTE.text, 'center');
    text('LIVES', FIELD.width - 30, 48, 13, PALETTE.muted, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.danger : PALETTE.floorLine;
      context.beginPath();
      context.arc(FIELD.width - 42 - life * 30, 30, 9, 0, Math.PI * 2);
      context.fill();
    }
    // Detection meter: a bar that fills as any guard spots the courier.
    const barX = FIELD.width / 2 - 160;
    const barY = 56;
    context.fillStyle = '#10141d';
    context.fillRect(barX, barY, 320, 14);
    context.fillStyle = state.alarm < 0.6 ? PALETTE.gold : PALETTE.danger;
    context.fillRect(barX, barY, 320 * state.alarm, 14);
    context.strokeStyle = PALETTE.muted;
    context.lineWidth = 1;
    context.strokeRect(barX, barY, 320, 14);
    text(state.chasing ? 'SPOTTED — RUN!' : state.alarm > 0.25 ? 'SEEN — HIDE!' : state.spotted ? 'SEEN' : 'UNSEEN', FIELD.width / 2, 76, 15, state.chasing ? PALETTE.danger : PALETTE.muted, 'center');
    if (!state.exitOpen) text('Find all 3 lantern keys to open the exit', FIELD.width / 2, FIELD.height - 28, 15, PALETTE.muted, 'center');
    else text('EXIT IS OPEN — reach the green door, unseen', FIELD.width / 2, FIELD.height - 28, 15, PALETTE.exit, 'center');
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(11,14,20,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 44, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Slip past the patrolling guards and their vision cones.',
    'Hide behind shelves and crates. Shadows slow detection.',
    'Walking is heard — hold Shift to sneak silently.',
    'Collect 3 lantern keys, then reach the green exit unseen.',
    'Move: WASD / arrows, or hold the mouse. Pause: P. Mute: M.',
  ];
  const PAUSED_LINES = ['The guards will wait for you.'];
  const WIN_LINES = ['', ''];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the floor, then cones, cover, actors, HUD or a panel. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawShadows();
    drawExit(state.exitOpen);
    drawKeys(state);
    drawCones(state);
    drawObstacles();
    drawNoise(state);
    drawGuards(state);
    drawPlayer(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('Lantern Archive', TITLE_LINES, 'Press Space or click to begin the night shift');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_WIN) {
      const seconds = Math.floor(state.elapsed);
      WIN_LINES[0] = `Escaped in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} — all three keys in hand.`;
      WIN_LINES[1] = best > 0 ? `Best escape: ${Math.floor(best / 60)}:${String(Math.floor(best) % 60).padStart(2, '0')}` : '';
      drawPanel('You slipped away', WIN_LINES, 'Press Space or click to play again');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = 'The archive keepers caught you three times.';
      OVER_LINES[1] = `Keys found: ${state.keysTaken} of ${KEYS_NEEDED}.`;
      drawPanel('Caught', OVER_LINES, 'Press Space or click to try again');
    } else if (state.caughtTimer > 0) {
      text('CAUGHT!', FIELD.width / 2, 120, 40, PALETTE.danger, 'center');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
