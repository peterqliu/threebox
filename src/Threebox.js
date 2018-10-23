var THREE = require("./three94.js");
var CameraSync = require("./Camera/CameraSync.js");
var utils = require("./Utils/Utils.js");
var AnimationManager = require("./Animation/AnimationManager.js");
var SymbolLayer3D = require("./Layers/SymbolLayer3D.js");
var ThreeboxConstants = require("../src/constants.js");


function Threebox(map, glContext){

    this.init(map, glContext);

}

Threebox.prototype = {

    init: function (map, glContext){

        this.map = map;

        // Set up a THREE.js scene
        this.renderer = new THREE.WebGLRenderer( { 
            alpha: true, 
            antialias: true,
            canvas: map.getCanvas(),
            context: glContext
        } );

        this.renderer.shadowMap.enabled = true;
        this.renderer.autoClear = false;


        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 28, window.innerWidth / window.innerHeight, 0.000001, 5000000000);
        this.layers = [];

        // The CameraSync object will keep the Mapbox and THREE.js camera movements in sync.
        // It requires a world group to scale as we zoom in. Rotation is handled in the camera's
        // projection matrix itself (as is field of view and near/far clipping)
        // It automatically registers to listen for move events on the map so we don't need to do that here
        this.world = new THREE.Group();
        this.scene.add(this.world);
        this.cameraSynchronizer = new CameraSync(this.map, this.camera, this.world);


        //raycaster for mouse events

        this.raycaster = new THREE.Raycaster();
        this.animationManager = new AnimationManager();
    },

    queryRenderedFeatures: function(point){

        var mouse = new THREE.Vector2();
        
        // // scale mouse pixel position to a percentage of the screen's width and height
        mouse.x = ( point.x / this.map.transform.width ) * 2 - 1;
        mouse.y = -( ( point.y) / this.map.transform.height ) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.camera);

        // calculate objects intersecting the picking ray
        var intersects = this.raycaster.intersectObjects(this.world.children, true);

        return intersects
    },

    update: function(triggeredByMap) {
        
        var timestamp = Date.now();

        // Update any animations
        this.animationManager.update(timestamp);
        

        this.renderer.state.reset();

        // Render the scene and repaint the map
        this.renderer.render( this.scene, this.camera );

        if (!triggeredByMap) this.map.triggerRepaint()

        // var self = this;

        // requestAnimationFrame(function(ts){self.update(ts, true)})

    },

    projectToWorld: function (coords){

        // Spherical mercator forward projection, re-scaling to WORLD_SIZE
        var projected = [
            -ThreeboxConstants.MERCATOR_A * coords[0] * ThreeboxConstants.DEG2RAD * ThreeboxConstants.PROJECTION_WORLD_SIZE,
            -ThreeboxConstants.MERCATOR_A * Math.log(Math.tan((Math.PI*0.25) + (0.5 * coords[1] * ThreeboxConstants.DEG2RAD))) * ThreeboxConstants.PROJECTION_WORLD_SIZE
        ];
     
        var pixelsPerMeter = this.projectedUnitsPerMeter(coords[1]);

        //z dimension
        var height = coords[2] || 0;
        projected.push( height * pixelsPerMeter );

        var result = new THREE.Vector3(projected[0], projected[1], projected[2]);

        return result;
    },

    projectedUnitsPerMeter: function(latitude) {
        return Math.abs(ThreeboxConstants.WORLD_SIZE * (1 / Math.cos(latitude*Math.PI/180))/ThreeboxConstants.EARTH_CIRCUMFERENCE);
    },

    _scaleVerticesToMeters: function(centerLatLng, vertices) {
        var pixelsPerMeter = this.projectedUnitsPerMeter(centerLatLng[1]);
        var centerProjected = this.projectToWorld(centerLatLng);

        for (var i = 0; i < vertices.length; i++) {
            vertices[i].multiplyScalar(pixelsPerMeter);
        }

        return vertices;
    },

    projectToScreen: function(coords) {
        console.log("WARNING: Projecting to screen coordinates is not yet implemented");
    },

    unprojectFromScreen: function (pixel) {
        console.log("WARNING: unproject is not yet implemented");
    },

    unprojectFromWorld: function (pixel) {

        var unprojected = [
            -pixel.x / (ThreeboxConstants.MERCATOR_A * ThreeboxConstants.DEG2RAD * ThreeboxConstants.PROJECTION_WORLD_SIZE),
            2*(Math.atan(Math.exp(pixel.y/(ThreeboxConstants.PROJECTION_WORLD_SIZE*(-ThreeboxConstants.MERCATOR_A))))-Math.PI/4)/ThreeboxConstants.DEG2RAD
        ];

        var pixelsPerMeter = this.projectedUnitsPerMeter(unprojected[1]);

        //z dimension
        var height = pixel.z || 0;
        unprojected.push( height / pixelsPerMeter );

        return unprojected;
    },

    _flipMaterialSides: function(obj) {

    },

    addAtCoordinate: function(obj, lnglat, options) {
        
        var geoGroup = new THREE.Group();
        geoGroup.userData.isGeoGroup = true;
        geoGroup.add(obj);

        this._flipMaterialSides(obj);
        this.world.add(geoGroup);
        this.moveToCoordinate(obj, lnglat, options);

        // Bestow this mesh with animation superpowers and keeps track of its movements in the global animation queue
        this.animationManager.enroll(obj); 

        this.update();

        return obj;
    },
    moveToCoordinate: function(obj, lnglat, options) {

        this.update();

        /** Place the given object on the map, centered around the provided longitude and latitude
            The object's internal coordinates are assumed to be in meter-offset format, meaning
            1 unit represents 1 meter distance away from the provided coordinate.
        */

        if (options === undefined) options = {};
        if(options.preScale === undefined) options.preScale = 1.0;
        if(options.scaleToLatitude === undefined || obj.userData.scaleToLatitude) options.scaleToLatitude = true;

        obj.userData.scaleToLatitude = options.scaleToLatitude;

        if (typeof options.preScale === 'number') options.preScale = new THREE.Vector3(options.preScale, options.preScale, options.preScale);
        else if(options.preScale.constructor === Array && options.preScale.length === 3) options.preScale = new THREE.Vector3(options.preScale[0], options.preScale[1], options.preScale[2]);
        else if(options.preScale.constructor !== THREE.Vector3) {
            console.warn("Invalid preScale value: number, Array with length 3, or THREE.Vector3 expected. Defaulting to [1,1,1]");
            options.preScale = new THREE.Vector3(1,1,1);
        }

        var scale = options.preScale;

        // Figure out if this object is a geoGroup and should be positioned and scaled directly, or if its parent
        var geoGroup;
        if (obj.userData.isGeoGroup) geoGroup = obj;
        else if (obj.parent && obj.parent.userData.isGeoGroup) geoGroup = obj.parent;
        else return console.error("Cannot set geographic coordinates of object that does not have an associated GeoGroup. Object must be added to scene with 'addAtCoordinate()'.")

        if(options.scaleToLatitude) {
            // Scale the model so that its units are interpreted as meters at the given latitude
            var pixelsPerMeter = this.projectedUnitsPerMeter(lnglat[1]);
            scale.multiplyScalar(pixelsPerMeter);
        }

        geoGroup.scale.copy(scale);

        geoGroup.position.copy(this.projectToWorld(lnglat));
        obj.coordinates = lnglat;

        return obj;
    },

    addGeoreferencedMesh: function(mesh, options) {
        /* Place the mesh on the map, assuming its internal (x,y) coordinates are already in (longitude, latitude) format
            TODO: write this
        */

    },

    addSymbolLayer: function(options) {
        const layer = new SymbolLayer3D(this, options);
        //this.layers.push(layer);

        //return layer;
    },

    getDataLayer: function(id) {
        for(var i = 0; i < this.layers.length; i++) {
            if (this.layer.id === id) return layer;
        }
    },

    remove: function(obj) {
        this.world.remove(obj);
    },

    setupDefaultLights: function() {
        this.scene.add( new THREE.AmbientLight( 0xCCCCCC ) );

        var sunlight = new THREE.DirectionalLight(0xffffff, 0.5);
        sunlight.position.set(0,800,1000);
        sunlight.matrixWorldNeedsUpdate = true;
        this.world.add(sunlight);
        //this.world.add(sunlight.target);

        // var lights = [];
        // lights[ 0 ] = new THREE.PointLight( 0x999999, 1, 0 );
        // lights[ 1 ] = new THREE.PointLight( 0x999999, 1, 0 );
        // lights[ 2 ] = new THREE.PointLight( 0x999999, 0.2, 0 );

        // lights[ 0 ].position.set( 0, 200, 1000 );
        // lights[ 1 ].position.set( 100, 200, 1000 );
        // lights[ 2 ].position.set( -100, -200, 0 );

        // //scene.add( lights[ 0 ] );
        // this.scene.add( lights[ 1 ] );
        // this.scene.add( lights[ 2 ] );
        
    }
}

module.exports = exports = Threebox;

