# Docs


## Background

Threebox works by adding a Three.js scene to Mapbox GL, via a custom layer. The custom layer API is fairly primitive still, and Threebox tackles several hurdles to getting Three and Mapbox to work together. 


### Camera

The Threebox camera is a `THREE.PerspectiveCamera()`, wired to synchronize with the MapboxGL camera. On every `move` event of the latter, Threebox retrieves the transform matrix (`map.transform`) to apply to its own camera, to match pitch and bearing.


### Coordinate system

The Threebox scene consists of a single `THREE.Group()` "World", which holds everything to be added to the map. Threebox handles zoom and panning not in the camera, but instead by scaling and translating this group. When the map zooms out, World and all its contents would scale down accordingly.


### Render loop

While Three.js typically renders the scene on a dedicated `requestAnimationFrame` loop, sharing a context with Mapbox GL means it would have to use the latter's render loop to get all layers to render properly.

Mapbox GL emits a `render` event for most visual changes to the map: camera movements, new tiles loading, new data appearing on the map, etc. However, the event is _not_ aware of changes within any custom layer. For Threebox to react properly to both the map and to its own internal scene, it implements two important things:

1) Rerenders the Threebox scene on the Mapbox GL `render` event (`Threebox.update()`). This ensures that the threebox scene gets drawn whenever the rest of the map updates.

2) Triggers a Mapbox GL `render` event whenever its own scene changes: adding, removing, moving, or otherwise updating anything that causes a visual change to the scene. 


## Setup

`var threebox = new Threebox(map, mapboxGLContext)`

Sets up a threebox scene inside a [Mapbox GL custom layer's onAdd function](https://www.mapbox.com/mapbox-gl-js/api/#customlayerinterface), which provides both inputs for this method. Automatically synchronizes the camera movement and events between Three.js and Mapbox GL JS. 

`threebox.update(skipMapRepaint)`

Rerender the threebox scene. Fired in the custom layer's `onRender` function, and whenever the threebox scene changes (animations, adding/removing objects, etc). `skipMapRepaint = false` for all rerenders triggered by scene-related changes.

`threebox.setupDefaultLights()`

Set up some default lights. If you don't call this and don't set up your own lights, all objects added to the scene will appear black.


##Handling objects

`threebox.addAtCoordinate(object, position, options)`

Manually add a Three.js `Object3D` to your map.

- `object` - any Three.js `Object3D` to add to the map

- `position` - An `array` containing [`longitude`, `latitude`, `altitude`] specifying where the object will be added. The units of `altitude` depend on the value of the `scaleToLatitude` option (see below).

- `options` (_optional_) - An object containing the following properties:
	- `options.scaleToLatitude` (_optional, defaults to `true`_) - Because of distortion introduced by the Mercator map projection, objects of the same physical size appear larger on the map the further they are north or south of the equator. If `scaleToLatitude` is set to `true`, the objects units will be interpreted as `meters` and the scene graph object will be automatically scaled to appear correctly at its latitude on the map. If set to `false`, the objects units will be used directly in the threebox scenegraph.
	
	- `options.preScale` (_optional, defaults to `1.0`_) - If `scaleToLatitude` is `true`, `preScale` can be used to set a fixed scale factor to adjust the object's size regardless of geographic location.

`threebox.moveToCoordinate(object, position, options)`

Move an object to a new longitude/latitude/altitude position on the map. Parameters are the same as with `options.addAtCoordinate` above. If `scaleToLatitude` is set to `true`, the object will automatically be correctly re-sized to its new position.

`threebox.remove(object)`

Remove an object from the map.

##Utilities

`threebox.projectToWorld(lnglatalt)`

Given an input of `lnglatalt` as an `array` of geographic [`longitude`, `latitude`, `altitude`], return a Three.js `Vector3` representing the corresponding point in the scenegraph coordinate system.

`threebox.unprojectFromWorld(point)`

Given an input of `point` as a Three.js `Vector3` representing a point in the scenegraph coordinate system, return an `array` of the corresponding [`longitude`, `latitude`, `altitude`] in geographic space.

`threebox.queryRenderedFeatures(xy)`

Given an input of `xy` as an object with `x` and `y` values representing screen coordinates (as returned by mapboxgl mouse events as `e.point`), return an array of threebox objects at that screen position.

## Examples

- [Basic usage](../examples/basic.html)