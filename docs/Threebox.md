# Documentation
---
## Background

Threebox works by adding a Three.js scene to Mapbox GL, via a custom layer. The custom layer API takes a fair amount of finessing to be useful, and Threebox tackles several hurdles to getting THREE and Mapbox to work together. 

<br>

## Setup

`var tb = new Threebox(map, mapboxGLContext[, options])`

Sets up a threebox scene inside a [Mapbox GL custom layer's onAdd function](https://www.mapbox.com/mapbox-gl-js/api/#customlayerinterface), which provides both inputs for this method. Automatically synchronizes the camera movement and events between Three.js and Mapbox GL JS. 

| option | required | default | type   | purpose                                                                                  |
|-----------|----------|---------|--------|----------------------------------------------------------------------------------------------|
| `defaultLights`    | no       | false      | boolean | Whether to add some default lighting to the scene. If no lighting added, most objects in the scene will render as black |
| `passiveRendering`     | no       | true   | boolean  | Color of line. Unlike other Threebox objects, this color will render on screen precisely as specified, regardless of scene lighting |
                                                              

`tb.update()`

Rerender the threebox scene. Fired in the custom layer's `render` function.


<br>

# Objects

Threebox offers convenience functions to construct meshes of various Three.js meshes, as well asl . Under the hood, they invoke a subclass of [THREE.Object3D](https://threejs.org/docs/#api/en/core/Object3D). 

Objects in Threebox fall under two broad varieties. *Static objects* don't move or change once they're placed, and used usually to display background or geographical features. They may have complex internal geometry, which are expressed primarily in lnglat coordinates. 

In contrast, *dynamic objects* can move around the map, positioned by a single lnglat point. Their internal geometries are produced mainly in local scene units, whether through external obj files, or these convenience methods below.

##Static objects

###Line 

`tb.line(options)`

Adds a line to the map, in full 3D space. Color renders independently of scene lighting. Internally, calls a [custom line shader](https://threejs.org/examples/?q=line#webgl_lines_fat).


| option | required | default | type   | purpose                                                                                  |
|-----------|----------|---------|--------|----------------------------------------------------------------------------------------------|
| `geometry`    | yes       | NA      | lineGeometry | Array of lnglat coordinates to draw the line |
| `color`     | no       | black   | color  | Color of line. Unlike other Threebox objects, this color will render on screen precisely as specified, regardless of scene lighting |
| `width`     | no       | 1   | number  | Line width. Unlike other Threebox objects, this width is in units of display pixels, rather than meters or scene units. |
| `opacity`     | no       | 1   | Number  | Line opacity |                                                                       


<br>

###Tube

`tb.tube(options)`

Extrude a tube along a specific lineGeometry, with an equilateral polygon as cross section. Internally uses a custom tube geometry generator.


| option | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|----------|
| `geometry`    | yes       | NA      | lineGeometry | Line coordinates forming the tube backbone |
| `radius`    | no       | 20      | number | Radius of the tube cross section, or half of tube width.|
| `sides`  | no       | 8       | number | Number of facets along the tube. The higher, the more closely the tube will approximate a smooth cylinder. |
| `material`     | no       | MeshLambertMaterial   | threeMaterial  | [THREE material](https://github.com/mrdoob/three.js/tree/master/src/materials) to use. Can be invoked with a text string, or a predefined material object via THREE itself.|   
| `color`     | no       | black   | color  | Tube color. Ignored if `material` is a predefined `THREE.Material` object.  |
| `opacity`     | no       | 1   | Number  | Tube opacity |                                                                                                                                                   


<br>
##Dynamic objects

<br>

###Sphere

`tb.sphere(options)`

Add a sphere to the map. Internally, calls `THREE.Mesh` with a `THREE.SphereGeometry`.


| option | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|-------|
| `radius`    | no       | 50      | number | Radius of sphere. |
| `units`    | no       | scene      | string ("scene" or "meters") | Units with which to interpret `radius`. If meters, Threebox will also rescale the object with changes in latitude, to appear to scale with objects and geography nearby.|
| sides  | no       | 8       | number | Number of width and height segments. The higher the number, the smoother the sphere. |
| color     | no       | black   | color  | Color of sphere.                                                                             
| `material`     | no       | MeshLambertMaterial   | threeMaterial  | [THREE material](https://github.com/mrdoob/three.js/tree/master/src/materials) to use. Can be invoked with a text string, or a predefined material object via THREE itself.|   

<br>

###External OBJ object

`threebox.loadObj(options, callback(obj))`

Loads an object via an external .obj and .mtl file. Note that unlike all the other object classes, this is asynchronous, and returns the object as an argument of the callback function. Internally, uses `THREE.OBJLoader` to fetch the .obj assets.


| option | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|------------|
| `obj`  | yes       | NA       | string | URL path to asset's .obj file |
| `mtl`  | yes       | NA       | string | URL path to asset's .mtl file |
| `units`    | no       | scene      | string ("scene" or "meters") | Units with which to interpret the object's vertices. If meters, Threebox will also rescale the object with changes in latitude, to appear to scale with objects and geography nearby.|
| `rotation`     | no       | 0   | rotationTransform  | Rotation of the object along the three axes, to align it to desired orientation before future rotations. Note that future rotations apply atop this transformation, and do not overwrite it. |
| `scale`     | no       | 1   | scaleTransform  | Scale of the object along the three axes, to size it appropriately before future transformations. Note that future scaling applies atop this transformation, rather than overwriting it.|
| `callback`     | yes       | NA   | function  | A function to run after the object loads. The first argument will be the successfully loaded object.
                                                   
<br>
###Object3D

`threebox.Object3D(obj)`

Add a `THREE.Object3D` instantiated elsewhere in THREE, to empower it with Threebox methods below. Unnecessary for objects instantiated with any methods above.

| option | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|------------|
| `units`    | no       | scene      | string ("scene" or "meters") | Units with which to interpret the object's vertices. If meters, Threebox will also rescale the object with changes in latitude, to appear to scale with objects and geography nearby.|



###Shared methods between dynamic objects

`obj.setCoords(lnglat)`

Positions the object at the desired coordinate, and resizes it appropriately if it was instantiated with `units: "meters"`. Can be called before adding object to the map.

`obj.set(options)`

Broad method to update object's position, rotation, and scale. Check out the Threebox Types section below for details

Options

| option | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|------------|
| `coords`    | no       | NA      | `lnglat` | Position to which to move the object |
| `rotation`    | no       | NA      | `rotationTransform` | Rotation(s) to set the object, in units of degrees |
| `scale`    | no       | NA      | `scaleTransform` | Scale(s) to set the object, where 1 is the default scale |

`obj.followPath(options(, callback) )`

Translate object along a specified path. Optional callback function to execute when animation finishes

| option | required | default | type   | description                                                                                  |
|-----------|----------|---------|--------|------------|
| `path`    | yes       | NA      | lineGeometry | Path for the object to follow |
| `duration`    | no       | 1000      | number | Duration to travel the path, in milliseconds |
| `trackHeading`    | no       | true      | boolean | Rotate the object so that it stays aligned with the direction of travel, throughout the animation |



####`obj.stop()`

Stops all of object's current animations.

####`obj.duplicate()`

Returns a clone of the object. Greatly improves performance when handling many identical objects, by reusing materials and geometries.

<br>
##Utilities

`tb.projectToWorld(lnglat)`

Calculate the corresponding `Vector3` for a given lnglat.


`tb.unprojectFromWorld(Vector3)`

Calculate the corresponding lnglat for a given `Vector3`.


`tb.queryRenderedFeatures({x: number, y: number})`

Takes an input of `xy` as an object with values representing screen coordinates (as returned by mapboxgl mouse events as `e.point`). Returns an array of threebox objects at that screen position.

<br>

## Threebox types

<b>pointGeometry</b> `[longitude, latitude(, meters altitude)]`

An array of 2-3 numbers representing longitude, latitude, and optionally altitude (in meters). When altitude is omitted, it is assumed to be 0. When populating this from a GeoJSON Point, this array can be accessed at `point.geometry.coordinates`.  

While altitude is not standardized in the GeoJSON specification, Threebox will accept it as such to position objects along the z-axis.   

<br>

####lineGeometry

`[pointGeometry, pointGeometry ... pointGeometry]`

An array of at least two lnglat's, forming a line. When populating this from a GeoJSON Linestring, this array can be accessed at `linestring.geometry.coordinates`. 

<br>
####rotationTransform

`number` or `{x: number, y: number, z: number}`

Angle(s) in degrees to rotate object. Can be expressed as either an object or number. 

The object form takes three optional parameters along the three major axes: x is parallel to the equator, y parallel to longitudinal lines, and z perpendicular to the ground plane.

The number form rotates along the z axis, and equivalent to `{z: number}`.

<br>

####scaleTransform

`number ` or `{x: number, y: number, z: number}`

Amount to scale the object, where 1 is the default size. Can be expressed as either an object or number.

The three axes are identical to those of `rotationTransform`. However, expressing as number form scales all three axes by that amount.

####threeMaterial

`string` or instance of `THREE.Material()`

Denotes the material used for an object. This can usually be customized further with `color` and `opacity` parameters in the same 


Can be expressed as a string to the corresponding material type (e.g. `"MeshPhysicalMaterial"` for `THREE.MeshPhysicalMaterial()`), or a prebuilt THREE material directly.

##Using vanilla Three.js in Threebox

Threebox implements many small affordances to make mapping run in Three.js quickly and precisely on a global scale. Whenever possible, use threebox methods to add, change, manage, and remove elements of the scene. Otherwise, here are some best practices:

- Use `threebox.Object3D` to add custom objects to the scene
- If you must interact directly with the THREE scene, add all objects to `threebox.world`.
- `tb.projectToWorld` to convert lnglat to the corresponding `Vector3()`


#Performance considerations

- Use `obj.clone()` when adding many identical objects.
