# Summit Freeride

A 3D freeride skiing game that runs in the browser. Sixteen steep, wide slopes on both sides of
one big mountain, a trail map you can teleport from, natural jumps and cliff bands everywhere,
flips and spins that are easy to land, a wingsuit, and a paraglider you can pull at any time.

**Play:** open `index.html` in a browser. It is a single self-contained file (three.js is
bundled in), so it works offline and straight from disk.

## The mountain

The game opens on the trail map. Tap a numbered pin (or a name in the list) to pick a slope,
or tap anywhere else on the mountain to drop in right there. Press **M** while skiing to come
back to the map.

**Front side (sunny south face)**

| # | Slope | Grade | What's on it |
|---|-------|-------|--------------|
| 1 | Glacier Highway | Red | Long, fast, wide; endless rolling natural jumps |
| 2 | Eagle Cliffs | Black | Stacked cliff bands from 6 m to 32 m |
| 3 | Pillow Fields | Black | Cascading pillow lines and step-downs |
| 4 | Sidewinder | Red | A snaking natural bobsled gully with giant banked turns |
| 5 | Summit Express | Blue | Widest groomer from the highest peak, side hits |
| 6 | Kicker Alley | Park | Three lanes of kickers, S to XL, plus the Monster |
| 7 | The Wall | Double black | Three faces steeper than 45° |
| 8 | Windlip Bowl | Black | Cornice drop into a bowl full of wind lips |
| 9 | Sky Launch | Extreme | 75 m summit cliff, a ring course in the sky for the wingsuit |

**Back side (steep north face)**

| # | Slope | Grade | What's on it |
|---|-------|-------|--------------|
| 10 | Enchanted Glades | Red | Powder through open forest, knolls to pop |
| 11 | Giant's Staircase | Black | Dozens of giant steps, drop after drop |
| 12 | Ravine Gaps | Black | Natural gap jumps over hollows and creek beds |
| 13 | Flight Deck | Extreme | A ski-flying hill with measured flights past 200 m |
| 14 | Superpipe Canyon | Park | A jump line that funnels into a 370 m superpipe |
| 15 | Alaska Spines | Double black | A 50° fluted face: ride the chutes or hop the spines |
| 16 | Avalanche Couloir | Extreme | A chute between rock towers. Outrun the avalanche |

Gold rings hang on the jump lines of every slope (and in the sky below Sky Launch). The map
remembers your best score and ring count for each slope, and your longest ski flight.

## Controls

| | On snow | In the air | Wingsuit / paraglider |
|---|---|---|---|
| **A/D** or **←/→** | Carve | Spin | Bank and turn |
| **W** or **↑** | Tuck | Front flip | Dive / speed bar |
| **S** or **↓** | Brake (hockey stop) | Back flip | Flare / brakes |
| **Space** | Hold, release to jump | Press and hold to fly the wingsuit | |
| **Shift** | | Grab (direction picks the grab) | |
| **G** | Open / stow the paraglider | | |

**M** mountain map · **C** camera (chase, far, helmet, cinematic) · **R** restart slope ·
**Esc** pause and settings. Drag with the mouse to look around; double-click for fullscreen.

Gamepads work (left stick, A jump / wingsuit, X grab, Y paraglider, LB camera, Back map). On
phones and tablets an on-screen stick and buttons appear automatically.

**Easy landings** (on by default) steers your rotation so every flip and spin lands on your skis,
matched to the slope. Turn it off in Settings for pro mode, where you have to stop your own
rotation or you'll tumble.

**Weather:** bluebird day, golden hour, aurora night or snowstorm, switchable from the map or the
pause menu. Big airs drop into slow motion (also a setting).

## How it works

- `src/world.js` builds the mountain: two faces either side of a summit ridge, forested spurs
  between the runs, enclosing ranges, and analytic features (kickers, rollers, wind lips,
  pillows, cliff bands, giant steps, gaps, banked gully, superpipe, fluted spines, a ski-flying
  ramp). It also places ~63,000 trees, rocks, run markers, thermals and rings.
- `src/skier.js` is the physics: edge-grip carving and skidding with steering inertia, drag and
  snow friction, a ballistic look-ahead that decides when you leave the ground (small bumps are
  absorbed by the legs), air rotation with landing assist, superpipe transitions, a wingsuit,
  and a paraglider flight model with wind, ridge lift and thermals.
- `src/rings.js` rides a ghost skier over every jump with the same physics and hangs each ring
  on the line it actually flew, so every ring can be reached.
- `src/character.js` is the skier: two-bone IK for legs and arms, leg suspension, real pole
  plants, angulation, tuck, grabs, wingsuit membranes, a seated harness pose and tumbles.
- `src/terrain.js` renders a quadtree level-of-detail terrain that morphs smoothly between
  detail levels, with a snow / rock / corduroy shader.
- `src/sky.js` is the sky and weather; `src/camera.js` the spring-damped camera;
  `src/ui.js` the map hub, HUD and menus; `src/main.js` ties it together (smoothed fixed-step
  loop, slow motion, scoring, rings, the avalanche).

## Building

```bash
npm install
```

```bash
npm run build
```

This bundles `src/` into `index.html`.
