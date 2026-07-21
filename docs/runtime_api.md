# NovaFX Runtime API

NovaFX Runtime is a framework-independent JavaScript Canvas runtime. Game code should use only the public `NovaFX` API and should not instantiate `Particle`, `Emitter`, `Track`, `Phase`, or internal managers directly.

## Import

```javascript
import { NovaFX } from './runtime/index.js';
```

## Constructor

```javascript
const fx = new NovaFX(canvasOrContext, options);
```

`canvasOrContext` can be either an `HTMLCanvasElement` or a `CanvasRenderingContext2D`.

Common options:

* `backgroundColor`: canvas clear color used by `render()`.
* `assets`: custom asset map, asset list, or asset manifest registered before effect load.

## Loading Effects

```javascript
await fx.load('effects/explosion.json');
await fx.load(effectObject);
```

`load()` accepts a URL string or a plain Effect JSON object. Templates are parsed and cached by effect id, and URL loads are cached by URL.

## Playing Effects

```javascript
const instanceId = fx.play('explosion', x, y, options);
```

`play()` returns an instance id. Options can override instance-level values such as `rotation`, `scale`, `lifetime`, or `blendMode`.

## Game Loop

```javascript
function frame(time) {
  const deltaTime = (time - previousTime) / 1000;
  previousTime = time;

  fx.update(deltaTime);
  fx.render();

  requestAnimationFrame(frame);
}
```

`update(deltaTime)` advances active effect instances. `render(context)` draws to the constructor context by default, or to an override context when provided. `render()` returns the current draw count.

## Stopping Effects

```javascript
fx.stop(instanceId);
```

`stop()` destroys one running instance and returns `true` when an instance was found.

## Assets

```javascript
fx.registerAsset('magic-rune', '/assets/magic-rune.png');
await fx.load(effectObject, {
  assets: {
    version: 1,
    assets: [{ id: 'magic-rune', src: '/assets/magic-rune.png' }],
  },
});
```

Effects reference images by `particle.spriteId`. Runtime JSON must not embed image data.

## Stats

```javascript
const stats = fx.getStats();
```

Stats include:

* `instanceCount`
* `particleCount`
* `drawCount`

## Cleanup

```javascript
fx.destroy();
```

`destroy()` releases active instances, cached templates, runtime stats, and loaded asset references.