# Summit Freeride

A 3D freeride skiing game that runs in the browser. Eight steep, wide slopes on one big
mountain, natural jumps and cliff bands everywhere, flips and spins that are easy to land,
and a paraglider you can pull at any time.

**Play:** open `index.html` in a browser. It is a single self-contained file (three.js is
bundled in), so it works offline and straight from disk.

## The mountain

| # | Slope | Grade | What's on it |
|---|-------|-------|--------------|
| 1 | Glacier Highway | Red | Long, fast, wide; endless rolling natural jumps |
| 2 | Eagle Cliffs | Black | Stacked cliff bands from 6 m to 32 m |
| 3 | Pillow Fields | Black | Cascading pillow lines and step-downs |
| 4 | Summit Express | Blue | Widest groomer from the highest peak, side hits |
| 5 | Kicker Alley | Park | Three lanes of kickers, S to XL, plus the Monster |
| 6 | The Wall | Double black | Three faces steeper than 45° |
| 7 | Windlip Bowl | Black | Cornice drop into a bowl full of wind lips |
| 8 | Sky Launch | Extreme | 75 m summit cliff, thermals for paragliding |

Every slope is open terrain: leave the piste, drop the off-piste cliffs, or open the trail map
(**M**) and tap anywhere on the mountain to teleport there.

## Controls

| | On snow | In the air | Paragliding |
|---|---|---|---|
| **A/D** or **←/→** | Carve | Spin | Turn |
| **W** or **↑** | Tuck | Front flip | Speed bar |
| **S** or **↓** | Brake (hockey stop) | Back flip | Brakes |
| **Space** | Hold, release to jump | | |
| **Shift** | | Grab (direction picks the grab) | |
| **G** | Open / stow the paraglider | | |

**M** trail map and teleport · **C** camera (chase, far, helmet, cinematic) · **R** restart slope ·
**Esc** pause and settings. Drag with the mouse to look around; double-click for fullscreen.

Gamepads work (left stick, A jump, X grab, Y paraglider, LB camera, Back map). On phones and
tablets an on-screen stick and buttons appear automatically.

**Easy landings** (on by default) steers your rotation so every flip and spin lands on your skis,
matched to the slope. Turn it off in Settings for pro mode, where you have to stop your own
rotation or you'll tumble.

## How it works

- `src/world.js` builds the mountain: a concave alpine face with forested spurs between the
  runs, a bowl, enclosing ridges, and analytic features (kickers, rollers, wind lips, pillows,
  cliff bands, steep walls). It also places ~21,000 trees, rocks, run markers and thermals.
- `src/skier.js` is the physics: edge-grip carving and skidding, drag and snow friction,
  a ballistic look-ahead that decides when you leave the ground (small bumps are absorbed by
  the legs), air rotation with landing assist, and a paraglider flight model with wind, ridge
  lift and thermals.
- `src/character.js` is the skier: two-bone IK for legs and arms, real pole plants, angulation,
  tuck, grabs, a seated harness pose and tumbles.
- `src/terrain.js` renders a quadtree level-of-detail terrain with a snow / rock / corduroy shader.

## Building

```bash
npm install
```

```bash
npm run build
```

This bundles `src/` into `index.html`.
