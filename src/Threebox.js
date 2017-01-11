var THREE = require("./three64.js");    // Modified version to use 64-bit double precision floats for matrix math
var ThreeboxConstants = require("./constants.js");
var sphericalmercator = require("@mapbox/sphericalmercator");
var CameraSync = require("./Camera/CameraSync.js");
var utils = require("./Utils/Utils.js");
var AnimationManager = require("./Animation/AnimationManager.js");

function Threebox(map){
    this.map = map;

    // Set up a THREE.js scene
    this.renderer = new THREE.WebGLRenderer( { alpha: true, antialias:true} );
    this.renderer.setSize( this.map.transform.width, this.map.transform.height );
    this.renderer.shadowMap.enabled = true;

    this.map._container.appendChild( this.renderer.domElement );
    this.renderer.domElement.style["position"] = "relative";
    this.renderer.domElement.style["pointer-events"] = "none";
    this.renderer.domElement.style["z-index"] = 1000;

    var _this = this;
    this.map.on("resize", function() { _this.renderer.setSize(_this.map.transform.width, _this.map.transform.height); } );


    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 28, window.innerWidth / window.innerHeight, 0.000001, 5000000000);

    // The CameraSync object will keep the Mapbox and THREE.js camera movements in sync.
    // It requires a world group to scale as we zoom in. Rotation is handled in the camera's
    // projection matrix itself (as is field of view and near/far clipping)
    // It automatically registers to listen for move events on the map so we don't need to do that here
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.cameraSynchronizer = new CameraSync(this.map, this.camera, this.world);

    this.animationManager = new AnimationManager();
    this.update();
}

Threebox.prototype = {
    update: function(timestamp) {
        // Update any animations
        this.animationManager.update(timestamp);

        // Render the scene
        this.renderer.render( this.scene, this.camera );

        // Run this again next frame
        var thisthis = this;
        requestAnimationFrame(function(timestamp) { thisthis.update(timestamp); } );
    },

    projectToWorld: function (coords){
        // coord setup
        var merc = new sphericalmercator({  size: ThreeboxConstants.WORLD_SIZE });

        var projected = merc.forward(coords);
        projected[0] *= ThreeboxConstants.PROJECTION_WORLD_SIZE;
        projected[1] *= -ThreeboxConstants.PROJECTION_WORLD_SIZE;

        
        //z dimension
        var height = coords[2] || 0;
        var pixelsPerMeter = Math.abs(ThreeboxConstants.WORLD_SIZE * Math.cos(coords[1]*Math.PI/180)/40075000 );
        projected.push( height * pixelsPerMeter );

        return projected;
    },
    projectToScreen: function(coords) {
        console.log("WARNING: Projecting to screen coordinates is not yet implemented");
    },
    unprojectFromScreen: function (pixel) {
        console.log("WARNING: unproject is not yet implemented");
    },
    unprojectFromWorld: function (pixel) {
        console.log("WARNING: unproject is not yet implemented");
    },

    addAtCoordinate: function(obj, lnglat, options) {
        /* Place the given object on the map, centered around the provided longitude and latitude
            The object's internal coordinates are assumed to be in meter-offset format, meaning
            1 unit represents 1 meter distance away from the provided coordinate.

            TODO: detect object type and actually do the meter-offset calculations for meshes
        */

        var position = this.projectToWorld(lnglat);

        console.log(position);
        obj.position.x = position[0];
        obj.position.y = position[1];
        obj.position.z = position[2];

        obj.coordinates = lnglat;

        this.world.add(obj);

        // Bestow this mesh with animation superpowers and keeps track of its mvoements in the global animation queue
        this.animationManager.enroll(obj); 

        return obj;
    },

    addGeoreferencedMesh: function(mesh, options) {
        /* Place the mesh on the map, assuming its internal (x,y) coordinates are already in (longitude, latitude) format
            TODO:
        */

    },

    remove: function(obj) {
        this.world.remove(obj);
    },

    setupDefaultLights: function() {
        this.scene.add( new THREE.AmbientLight( 0x999999 ) );

        var lights = [];
        lights[ 0 ] = new THREE.PointLight( 0x999999, 1, 0 );
        lights[ 1 ] = new THREE.PointLight( 0x999999, 1, 0 );
        lights[ 2 ] = new THREE.PointLight( 0x999999, 1, 0 );

        lights[ 0 ].position.set( 0, 200, 0 );
        lights[ 1 ].position.set( 100, 200, 100 );
        lights[ 2 ].position.set( -100, -200, -100 );

        //scene.add( lights[ 0 ] );
        this.scene.add( lights[ 1 ] );
        this.scene.add( lights[ 2 ] );
    }
}

module.exports = exports = Threebox;

