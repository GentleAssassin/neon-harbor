// The city of Neon Harbor: a seeded grid of roads, buildings, parks, palms, a beach and a
// harbor pier. Everything is data — no drawing here — so the renderer, the minimap, the
// traffic and the collision tests all read the same city.
import { WORLD } from './config.js';

export const ROAD_W = 84;
export const SIDEWALK = 16;
export const V_ROADS = [320, 720, 1120, 1520, 1920, 2320, 2720, 3120];
export const H_ROADS = [320, 680, 1040, 1400, 1760, 2120];
export const BEACH_Y = 2280;
export const SEA_Y = 2460;
export const WATER_X = 3360;
/** The pier deck, the one dry walk over the water. */
export const PIER = { x: 3120, y: 992, w: 440, h: 96 };

/** Named places the missions and the HUD point at. */
export const PLACES = {
  cafe: { x: 1180, y: 742, name: 'Coral Cafe' },
  dock: { x: 3300, y: 1000, name: 'Harbor Dock' },
  pierEnd: { x: 3520, y: 1040, name: 'Sunset Pier' },
  garage: { x: 792, y: 1792, name: 'Neon Garage' },
  bank: { x: 1972, y: 1000, name: 'Harbor Bank' },
  airfield: { x: 372, y: 2160, name: 'Sunset Airfield' },
  hospital: { x: 1560, y: 372, name: 'St. Marina Hospital' },
  plaza: { x: 1120, y: 1040, name: 'Sunset Plaza' },
};

export function createCity(random) {
  const buildings = [];
  const parks = [];
  const palms = [];
  const umbrellas = [];
  const colors = ['#c96f4a', '#d9a05b', '#7a9e7e', '#5b7fa6', '#b0576e', '#8a7fb8', '#a8b05b', '#4a7a6f', '#e07a5f', '#6d9dc5'];

  const xEdges = [40, ...V_ROADS.map((x) => x + ROAD_W / 2 + SIDEWALK)];
  const xNext = [...V_ROADS.map((x) => x - ROAD_W / 2 - SIDEWALK), WORLD.width - 40];
  const yEdges = [40, ...H_ROADS.map((y) => y + ROAD_W / 2 + SIDEWALK)];
  const yNext = [...H_ROADS.map((y) => y - ROAD_W / 2 - SIDEWALK), BEACH_Y - 20];

  for (let bx = 0; bx < xEdges.length; bx += 1) {
    for (let by = 0; by < yEdges.length; by += 1) {
      const x0 = xEdges[bx];
      const x1 = Math.min(xNext[bx], WATER_X - 20);
      const y0 = yEdges[by];
      const y1 = yNext[by];
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 90 || h < 70 || x0 > WATER_X - 60) continue;
      if (random.chance(0.22)) {
        parks.push({ x: x0, y: y0, w, h });
        for (let t = 0; t < Math.floor((w * h) / 9000); t += 1) {
          palms.push({ x: random.range(x0 + 20, x1 - 20), y: random.range(y0 + 20, y1 - 20), s: random.range(0.8, 1.25) });
        }
        continue;
      }
      const count = random.int(1, 3);
      for (let i = 0; i < count; i += 1) {
        const bw = random.range(70, Math.min(180, w - 24));
        const bh = random.range(60, Math.min(150, h - 24));
        const bx0 = random.range(x0 + 8, x1 - bw - 8);
        const by0 = random.range(y0 + 8, y1 - bh - 8);
        if (buildings.some((b) => bx0 < b.x + b.w + 14 && bx0 + bw + 14 > b.x && by0 < b.y + b.h + 14 && by0 + bh + 14 > b.y)) continue;
        buildings.push({
          x: bx0, y: by0, w: bw, h: bh,
          color: random.pick(colors),
          tall: random.chance(0.3),
          windows: random.int(2, 5),
        });
      }
    }
  }

  // Palm-lined beach and a few umbrellas on the sand.
  for (let x = 120; x < WORLD.width - 120; x += 95) {
    palms.push({ x: x + random.range(-20, 20), y: random.range(BEACH_Y + 30, BEACH_Y + 110), s: random.range(0.9, 1.3) });
  }
  for (let i = 0; i < 16; i += 1) {
    umbrellas.push({
      x: random.range(140, WORLD.width - 140),
      y: random.range(BEACH_Y + 140, SEA_Y - 40),
      color: random.pick(['#ff477e', '#ffe66d', '#2ec4b6', '#ff9f68']),
    });
  }
  // A few palms along the main avenues.
  for (let i = 0; i < 26; i += 1) {
    const vertical = random.chance(0.5);
    if (vertical) {
      palms.push({ x: random.pick(V_ROADS) + random.pick([-1, 1]) * (ROAD_W / 2 + 10), y: random.range(120, BEACH_Y - 120), s: random.range(0.8, 1.1) });
    } else {
      palms.push({ x: random.range(120, WATER_X - 120), y: random.pick(H_ROADS) + random.pick([-1, 1]) * (ROAD_W / 2 + 10), s: random.range(0.8, 1.1) });
    }
  }

  function inWater(x, y) {
    if (y >= SEA_Y) return true;
    if (x >= WATER_X && !(x >= PIER.x && x <= PIER.x + PIER.w && y >= PIER.y && y <= PIER.y + PIER.h)) return true;
    return false;
  }

  function blocked(x, y, r) {
    if (x < r || y < r || x > WORLD.width - r || y > WORLD.height - r) return true;
    if (inWater(x, y)) return true;
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    return false;
  }

  /** Push a circle out of every building and the water; returns true when it moved. */
  function resolveCircle(body, r) {
    let moved = false;
    for (const b of buildings) {
      const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
      const dx = body.x - cx;
      const dy = body.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 < 0.01) {
          body.y = b.y - r;
        } else {
          const d = Math.sqrt(d2);
          body.x = cx + (dx / d) * r;
          body.y = cy + (dy / d) * r;
        }
        moved = true;
      }
    }
    if (inWater(body.x, body.y)) {
      body.y = Math.min(body.y, SEA_Y - r - 1);
      if (body.x >= WATER_X) body.x = WATER_X - r - 1;
      moved = true;
    }
    body.x = Math.max(r, Math.min(WORLD.width - r, body.x));
    body.y = Math.max(r, Math.min(WORLD.height - r, body.y));
    return moved;
  }

  function onRoad(x, y) {
    for (const rx of V_ROADS) if (Math.abs(x - rx) <= ROAD_W / 2 && y < BEACH_Y) return true;
    for (const ry of H_ROADS) if (Math.abs(y - ry) <= ROAD_W / 2 && x < WATER_X) return true;
    return false;
  }

  function randomRoadPoint() {
    if (random.chance(0.5)) {
      return { x: random.pick(V_ROADS) + random.pick([-1, 1]) * 20, y: random.range(140, BEACH_Y - 140), axis: 'v', line: 0 };
    }
    return { x: random.range(140, WATER_X - 140), y: random.pick(H_ROADS) + random.pick([-1, 1]) * 20, axis: 'h', line: 0 };
  }

  return { buildings, parks, palms, umbrellas, blocked, resolveCircle, onRoad, randomRoadPoint, inWater };
}
