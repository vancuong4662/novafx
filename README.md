# NovaFX

NovaFX is a data-driven 2D visual effect system for JavaScript Canvas games. Effects are described as JSON, previewed and edited in a browser editor, then played in another Canvas project through a small runtime API.

The runtime is plain JavaScript, framework-independent, and uses the Canvas 2D API. The editor is a React/Vite app built around the same runtime so exported JSON is the same data your game will load.

## Current Features

- JavaScript Canvas runtime with `NovaFX` public API.
- Effect JSON v1 parser and template cache.
- Multiple emitter types: `burst`, `continuous`, `interval`.
- Emitter shapes: `point`, `nova_point`, `circle`, `line`, `box`.
- Particle lifecycle, pooling, sprite assets, blend mode, alpha, color, size, scale, rotation, speed, direction, and gravity.
- Track and phase system for animated particle properties.
- Built-in particle shapes from `public/img/particleShapes`.
- Custom PNG asset registration and editor asset manifest export.
- Visual editor with preview, inspector, track/phase editing, emitter duplicate, reorder, import, and export.
- Presets in `effects/`, including `realistic_fire.json`.

## Project Structure

```text
src/
  runtime/             Runtime used by games and editor
  editor/              React editor UI
  shared/              Shared utilities when needed
effects/               Effect JSON presets
public/img/            Editor/runtime public image assets
docs/                  Project plan and format/API details
dist/                  Build output
```

Useful docs:

- [docs/runtime_api.md](docs/runtime_api.md)
- [docs/effect_json_v1.md](docs/effect_json_v1.md)
- [docs/project_plan.md](docs/project_plan.md)

## Development

Install dependencies:

```bash
npm install
```

Run the editor:

```bash
npm run dev
```

Build the editor app:

```bash
npm run build
```

Build the standalone runtime bundle:

```bash
npm run build:runtime
```

Run validation:

```bash
npm run test
npm run lint
npm run build
npm run build:runtime
```

## Using the Editor

1. Start the dev server with `npm run dev`.
2. Choose a preset from the sidebar or import your own Effect JSON.
3. Edit effect, surface, emitter, particle, track, and phase settings.
4. Use the Asset Panel to choose built-in particle shapes or upload custom PNG shapes.
5. Reorder emitters with `Up` / `Down` to control render depth. Later emitters render above earlier emitters.
6. Export the Effect JSON.
7. If the effect uses custom PNG assets, also export the asset manifest.

Effect JSON stores only asset ids such as `smoke`, `spark`, or `magic-rune`. It does not embed image data.

## Applying NovaFX to Another JavaScript Canvas Game

NovaFX is designed to be copied into a plain JavaScript Canvas game without bringing React or the editor along.

### Option 1: Use the ES Module Runtime

Build the runtime:

```bash
npm run build:runtime
```

Copy these into your game project:

```text
dist/novafx.es.js
effects/your-effect.json
public/img/particleShapes/
```

Then import and use it from your game code:

```javascript
import { NovaFX } from './vendor/novafx.es.js';

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const fx = new NovaFX(context, {
  clearCanvas: false,
  showIdleState: false,
});

await fx.load('/effects/realistic_fire.json');

let previousTime = performance.now();

function frame(currentTime) {
  const deltaTime = (currentTime - previousTime) / 1000;
  previousTime = currentTime;

  updateGame(deltaTime);

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawGame(context);

  fx.update(deltaTime);
  fx.render(context);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  fx.play('realistic-fire', x, y);
});
```

### Option 2: Use the IIFE Runtime

Build the runtime:

```bash
npm run build:runtime
```

Copy `dist/novafx.iife.js` into your game project and load it with a script tag:

```html
<script src="./vendor/novafx.iife.js"></script>
<script>
  const fx = new NovaFX.NovaFX(document.querySelector('canvas'), {
    clearCanvas: false,
    showIdleState: false,
  });
</script>
```

Use the same `load`, `play`, `update`, `render`, and `destroy` methods as the ES module version.

## Runtime API Basics

Create the runtime:

```javascript
const fx = new NovaFX(canvasOrContext, options);
```

Load an effect:

```javascript
await fx.load('/effects/explosion.json');
await fx.load(effectObject);
```

Play it:

```javascript
const instanceId = fx.play('explosion', x, y, {
  scale: 1,
  rotation: 0,
});
```

Stop it if needed:

```javascript
fx.stop(instanceId);
```

Update and render from your game loop:

```javascript
fx.update(deltaTime);
fx.render(context);
```

Clean up when changing scene or closing the game:

```javascript
fx.destroy();
```

## Assets in Another Game

Built-in shapes are referenced by id and resolved from image paths registered in the runtime. If your effect uses only built-in ids, copy the matching `public/img/particleShapes` folder into your game public assets.

If your effect uses custom PNG assets from the editor, export the asset manifest and register it before loading the effect:

```javascript
const assetManifest = {
  version: 1,
  assets: [
    { id: 'magic-rune', src: '/assets/particles/magic-rune.png' },
  ],
};

await fx.load(effectJson, { assets: assetManifest });
```

You can also register assets one by one:

```javascript
fx.registerAsset('magic-rune', '/assets/particles/magic-rune.png');
await fx.load(effectJson);
```

Keep this rule: Effect JSON should store only `spriteId`, never base64 image data.

## Effect JSON Notes

Minimal effect shape:

```json
{
  "id": "explosion",
  "version": 1,
  "duration": 1.2,
  "surface": {
    "width": 256,
    "height": 256,
    "blendMode": "source-over"
  },
  "emitters": []
}
```

Emitter order controls depth. Emitters later in the `emitters` array are processed later and visually appear above earlier emitters when their particles overlap.

Preset examples live in [effects](effects):

- `explosion.json`
- `fire.json`
- `smoke.json`
- `heal.json`
- `rain.json`
- `realistic_fire.json`

## Editor-Only Features

The editor helps create JSON, but games do not need the editor bundle. These workflows are editor conveniences:

- Import/export full Effect JSON.
- Import/export a single emitter JSON.
- Duplicate emitters.
- Move emitters up/down for depth.
- Upload custom PNG shapes for preview.
- Export custom asset manifest.

A game should consume only the runtime bundle, Effect JSON files, and required image assets.

## Notes and Limits

- Runtime does not handle gameplay collision, damage, physics, or events.
- Particle data is visual only.
- The game owns the main loop and calls `fx.update(deltaTime)` / `fx.render(context)`.
- Runtime and editor are intentionally separated: editor creates data, runtime plays data.
