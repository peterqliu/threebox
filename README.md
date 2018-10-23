# `threebox`

A three.js plugin for Mapbox GL JS, using the custom layer feature. Provides convenient methods to manage objects in lnglat coordinates, and to synchronize the map and scene cameras.

### Compatibility/Dependencies

- Mapbox v.0.50.0 and later (for custom layer support), barring breaking changes later
- Three.r94 (already bundled into the Threebox build)

### Installation


Download the bundle from [`dist/threebox.js`](dist/threebox.js) and add include it in a `<script>` tag on your page. Note that the npm package is from an old version, and will not work (update in progress).

### Documentation

[Check it out here](docs/Threebox.md)


### Building

`npm run build`

or to continually rebuild as you develop:

`npm run dev`

Both commands will output a bundled in `/dist/threebox.js`.
