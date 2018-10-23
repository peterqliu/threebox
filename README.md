# `threebox`

A three.js plugin for Mapbox GL JS, using the custom layer feature.

## Compatibility/Dependencies

- Mapbox v.0.50.0 and later
- Three.r94 (bundled into the Threebox build)

## Installation

Add it to your project via `npm`:

`npm install threebox`

or download the bundle from [`dist/threebox.js`](dist/threebox.js) and add include it in a `<script>` tag on your page.

## Documentation

### [`Threebox`](/docs/Threebox.md)

Set up and handle the core translations between a Three.js scene graph and the Mapbox GL JS map.


## Building

`npm run build`

or to continually rebuild as you develop:

`npm run dev`

Both commands will output a bundled in `/dist/threebox.js`.
