# NovaFX Development Conventions

## Runtime

* Runtime code is plain JavaScript using ES Modules.
* Runtime must not import React, Zustand, or any Editor module.
* Public Runtime APIs should use JSDoc for parameters, options, and return values.
* Runtime should depend only on browser APIs needed for Canvas rendering and asset loading.

## Editor

* Editor code may use React and Zustand.
* Editor must treat Runtime as an internal dependency for preview only.
* Editor exports Effect JSON; it must not generate Runtime-specific code.

## Assets

* Built-in particle shapes live in `public/img/particleShapes`.
* Effect JSON stores asset ids or paths, not image data.
* Runtime loads and caches each image asset once through the Asset Manager.

## Project Workflow

* Use `npm run dev` for the demo app.
* Use `npm run build` for the Vite demo build.
* Use `npm run build:runtime` for the standalone Runtime bundle.
* Use `npm run lint` before marking implementation tasks complete.
* Use `npm run test` once Runtime units are added.