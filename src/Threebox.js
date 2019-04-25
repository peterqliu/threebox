var THREE = require("./three.js");
var CameraSync = require("./camera/CameraSync.js");
var utils = require("./utils/utils.js");
var AnimationManager = require("./animation/AnimationManager.js");
var ThreeboxConstants = require("./utils/constants.js");

var Objects = require("./objects/objects.js");
var material = require("./utils/material.js");
var sphere = require("./objects/sphere.js");
var loadObj = require("./objects/loadObj.js");
var Object3D = require("./objects/Object3D.js");
var line = require("./objects/line.js");
var tube = require("./objects/tube.js");

function Threebox(map, glContext, options){

    this.init(map, glContext, options);

};

Threebox.prototype = {

    repaint: function(){
        this.map.repaint = true;
    },

    init: function (map, glContext, options){

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

        // The CameraSync object will keep the Mapbox and THREE.js camera movements in sync.
        // It requires a world group to scale as we zoom in. Rotation is handled in the camera's
        // projection matrix itself (as is field of view and near/far clipping)
        // It automatically registers to listen for move events on the map so we don't need to do that here
        this.world = new THREE.Group();
        this.scene.add(this.world);

        this.cameraSync = new CameraSync(this.map, this.camera, this.world);

        //raycaster for mouse events
        this.raycaster = new THREE.Raycaster();

        // apply starter options
        
        this.options = utils._validate(options || {}, defaultOptions);
        if (this.options.defaultLights) this.defaultLights();
        
    },

    // Objects

    objects: new Objects(AnimationManager),

    sphere: sphere,

    line: line,

    tube: function(obj){
        return tube(obj, this.world)
    },

    Object3D: function(obj, o) {
        return Object3D(obj, o)
    },

    loadObj: loadObj,


    // Material

    material: function(o){
        return material(o)
    },

    utils: utils,

    projectToWorld: function(coords) {
        return this.utils.projectToWorld(coords)
    },

    unprojectFromWorld: function(v3) {
        return this.utils.unprojectFromWorld(v3)
    },

    projectedUnitsPerMeter: function(lat) {
        return this.utils.projectedUnitsPerMeter(lat)
    },

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

        if (this.options.passiveRendering === false) this.map.triggerRepaint();
    },

    add: function(obj) {
        this.world.add(obj);
    },

    remove: function(obj) {
        this.world.remove(obj);
    },


    defaultLights: function(){

        this.scene.add( new THREE.AmbientLight( 0xffffff ) );
        var sunlight = new THREE.DirectionalLight(0xffffff, 0.25);
        sunlight.position.set(0,80000000,100000000);
        sunlight.matrixWorldNeedsUpdate = true;
        this.world.add(sunlight);

    },

    memory: function (){ return this.renderer.info.memory},

    version: '0.3.0',

    // DEPRECATED METHODS

    setupDefaultLights: function() {
        console.warn('.setupDefaultLights() has been moved to a "defaultLights" option inside Threebox()')
        this.defaultLights();
    },

    addAtCoordinate: function(obj, lnglat, options) {
        
        console.warn('addAtCoordinate() has been deprecated. Check out the and threebox.add() Object.setCoords() methods instead.')
        
        obj = this.Object3D({obj:obj});

        obj.setCoords(lnglat)
        this.add(obj);

        return obj;
    },

    moveToCoordinate: function(obj, lnglat, options) {
        console.warn('addAtCoordinate() has been deprecated. Check out the Object.setCoords() and threebox.add() methods instead.')

        if (!obj.setCoords) obj = this.Object3D(obj);
        obj.setCoords(lnglat, options);

        return obj;
    }
}

var defaultOptions = {
    defaultLights: false,
    passiveRendering: true
}
module.exports = exports = Threebox;

