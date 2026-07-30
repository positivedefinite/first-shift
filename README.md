# FIRST SHIFT

Rainy night bike run. Suburbs → terraces → neon → old town.

Browser game on **three.js r185** — `WebGPURenderer` + TSL `RenderPipeline` bloom.

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://localhost:5177](http://localhost:5177).

Production smoke test (same path Heroku uses):

```bash
npm run build
npm start
```

Then open [http://localhost:3000](http://localhost:3000) (or `$PORT`).

## Deploy on Heroku

Needs [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) + Node buildpack (default for Node apps).

```bash
heroku create your-app-name
heroku buildpacks:set heroku/nodejs
git push heroku main
heroku open
```

Or connect this GitHub repo in the Heroku dashboard → **Deploy** → automatic deploys from `main`.

Build: `npm run build` (Vite → `dist/`).  
Start: `node server.js` via `Procfile` (`web`), binds `process.env.PORT`.

## Levels

| # | Name | Feel |
| --- | --- | --- |
| 1 | SUBURBS · Estate Lane | Low houses, trees, warm lights · 620m |
| 2 | BOROUGH · Canal Reach | Attached terraces, corner shops · 850m |
| 3 | CENTER · Neon Mile | Dense cyber canyon · 1100m |
| 4 | OLD TOWN · Bell Lane | Gothic stone, packed lane · 980m |

Beat a level to unlock the next. Saved in `localStorage`.

## Controls

| Key | Action |
| --- | --- |
| A / D or ← → | Steer |
| W / ↑ | Pedal (hold or you coast) |
| S / ↓ | Brake |
| Space / Shift | Boost while pedaling |
| Enter | Start / next |
| 1–4 | Pick level on map |
| M | Mute |

Coffee +4s. Hit vans −3.5s. Stall on curb if you stop pedaling.
