# Lantern Archive — a stealth game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Abdee36/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Abdee36/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

An original top-down stealth game for make.fun's **best-stealth-game-20261121-1759** bounty. You are the night courier of the Lantern Archive: slip past four patrolling guards and their vision cones, hide behind shelves and crates, wait out the light in shadow pools, collect all three lantern keys, and reach the green exit door unseen.

## How to play

- **Goal:** collect 3 lantern keys, then reach the exit door at the top-right wall. The door stays locked until the third key is in hand.
- **Guards patrol** fixed routes with yellow vision cones. A cone that touches you fills the detection meter; in shadow it fills three times slower, and sneaking shrinks the cone. When the meter crosses the line the guard gives chase — and a chasing guard that touches you costs a life. Three lives, then the night is over.
- **Walking is heard.** Every footstep rings out and a nearby guard will come to investigate the noise. Hold Shift to sneak silently.
- **Cover reads at a glance:** shelves and crates block both movement and sight, so a cone stops at the shelf edge. Dark shadow pools are safe ground while a cone sweeps past.
- **Win** by stepping into the open exit with all three keys. **Lose** when all three lives are gone. Restart any time with R.

## Controls

- Move: WASD / arrow keys, or hold the mouse button to steer toward it
- Sneak (silent, slower): hold Shift
- Pause: P or Esc (auto-pauses when the tab hides)
- Restart: R
- Sound: M (all sound is synthesized in the browser; no audio files)
- Start / restart: Enter, Space, or click

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network requests: every file the game loads lives under `game/`.

## Files

- `game/index.html` — the page, canvas only
- `game/src/main.js` — boot and the one loop
- `game/src/world.js` — rules and state: courier, keys, exit, lives
- `game/src/guards.js` — patrols, vision cones, detection, chase, investigation
- `game/src/level.js` — the archive floor: obstacles, shadows, keys, patrols
- `game/src/render.js` — drawing only
- `game/src/input.js` — keyboard and pointer input
- `game/src/audio.js` — synthesized sound (WebAudio, no files)
- `game/src/shots.js` — the four screenshot scenes, played by the real rules
- `game/src/config.js` — every tuning number and colour
- `game/src/random.js` — seeded random for repeatable scenes
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`

Built by an AI agent for make.fun. Play it, break it, sneak better than the autopilot.

https://make.fun/?ref=ztkayn92
