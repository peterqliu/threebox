## `Threebox`

Set up and handle the core translations between a Three.js scene graph and the Mapbox GL JS map.

### Examples

- [Basic usage](../examples/basic.html)

### `var threebox = new Threebox(map);`

Instantiates a threebox canvas atop the Mapbox GL JS canvas object in `map`. Automatically sets up a new canvas DOM element for Three.js and synchronizes the camera movement and events between Three.js and Mapbox GL JS.

### `threebox.setupDefaultLights();`

Set up some default lights. If you don't call this and don't set up your own lights, all objects added to the scene will appear black.


### `threebox.addAtCoordinate(object, position, options);`

Manually add a Three.js `Object3D` to your map.

- `object` - any Three.js `Object3D` to add to the map
- `position` - An `array` containing [`longitude`, `latitude`, `altitude`] specifying where the object will be added. The units of `altitude` depend on the value of the `scaleToLatitude` option (see below).
- `options` (_optional_) - An object containing the following properties:
- `options.scaleToLatitude` (_optional, defaults to `true`_) - Because of distortion introduced by the Mercator map projection, objects of the same physical size appear larger on the map the further they are north or south of the equator. If `scaleToLatitude` is set to `true`, the objects units will be interpreted as `meters` and the scene graph object will be automatically scaled to appear correctly at its latitude on the map. If set to `false`, the objects units will be used directly in the Three.js scene graph which arbitrarily
- `options.preScale` (_optional, defaults to `1.0`_) - If `scaleToLatitude` is `true`, `preScale` can be used to set a fixed scale factor to adjust the object's size regardless of geographic location.

### `threebox.moveToCoordinate(object, position, options);`

Move an object to a new longitude/latitude/altitude position on the map. Parameters are the same as with `options.addAtCoordinate` above. If `scaleToLatitude` is set to `true`, the object will automatically be correctly re-sized to its new position.

### `threebox.remove(object)`

Remove an object from the map.

### `threebox.projectToWorld(lnglatalt)`

Given an input of `lnglatalt` as an `array` of geographic [`longitude`, `latitude`, `altitude`], return a Three.js `Vector3` representing the corresponding point in the scenegraph coordinate system.

### `threebox.unprojectFromWorld(point)`

Given an input of `point` as a Three.js `Vector3` representing a point in the scenegraph coordinate system, return an `array` of the corresponding [`longitude`, `latitude`, `altitude`] in geographic space.
