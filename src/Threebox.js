var THREE = require("./three.js");
var CameraSync = require("./Camera/CameraSync.js");
var utils = require("./Utils/Utils.js");
var AnimationManager = require("./Animation/AnimationManager.js");
var Objects = require("./Layers/objects.js");
var material = require("./Helpers/material.js");

var ThreeboxConstants = require("../src/constants.js");

function Threebox(map, glContext){

    this.init(map, glContext);

};

Threebox.prototype = {

    repaint: function(){
        this.map.repaint = true;
    },

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
        this.camera = new THREE.PerspectiveCamera( 28, window.innerWidth / window.innerHeight, 0.000000000001, Infinity);
        this.layers = [];

        // The CameraSync object will keep the Mapbox and THREE.js camera movements in sync.
        // It requires a world group to scale as we zoom in. Rotation is handled in the camera's
        // projection matrix itself (as is field of view and near/far clipping)
        // It automatically registers to listen for move events on the map so we don't need to do that here
        this.world = new THREE.Group();
        this.scene.add(this.world);

        this.cameraSync = new CameraSync(this.map, this.camera, this.world);

        // // make useful methods accessible to user
        // for (i in utils.exposedMethods){
        //     var method = utils.exposedMethods[i]
        //     this[method] = utils[method]
        // }

        //raycaster for mouse events
        this.raycaster = new THREE.Raycaster();

    },

    // Objects

    objects: new Objects(AnimationManager),

    sphere: function(o) {
        return this.objects.sphere(o)
    },

    line: function(o) {
        return this.objects.line(o)
    },

    tube: function(o) {
        return this.objects.tube(o)
    },

    Object3D: function(obj, o) {
        return this.objects.Object3D(obj, o)
    },

    loadObj: function(o, cb) {
        return this.objects.loadObj(o, cb)
    },

    // clone: function(obj) {
    //     return this.objects.clone(obj)
    // },
    
    // Material

    material: function(o){
        return material(o)
    },

    utils: utils,

    queryRenderedFeatures: function(point){

        var mouse = new THREE.Vector2();
        
        // // scale mouse pixel position to a percentage of the screen's width and height
        mouse.x = ( point.x / this.map.transform.width ) * 2 - 1;
        mouse.y = 1 - ( point.y / this.map.transform.height ) * 2;

        this.raycaster.setFromCamera(mouse, this.camera);

        // calculate objects intersecting the picking ray
        var intersects = this.raycaster.intersectObjects(this.world.children, true);

        return intersects
    },

    update: function() {
        
        if (this.map.repaint) this.map.repaint = false

        var timestamp = Date.now();

        // Update any animations
        this.objects.animationManager.update(timestamp);
        
        this.renderer.state.reset();

        // Render the scene and repaint the map
        this.renderer.render( this.scene, this.camera );

    },

    add: function(obj) {
        
        // var geoGroup = new THREE.Group();
        // geoGroup.userData.isGeoGroup = true;
        // geoGroup.add(obj);
        // this.animationManager.enroll(obj); 
        this.world.add(obj);


        // this.moveToCoordinate(obj, obj.coordinates, options);

    },

    addAtCoordinate: function(obj, lnglat, options) {
        
        console.warn('addAtCoordinate() has been deprecated. Check out the Threebox Object3D() method instead.')
        
        obj = this.Object3D(obj);

        obj.setCoords(lnglat, options)
            .add();

        return obj;
    },

    moveToCoordinate: function(obj, lnglat, options) {

        if (!obj.setCoords) obj = this.Object3D(obj);
        obj.setCoords(lnglat, options);

        return obj;
    },

    addGeoreferencedMesh: function(mesh, options) {
        /* Place the mesh on the map, assuming its internal (x,y) coordinates are already in (longitude, latitude) format
            TODO: write this
        */

    },

    remove: function(obj) {

        console.warn('remove(obj) has been moved inside the object. In the future, call obj.remove() instead')

        if (!obj.remove) obj = this.Object3D(obj);

        obj.remove();
        
    },

    setupDefaultLights: function() {
        this.scene.add( new THREE.AmbientLight( 0xCCCCCC ) );

        var sunlight = new THREE.DirectionalLight(0xffffff, 0.5);
        sunlight.position.set(0,800,1000);
        // sunlight.matrixWorldNeedsUpdate = true;
        this.world.add(sunlight);
    },

    memory: function (){ return this.renderer.info.memory}
}

module.exports = exports = Threebox;

