# Neon Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/GentleAssassin/neon-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/GentleAssassin/neon-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Harbor** is an original open-world crime game in the spirit of GTA 6, built for
make.fun's "Make GTA 6" bounty ($1,666 in USDC). It runs entirely from static files in
a desktop browser — no build step, no network, no assets to download.

You are Kai, a courier in a sun-soaked coastal city who owes the Harbor Rats money.
Steal cars, outrun the police, and finish five story missions to clear the debt and
own the city.

## The city

Neon Harbor is a living top-down city: a grid of avenues and streets, pastel
buildings, palm-lined sidewalks, parks, a sandy beach, and a harbor pier reaching
into teal water. Traffic drives the roads, pedestrians stroll the sidewalks, and
police cruisers answer every crime you commit.

## What you can do

- **Explore on foot and by car** — walk the streets, then press `E` to get into any
  parked or passing car. Stealing one raises your wanted level.
- **Wanted system** — 0 to 5 stars. Police cruisers chase and ram you, and on foot
  they will arrest you if they corner you. Lay low and the heat cools off.
- **Five story missions** — a courier pickup, a getaway drive, a rescue on the pier,
  a timed delivery under a three-star chase, and the final harbor heist. Each pays
  cash; finish all five to win.
- **Combat** — punch with `F`, aim and shoot the pistol with the mouse, reload with
  `R`. Thugs shoot back, and pickups drop cash, ammo and health.
- **A modern HUD** — thin health bar and cash top-left, wanted stars and ammo
  top-right, the mission card top-centre, and a rounded minimap bottom-left with a
  pink GPS route to your objective.
- **Save and continue** — progress and cash autosave in the browser, so you can pick
  up the story where you left off.
- **Sound** — synthesized WebAudio effects and a soft bass loop, `M` to mute.

## Controls

| Key | Action |
| --- | --- |
| `WASD` / arrows | Move on foot, drive the car |
| `Shift` | Run |
| `E` | Get in / out of a car |
| Mouse + click | Aim and shoot the pistol |
| `F` | Punch |
| `Q` | Switch weapon (pistol / fists) |
| `R` | Reload |
| `Space` | Handbrake while driving |
| `P` / `Esc` | Pause |
| `M` | Mute |

## Run it

```sh
python3 -m http.server 8000 --directory game
```

Then open http://localhost:8000 in desktop Chrome.

## How it is built

Plain HTML5 Canvas and ES modules under `game/src/`, one file per job: `city.js`
builds the city, `vehicles.js` drives the traffic, `police.js` runs the wanted
system, `missions.js` tells the story, `combat.js` handles the shooting,
`hud.js` draws the interface, `render.js` paints the world, and `game.js` steps
the whole simulation. `main.ts` copies `game/` and `screenshots/` to the output
and writes the dossier with the vendored make.fun library.

Built-in checks: open `?test=1` for the self-test suite, and `?shot=start|drive|
chase|mission` for the deterministic screenshot scenes.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1vgrq4ra&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
