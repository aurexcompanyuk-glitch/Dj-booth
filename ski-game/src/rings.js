// Hangs each ring on the line a rider really flies: a ghost skier (the same physics as the
// player) rides straight over every jump, roller and cliff that has a ring, and the ring is
// moved onto its flight path a moment after take-off. Rings you can reach are rings worth having.
import { Vector3 } from 'three';
import { Skier } from './skier.js';

const _f = new Vector3();

export function placeRings(world) {
  const ghost = new Skier(world);
  const inp = { steer: 0, fwd: 0, back: 0, jump: false, grab: false, glidePressed: false, startPressed: false };
  const DT = 1 / 60, MAX = 4.6;
  const path = [];
  let flown = 0;
  for (const ring of world.rings) {
    const f = ring.feat;
    if (!f) continue;
    const heading = Math.atan2(f.dx, f.dz);
    ghost.reset(f.cx - f.dx * 52, f.cz - f.dz * 52, heading);
    inp.startPressed = true;
    ghost.step(DT, inp);
    inp.startPressed = false;
    ghost.heading = heading;
    ghost.vel.copy(ghost.forwardOnSlope(_f)).multiplyScalar(22);
    ghost.events.length = 0;
    let t = 0, airT = -1, done = false;
    path.length = 0;
    while (t < MAX && !done) {
      ghost.step(DT, inp);
      t += DT;
      ghost.events.length = 0;
      const u = (ghost.pos.x - f.cx) * f.dx + (ghost.pos.z - f.cz) * f.dz;
      if (ghost.state === 'air') {
        if (airT < 0) {
          if (u > -14 && u < 30) { airT = 0; path.length = 0; }   // the air that belongs to this feature
        } else airT += DT;
        if (airT >= 0) path.push(ghost.pos.x, ghost.pos.y, ghost.pos.z);
      } else if (airT >= 0) {
        if (airT >= 0.42) done = true;       // a real air: keep it
        else { airT = -1; path.length = 0; } // just a hop, keep riding
      }
      if (u > 75 || ghost.state === 'crash') break;
    }
    const n = path.length / 3;
    if ((done || airT >= 0.42) && n > 6) {
      const air = n * DT;
      // close enough to the lip that a faster or slower rider still passes through the hoop
      const k = Math.min(n - 1, Math.max(2, Math.round(Math.min(0.46, Math.max(0.24, air * 0.3)) / DT)));
      const x = path[k * 3], y = path[k * 3 + 1], z = path[k * 3 + 2];
      ring.x = x; ring.z = z;
      ring.y = Math.max(y, world.height(x, z) + 1.5);
      flown++;
    } else {
      // no real air here at cruising speed: stand the ring on the snow just past the crest
      const x = f.cx + f.dx * 5, z = f.cz + f.dz * 5;
      ring.x = x; ring.z = z; ring.y = world.height(x, z) + 1.5;
    }
  }
  return flown;
}
