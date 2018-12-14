var THREE = require("./three.js");
var CameraSync = require("./Camera/CameraSync.js");
var utils = require("./Utils/Utils.js");
var AnimationManager = require("./Animation/AnimationManager.js");
var SymbolLayer3D = require("./Layers/SymbolLayer3D.js");
var Objects = require("./Layers/objects.js");
var ThreeboxConstants = require("../src/constants.js");

function Threebox(map, glContext){

    this.init(map, glContext);

}

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
        this.camera = new THREE.PerspectiveCamera( 28, window.innerWidth / window.innerHeight, 0.00000000000000001, 5000000000000000);
        this.layers = [];

        // The CameraSync object will keep the Mapbox and THREE.js camera movements in sync.
        // It requires a world group to scale as we zoom in. Rotation is handled in the camera's
        // projection matrix itself (as is field of view and near/far clipping)
        // It automatically registers to listen for move events on the map so we don't need to do that here
        this.world = new THREE.Group();
        this.scene.add(this.world);

        this.cameraSync = new CameraSync(this.map, this.camera, this.world);

        // make useful methods accessible to user
        for (i in utils.exposedMethods){
            var method = utils.exposedMethods[i]
            this[method] = utils[method]
        }

        //raycaster for mouse events

        this.raycaster = new THREE.Raycaster();


        this.objects = new Objects(this.map, new AnimationManager(this.map));
        
        var scope = this;
        Object.keys(this.objects['__proto__'])
            // .filter(function(key){return !key.includes('_')})
            .forEach(function(key){
                scope[key] = scope.objects['__proto__'][key]
            })
        // this.animationManager = new AnimationManager(map);


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

    update: function() {
        
        if (this.map.repaint) this.map.repaint = false

        var timestamp = Date.now();
        // Update any animations
        this.objects.animationManager.update(timestamp);
        
        this.renderer.state.reset();

        // Render the scene and repaint the map
        this.renderer.render( this.scene, this.camera );

        

    },


    add: function(obj, options) {
        
        var geoGroup = new THREE.Group();
        geoGroup.userData.isGeoGroup = true;
        geoGroup.add(obj);
        this.animationManager.enroll(obj); 
        this.world.add(geoGroup);


        this.moveToCoordinate(obj, obj.coordinates, options);

    },

    addAtCoordinate: function(obj, lnglat, options) {
        
        console.warn('addAtCoordinate() has been deprecated. Check out the Threebox Object3D() method instead.')
        
        obj = this.Object3D(obj);

        obj.setCoords(lnglat, options)
            .add();

        return obj;
    },

    moveToCoordinate: function(obj, lnglat, options) {

        if (!obj.setCoords) obj = this.Object3D(obj)

        obj.setCoords(lnglat, options)

        return obj;
    },

    addGeoreferencedMesh: function(mesh, options) {
        /* Place the mesh on the map, assuming its internal (x,y) coordinates are already in (longitude, latitude) format
            TODO: write this
        */

    },

    addSymbolLayer: function(options) {
        const layer = new SymbolLayer3D(this, options);
        this.layers.push(layer);

        return layer;
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

        
    }
}

module.exports = exports = Threebox;

