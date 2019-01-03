# Docs


## Background

Threebox works by adding a Three.js scene to Mapbox GL, via a custom layer. The custom layer API is fairly primitive still, and Threebox tackles several hurdles to getting THREE and Mapbox to work together. 



## Setup

`var tb = new Threebox(map, mapboxGLContext)`

Sets up a threebox scene inside a [Mapbox GL custom layer's onAdd function](https://www.mapbox.com/mapbox-gl-js/api/#customlayerinterface), which provides both inputs for this method. Automatically synchronizes the camera movement and events between Three.js and Mapbox GL JS. 

`tb.update()`

Rerender the threebox scene. Fired in the custom layer's `onRender` function, and whenever the threebox scene changes (animations, adding/removing objects, etc). Threebox will 


`tb.setupDefaultLights()`

Set up some default lights. If you don't call this and don't set up your own lights, all objects added to the scene will appear black.


## Common types

###Geometry
####lnglat

An array of 2-3 numbers representing longitude, latitude, and optionally altitude (in meters). When altitude is omitted, it is assumed to be 0. When populating this from a GeoJSON Point, this array can be accessed at `point.geometry.coordinates`.  

While altitude is not standardized in the GeoJSON specification, Threebox will accept it as such to position objects along the z-axis.   

####line

An array of at least two lnglat's, forming a line. When populating this from a GeoJSON Linestring, this array can be accessed at `linestring.geometry.coordinates`. 

#### radians

An angle of rotation, in radians. 

###Objects

####material

A [Three.js material](https://threejs.org/docs/#api/en/materials/Material) for constructing objects. One of MeshBasicMaterial, MeshDepthMaterial, MeshLambertMaterial, MeshNormalMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial.

####color
Hexadecimal, or predefined HTML color names.

## Objects

Threebox offers convenience functions to construct various three-dimensional geometric primitives in Three. Under the hood, they invoke a subclass of [THREE.Object3D](https://threejs.org/docs/#api/en/core/Object3D) class

###threebox.line(options)

Calls `THREE.Line` internally via `THREE.CatmullRomCurve3`.

####options

| parameter | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|----------------------------------------------------------------------------------------------|
| geometry    | yes       | NA      | line | Array of lnglat coordinates to draw the line|
| color     | no       | black   | color  | Color of line.                                                                             




###threebox.tube(options)

Extrude a tube along a specific line, with an equilateral polygon as cross section. Internally, calls `THREE.Mesh` with a `THREE.ExtrudeBufferGeometry` and `THREE.CatmullRomCurve3`.

####options

| parameter | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|----------------------------------------------------------------------------------------------|
| radius    | no       | 20      | number | Radius of sphere. If positioned with `scaleToLatitude:true`, will render as 1 unit = 1 meter, as defined at the tube's first coordinate|
| segments  | no       | 8       | number | Number of facets along the extrusion. The higher the number, the more closely the tube will approximate a smooth cylinder.         |
| color     | no       | black   | color  | Color of sphere.                                                                             
| material     | no       | MeshLambertMaterial   | material  | THREE material type to use.    


###threebox.sphere(options)

Internally, calls `THREE.Mesh` with a `THREE.SphereGeometry`.

####options

| parameter | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|----------------------------------------------------------------------------------------------|
| radius    | no       | 50      | number | Radius of sphere. If positioned with `scaleToLatitude:true`, will render as 1 unit = 1 meter |
| segments  | no       | 8       | number | Number of width and height segments. The higher the number, the smoother the sphere.         |
| color     | no       | black   | color  | Color of sphere.                                                                             
| material     | no       | MeshLambertMaterial   | string  | THREE material type to use.                                                                             

###threebox.loadObj(options, callback(obj))

Loads an object via an external .obj and .mtl file. Note that unlike all the other object classes, `loadObj` is asynchronous, and returns the object as an argument of the callback function. Internally, uses `THREE.OBJLoader` to fetch the .obj assets.

####options

| parameter | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|----------------------------------------------------------------------------------------------|
| position    | no       | [0,0,0]      | lnglat | Starting position of object |
| model  | yes       | NA       | Object | An object with `obj` and `mtl` properties, containing strings of the directory paths to those assets        |
| rotation     | no       | {x:0, y:0, z:0}   | object  | An object containing rotations of the object along the three axes. Useful for aligning an obj to a desired orientation before future rotations. Note that future rotations apply atop this transformation, rather than overwriting it.                                                                            

####callback(obj)

A function to run after the object loads. The first argument will be the successfully loaded object.


###threebox.Object3D(obj)

Import a `THREE.Object3D` instantiated elsewhere in THREE.

##Object methods

###obj.setCoords(lnglat, options)

Position the object at the desired coordinate. can be called before adding object to the map.

###obj.add()

Add object to the map.

###obj.followPath(line, options)



###obj.remove()

Remove object from the map.


## Using Vanilla Three.js in Threebox

Threebox implements many small affordances to make mapping run in Three.js quickly and precisely on a global scale. Whenever possible, use threebox methods to add, change, manage, and remove elements of the scene. Otherwise, here are some best practices:

- Use `threebox.Object3D` to add custom objects to the scene
- If you must interact directly with the THREE scene, add all objects to `threebox.world`.
- `threebox.projectToWorld` to convert lnglat to the corresponding `THREE.Vector3()`




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


## Further background

### Camera

The Threebox camera is a `THREE.PerspectiveCamera()`, wired to synchronize with the MapboxGL camera. On every `move` event of the latter, Threebox retrieves the transform matrix (`map.transform`) to apply to its own camera, to match pitch and bearing.


### Coordinate system

The Threebox scene consists of a single `THREE.Group()` "World", which holds everything to be added to the map. Threebox handles zoom and panning not in the camera, but instead by scaling and translating this group. When the map zooms out, World and all its contents would scale down accordingly.


### Render loop

While Three.js typically renders the scene on a dedicated `requestAnimationFrame` loop, sharing a context with Mapbox GL means it would have to use the latter's render loop to get all layers to render properly.

Mapbox GL emits a `render` event for most visual changes to the map: camera movements, new tiles loading, new data appearing on the map, etc. However, the event is _not_ aware of changes within any custom layer. For Threebox to react properly to both the map and to its own internal scene, it does two important things:

1) Rerenders the Threebox scene on the Mapbox GL `render` event (`Threebox.update()`). This ensures that the threebox scene gets drawn whenever the rest of the map updates.

2) Triggers a Mapbox GL `render` event whenever its own scene changes: adding, removing, moving, or otherwise updating anything that causes a visual change to the scene. 
