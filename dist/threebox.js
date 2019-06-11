(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
window.Threebox = require('./src/Threebox.js'),
window.THREE = require('./src/three.js')

},{"./src/Threebox.js":2,"./src/three.js":16}],2:[function(require,module,exports){
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


},{"./animation/AnimationManager.js":6,"./camera/CameraSync.js":7,"./objects/Object3D.js":8,"./objects/line.js":9,"./objects/loadObj.js":10,"./objects/objects.js":13,"./objects/sphere.js":14,"./objects/tube.js":15,"./three.js":16,"./utils/constants.js":17,"./utils/material.js":18,"./utils/utils.js":19}],3:[function(require,module,exports){
var THREE = require("../three.js");
var Constants = require("./constants.js");
var validate = require("./validate.js");

var utils = {

    prettyPrintMatrix: function(uglymatrix){
        for (var s=0; s<4; s++){
            var quartet=[uglymatrix[s],
            uglymatrix[s+4],
            uglymatrix[s+8],
            uglymatrix[s+12]];
            console.log(quartet.map(function(num){return num.toFixed(4)}))
        }
    },

    makePerspectiveMatrix: function(fovy, aspect, near, far) {

        var out = new THREE.Matrix4();
        var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);

        var newMatrix = [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ]

        out.elements = newMatrix
        return out;
    },

    //gimme radians
    radify: function(deg){

        function convert(degrees){
            degrees = degrees || 0;
            return Math.PI*2*degrees/360
        }

        if (typeof deg === 'object'){

            //if [x,y,z] array of rotations
            if (deg.length > 0){
                return deg.map(function(degree){
                    return convert(degree)
                })
            }

            // if {x: y: z:} rotation object
            else {
                return [convert(deg.x), convert(deg.y), convert(deg.z)]
            }
        }

        //if just a number
        else return convert(deg)
    },

    //gimme degrees
    degreeify: function(rad){
        function convert(radians){
            radians = radians || 0;
            return radians * 360/(Math.PI*2)
        }

        if (typeof rad === 'object') {
            return [convert(rad.x), convert(rad.y), convert(rad.z)]
        }

        else return convert(rad)
    },

    projectToWorld: function(coords){

        // Spherical mercator forward projection, re-scaling to WORLD_SIZE

        var projected = [
            -Constants.MERCATOR_A * Constants.DEG2RAD* coords[0] * Constants.PROJECTION_WORLD_SIZE,
            -Constants.MERCATOR_A * Math.log(Math.tan((Math.PI*0.25) + (0.5 * Constants.DEG2RAD * coords[1]) )) * Constants.PROJECTION_WORLD_SIZE
        ];
     
        //z dimension, defaulting to 0 if not provided

        if (!coords[2]) projected.push(0)
        else {
            var pixelsPerMeter = this.projectedUnitsPerMeter(coords[1]);
            projected.push( coords[2] * pixelsPerMeter );
        }

        var result = new THREE.Vector3(projected[0], projected[1], projected[2]);

        return result;
    },

    projectedUnitsPerMeter: function(latitude) {
        return Math.abs( Constants.WORLD_SIZE / Math.cos( Constants.DEG2RAD * latitude ) / Constants.EARTH_CIRCUMFERENCE );
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

    //world units to lnglat
    unprojectFromWorld: function (worldUnits) {

        var unprojected = [
            -worldUnits.x / (Constants.MERCATOR_A * Constants.DEG2RAD * Constants.PROJECTION_WORLD_SIZE),
            2*(Math.atan(Math.exp(worldUnits.y/(Constants.PROJECTION_WORLD_SIZE*(-Constants.MERCATOR_A))))-Math.PI/4)/Constants.DEG2RAD
        ];

        var pixelsPerMeter = this.projectedUnitsPerMeter(unprojected[1]);

        //z dimension
        var height = worldUnits.z || 0;
        unprojected.push( height / pixelsPerMeter );

        return unprojected;
    },

    _flipMaterialSides: function(obj) {

    },

    // to improve precision, normalize a series of vector3's to their collective center, and move the resultant mesh to that center
    normalizeVertices(vertices) {

        var geometry = new THREE.Geometry();

        for (v3 of vertices) {
            geometry.vertices.push(v3)
        }

        geometry.computeBoundingSphere();
        var center = geometry.boundingSphere.center;
        var radius = geometry.boundingSphere.radius;

        var scaled = vertices.map(function(v3){
            var normalized = v3.sub(center);
            return normalized;
        });

        return {vertices: scaled, position: center}
    },

    //flatten an array of Vector3's into a shallow array of values in x-y-z order, for bufferGeometry
    flattenVectors(vectors) {
        var flattenedArray = [];
        for (vertex of vectors) {
            flattenedArray.push(vertex.x, vertex.y, vertex.z);
        }
        return flattenedArray
    },

    //convert a line/polygon to Vector3's

    lnglatsToWorld: function(coords){

        var vector3 = coords.map(
            function(pt){
                var p = utils.projectToWorld(pt);
                var v3 = new THREE.Vector3(p.x, p.y, p.z);
                return v3
            }
        );

        return vector3
    },

    extend: function(original, addition) {
        for (key in addition) original[key] = addition[key];
    },

    clone: function(original) {
        var clone = {};
        for (key in original) clone[key] = original[key];
        return clone;
    },
    
    // retrieve object parameters from an options object

    types: {

        rotation: function(r, currentRotation){

            // if number provided, rotate only in Z by that amount
            if (typeof r === 'number') r = {z:r};

            var degrees = this.applyDefault([r.x, r.y, r.z], currentRotation);
            var radians = utils.radify(degrees);
            return radians;
            
        },

        scale: function(s, currentScale){
            if (typeof s === 'number') return s = [s,s,s]; 
            else return this.applyDefault([s.x, s.y, s.z], currentScale);
        },

        applyDefault: function(array, current){

            var output = array.map(function(item, index){
                item = item || current[index];
                return item
            })

            return output
        }
    },

    _validate: function(userInputs, defaults){
        
        userInputs = userInputs || {};
        var validatedOutput = {};
        utils.extend(validatedOutput, userInputs);

        for (key of Object.keys(defaults)){

            if (userInputs[key] === undefined) {
                //make sure required params are present
                if (defaults[key] === null) {
                    console.error(key + ' is required')
                    return;
                }
    
                else validatedOutput[key] = defaults[key]

            }

            else validatedOutput[key] = userInputs[key]
        }

        return validatedOutput
    },
    Validator: new validate(),
    exposedMethods: ['projectToWorld', 'projectedUnitsPerMeter', 'extend', 'unprojectFromWorld']
}

module.exports = exports = utils
},{"../three.js":16,"./constants.js":4,"./validate.js":5}],4:[function(require,module,exports){
const WORLD_SIZE = 1024000;
const MERCATOR_A = 6378137.0;

module.exports = exports = {
    WORLD_SIZE: WORLD_SIZE,
    PROJECTION_WORLD_SIZE: WORLD_SIZE / (MERCATOR_A * Math.PI * 2),
    MERCATOR_A: MERCATOR_A, // 900913 projection property
    DEG2RAD: Math.PI / 180,
    RAD2DEG: 180 / Math.PI,
    EARTH_CIRCUMFERENCE: 40075000, // In meters
}
},{}],5:[function(require,module,exports){
// Type validator

function Validate(){

};

Validate.prototype = {

    Coords: function(input) {

        if (input.constructor !== Array) {
            console.error("Coords must be an array")
            return
        }

        if (input.length < 2) {
            console.error("Coords length must be at least 2")
            return
        }
    
        for (member of input) {
            if (member.constructor !== Number) {
                console.error("Coords values must be numbers")
                return
            }
        }

        if (Math.abs(input[1]) > 90) {
            console.error("Latitude must be between -90 and 90")
            return                    
        }

        return input
    },

    Line: function(input) {

        var scope = this;

        if (input.constructor !== Array) {
            console.error("Line must be an array")
            return
        }

        for (coord of input){
            if (!scope.Coords(coord)) {
                console.error("Each coordinate in a line must be a valid Coords type")
                return                    
            }

        }

        return input
    },

    Rotation: function(input) {

        if (input.constructor === Number) input = {z: input}

        else if (input.constructor === Object) {

            for (key of Object.keys(input)){

                if (!['x', 'y', 'z'].includes(key)) {
                    console.error('Rotation parameters must be x, y, or z')
                    return                            
                }
                if (input[key].constructor !== Number) {
                    console.error('Individual rotation values must be numbers')
                    return
                }
            }
        }

        else {
            console.error('Rotation must be an object or a number')
            return
        }

        return input
    },

    Scale: function(input) {

        if (input.constructor === Number) {
            input = {x:input, y:input, z: input}
        }
        
        else if (input.constructor === Object) {

            for (key of Object.keys(input)){

                if (!['x', 'y', 'z'].includes(key)) {
                    console.error('Scale parameters must be x, y, or z')
                    return                            
                }
                if (input[key].constructor !== Number) {
                    console.error('Individual scale values must be numbers')
                    return
                }
            }
        }

        else {
            console.error('Scale must be an object or a number')
            return
        }

        return input
    }

}


module.exports = exports = Validate;
},{}],6:[function(require,module,exports){
var threebox = require('../Threebox.js');
var utils = require("../utils/utils.js");
var validate = require("../utils/validate.js");

function AnimationManager(map) {

    this.map = map
    this.enrolledObjects = [];    
    this.previousFrameTime;

};

AnimationManager.prototype = {

    enroll: function(obj) {

        /* Extend the provided object with animation-specific properties and track in the animation manager */

        this.enrolledObjects.push(obj);

        // Give this object its own internal animation queue
        obj.animationQueue = [];

        obj.set = function(options) {

            //if duration is set, animate to the new state
            if (options.duration > 0 ){

                var newParams = {
                    start: Date.now(),
                    expiration: Date.now() + options.duration,
                    endState: {}
                }

                utils.extend(options, newParams);

                var translating = options.coords;
                var rotating = options.rotation;
                var scaling = options.scale || options.scaleX || options.scaleY || options.scaleZ;

                if (rotating) {
                    
                    var r = obj.rotation;
                    options.startRotation = [r.x, r.y, r.z];


                    options.endState.rotation = utils.types.rotation(options.rotation, options.startRotation);
                    options.rotationPerMs = options.endState.rotation
                        .map(function(angle, index){
                            return (angle-options.startRotation[index])/options.duration;
                        })
                }

                if (scaling) {
                    var s = obj.scale;
                    options.startScale = [s.x, s.y, s.z];
                    options.endState.scale = utils.types.scale(options.scale, options.startScale);

                    options.scalePerMs = options.endState.scale
                        .map(function(scale, index){
                            return (scale-options.startScale[index])/options.duration;
                        })                    
                }

                if (translating) options.pathCurve = new THREE.CatmullRomCurve3(utils.lnglatsToWorld([obj.coordinates, options.coords]));

                var entry = {
                    type:'set',
                    parameters: options
                }

                this.animationQueue
                    .push(entry);

                map.repaint = true;   
            }

            //if no duration set, stop object's existing animations and go to that state immediately
            else {
                this.stop();
                options.rotation = utils.radify(options.rotation);
                this._setObject(options);
            }

            return this

        };

        obj.stop = function(){
            this.animationQueue = [];
            return this;
        }

        obj.followPath = function (options, cb){

            var entry = {
                type: 'followPath', 
                parameters: utils._validate(options, defaults.followPath)
            };
                     
            utils.extend(
                entry.parameters, 
                {
                    pathCurve: new THREE.CatmullRomCurve3(
                        utils.lnglatsToWorld(options.path)
                    ),
                    start: Date.now(),
                    expiration: Date.now() + entry.parameters.duration,
                    cb: cb
                }
            );    

            this.animationQueue
                .push(entry);

            map.repaint = true;
            
            return this;
        };

        obj._setObject = function (options){

            var p = options.position; // lnglat
            var r = options.rotation; // radians
            var s = options.scale; // 
            var w = options.worldCoordinates; //Vector3
            var q = options.quaternion // [axis, angle]

            if (p) {
                this.coordinates = p;
                var c = utils.projectToWorld(p);
                this.position.copy(c)
            }

            if (r) this.rotation.set(r[0], r[1], r[2]);
            
            if (s) this.scale.set(s[0], s[1], s[2]);
            
            if (q) this.quaternion.setFromAxisAngle(q[0], q[1]);
            
            if (w) this.position.copy(w);

            map.repaint = true
        }
    },

    update: function(now) {

        if (this.previousFrameTime === undefined) this.previousFrameTime = now;

        var dimensions = ['X','Y','Z'];

        //iterate through objects in queue. count in reverse so we can cull objects without frame shifting
        for (var a = this.enrolledObjects.length-1; a>=0; a--){   

            var object = this.enrolledObjects[a];

            if(!object.animationQueue || object.animationQueue.length === 0) continue;

            //focus on first item in queue
            var item = object.animationQueue[0];
            var options = item.parameters;

            // if an animation is past its expiration date, cull it
            if (!options.expiration) {
                // console.log('culled')

                object.animationQueue.splice(0,1);

                // set the start time of the next animation
                if (object.animationQueue[0]) object.animationQueue[0].parameters.start = now;

                return
            }

            //if finished, jump to end state and flag animation entry for removal next time around. Execute callback if there is one
            var expiring = now >= options.expiration;

            if (expiring) {
                options.expiration = false;
                if (options.endState) object._setObject(options.endState);
                options.cb();
            }

            else {

                var timeProgress = (now - options.start) / options.duration;

                if (item.type === 'set'){

                    var objectState = {};

                    if (options.pathCurve) objectState.worldCoordinates = options.pathCurve.getPoint(timeProgress);

                    if (options.rotationPerMs) {
                        objectState.rotation = options.startRotation.map(function(rad, index){
                            return rad + options.rotationPerMs[index] * timeProgress * options.duration
                        })
                    }

                    if (options.scalePerMs) {
                        objectState.scale = options.startScale.map(function(scale, index){
                            return scale + options.scalePerMs[index]*timeProgress * options.duration
                        })
                    }

                    object._setObject(objectState);
                }

                if (item.type === 'followPath'){

                    var position = options.pathCurve.getPointAt(timeProgress);
                    objectState = {worldCoordinates: position};

                    // if we need to track heading
                    if (options.trackHeading){

                        var tangent = options.pathCurve
                        .getTangentAt(timeProgress)
                            .normalize();

                        var axis = new THREE.Vector3(0,0,0);
                        var up = new THREE.Vector3(0,1,0);

                        axis
                            .crossVectors(up, tangent)
                            .normalize();

                        var radians = Math.acos(up.dot(tangent));

                        objectState.quaternion = [axis, radians];

                    }

                    object._setObject(objectState);

                }
            }

        }

        this.previousFrameTime = now;
    }
}

const defaults = {
    followPath: {
        path: null,
        duration: 1000,
        trackHeading: true
    }
}
module.exports = exports = AnimationManager;
},{"../Threebox.js":2,"../utils/utils.js":19,"../utils/validate.js":20}],7:[function(require,module,exports){
var THREE = require("../three.js");
var utils = require("../utils/utils.js");
var ThreeboxConstants = require("../utils/constants.js");

function CameraSync(map, camera, world) {

    this.map = map;
    this.camera = camera;
    this.active = true;

    this.camera.matrixAutoUpdate = false;   // We're in charge of the camera now!

    // Postion and configure the world group so we can scale it appropriately when the camera zooms
    this.world = world || new THREE.Group();
    this.world.position.x = this.world.position.y = ThreeboxConstants.WORLD_SIZE/2
    this.world.matrixAutoUpdate = false;


    //set up basic camera state

    this.state = {
        fov: 0.6435011087932844,
        translateCenter: new THREE.Matrix4,
        worldSizeRatio: 512/ThreeboxConstants.WORLD_SIZE
    };

    this.state.translateCenter.makeTranslation(ThreeboxConstants.WORLD_SIZE/2, -ThreeboxConstants.WORLD_SIZE / 2, 0);

    // Listen for move events from the map and update the Three.js camera. Some attributes only change when viewport resizes, so update those accordingly
    var _this = this;

    this.map
        .on('move', function() {
            _this.updateCamera()
        })
        .on('resize', function(){
            _this.setupCamera();
        })


    this.setupCamera();
}

CameraSync.prototype = {

    setupCamera: function() {

        var t = this.map.transform
        const halfFov = this.state.fov / 2;
        var cameraToCenterDistance = 0.5 / Math.tan(halfFov) * t.height;
        const groundAngle = Math.PI / 2 + t._pitch;

        this.state.cameraToCenterDistance = cameraToCenterDistance;
        this.state.cameraTranslateZ = new THREE.Matrix4().makeTranslation(0,0,cameraToCenterDistance);
        this.state.topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);
    
        this.updateCamera();
    },

    updateCamera: function(ev) {

        if(!this.camera) {
            console.log('nocamera')
            return;
        }

        var t = this.map.transform

        // Calculate z distance of the farthest fragment that should be rendered.
        const furthestDistance = Math.cos(Math.PI / 2 - t._pitch) * this.state.topHalfSurfaceDistance + this.state.cameraToCenterDistance;

        // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
        const farZ = furthestDistance * 1.01;

        this.camera.projectionMatrix = utils.makePerspectiveMatrix(this.state.fov, t.width / t.height, 1, farZ);
        

        var cameraWorldMatrix = new THREE.Matrix4();
        var cameraTranslateZ = new THREE.Matrix4().makeTranslation(0,0,this.state.cameraToCenterDistance);
        var rotatePitch = new THREE.Matrix4().makeRotationX(t._pitch);
        var rotateBearing = new THREE.Matrix4().makeRotationZ(t.angle);

        // Unlike the Mapbox GL JS camera, separate camera translation and rotation out into its world matrix
        // If this is applied directly to the projection matrix, it will work OK but break raycasting

        cameraWorldMatrix
            .premultiply(this.state.cameraTranslateZ)
            .premultiply(rotatePitch)
            .premultiply(rotateBearing)   

        this.camera.matrixWorld.copy(cameraWorldMatrix);


        var zoomPow = t.scale * this.state.worldSizeRatio; 

        // Handle scaling and translation of objects in the map in the world's matrix transform, not the camera
        var scale = new THREE.Matrix4;
        var translateCenter = new THREE.Matrix4;
        var translateMap = new THREE.Matrix4;
        var rotateMap = new THREE.Matrix4;

        scale
            .makeScale( zoomPow, zoomPow , zoomPow );
    
        
        var x = -this.map.transform.x || -this.map.transform.point.x;
        var y = this.map.transform.y || this.map.transform.point.y;

        translateMap
            .makeTranslation(x, y, 0);
        
        rotateMap
            .makeRotationZ(Math.PI);

        this.world.matrix = new THREE.Matrix4;
        this.world.matrix
            .premultiply(rotateMap)
            .premultiply(this.state.translateCenter)
            .premultiply(scale)
            .premultiply(translateMap)


        // utils.prettyPrintMatrix(this.camera.projectionMatrix.elements);
    }
}

module.exports = exports = CameraSync;

},{"../three.js":16,"../utils/constants.js":17,"../utils/utils.js":19}],8:[function(require,module,exports){
var Objects = require('./objects.js');
var utils = require("../utils/utils.js");

function Object3D(options) {
	options = utils._validate(options,  Objects.prototype._defaults.Object3D);

	var obj = options.obj;

	if (options.units === 'meters') obj = Objects.prototype._makeGroup(options.obj, options);

	obj = Objects.prototype._addMethods(obj);
	return obj
}


module.exports = exports = Object3D;
},{"../utils/utils.js":19,"./objects.js":13}],9:[function(require,module,exports){
var THREE = require("../three.js");
var utils = require("../utils/utils.js");
var Objects = require('./objects.js');

function line(obj){

	obj = utils._validate(obj, Objects.prototype._defaults.line);

	// Geometry
    var straightProject = utils.lnglatsToWorld(obj.geometry);
	var normalized = utils.normalizeVertices(straightProject);
    var flattenedArray = utils.flattenVectors(normalized.vertices);
	console.log('line', normalized.vertices)

	var geometry = new THREE.LineGeometry();
	geometry.setPositions( flattenedArray );
	// geometry.setColors( colors );

	// Material
	matLine = new THREE.LineMaterial( {
		color: obj.color,
		linewidth: obj.width, // in pixels
		dashed: false,
		opacity: obj.opacity
	} );
	
	matLine.resolution.set( window.innerWidth, window.innerHeight );
	matLine.isMaterial = true;
	matLine.transparent = true;
	matLine.depthWrite = false;

	// Mesh
	line = new THREE.Line2( geometry, matLine );
	line.position.copy(normalized.position)
	line.computeLineDistances();

	return line
}

module.exports = exports = line;



/**
 * custom line shader by WestLangley, sourced from https://github.com/mrdoob/three.js/tree/master/examples/js/lines
 *
 */

THREE.LineSegmentsGeometry = function () {

	THREE.InstancedBufferGeometry.call( this );

	this.type = 'LineSegmentsGeometry';

	var plane = new THREE.BufferGeometry();

	var positions = [ - 1, 2, 0, 1, 2, 0, - 1, 1, 0, 1, 1, 0, - 1, 0, 0, 1, 0, 0, - 1, - 1, 0, 1, - 1, 0 ];
	var uvs = [ 0, 1, 1, 1, 0, .5, 1, .5, 0, .5, 1, .5, 0, 0, 1, 0 ];
	var index = [ 0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 5, 3, 4, 6, 5, 6, 7, 5 ];

	this.setIndex( index );
	this.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	this.addAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

};

THREE.LineSegmentsGeometry.prototype = Object.assign( Object.create( THREE.InstancedBufferGeometry.prototype ), {

	constructor: THREE.LineSegmentsGeometry,

	isLineSegmentsGeometry: true,

	applyMatrix: function ( matrix ) {

		var start = this.attributes.instanceStart;
		var end = this.attributes.instanceEnd;

		if ( start !== undefined ) {

			matrix.applyToBufferAttribute( start );

			matrix.applyToBufferAttribute( end );

			start.data.needsUpdate = true;

		}

		if ( this.boundingBox !== null ) {

			this.computeBoundingBox();

		}

		if ( this.boundingSphere !== null ) {

			this.computeBoundingSphere();

		}

		return this;

	},

	setPositions: function ( array ) {

		var lineSegments;

		if ( array instanceof Float32Array ) {

			lineSegments = array;

		} else if ( Array.isArray( array ) ) {

			lineSegments = new Float32Array( array );

		}

		var instanceBuffer = new THREE.InstancedInterleavedBuffer( lineSegments, 6, 1 ); // xyz, xyz

		this.addAttribute( 'instanceStart', new THREE.InterleavedBufferAttribute( instanceBuffer, 3, 0 ) ); // xyz
		this.addAttribute( 'instanceEnd', new THREE.InterleavedBufferAttribute( instanceBuffer, 3, 3 ) ); // xyz

		//

		this.computeBoundingBox();
		this.computeBoundingSphere();

		return this;

	},

	setColors: function ( array ) {

		var colors;

		if ( array instanceof Float32Array ) {

			colors = array;

		} else if ( Array.isArray( array ) ) {

			colors = new Float32Array( array );

		}

		var instanceColorBuffer = new THREE.InstancedInterleavedBuffer( colors, 6, 1 ); // rgb, rgb

		this.addAttribute( 'instanceColorStart', new THREE.InterleavedBufferAttribute( instanceColorBuffer, 3, 0 ) ); // rgb
		this.addAttribute( 'instanceColorEnd', new THREE.InterleavedBufferAttribute( instanceColorBuffer, 3, 3 ) ); // rgb

		return this;

	},

	fromWireframeGeometry: function ( geometry ) {

		this.setPositions( geometry.attributes.position.array );

		return this;

	},

	fromEdgesGeometry: function ( geometry ) {

		this.setPositions( geometry.attributes.position.array );

		return this;

	},

	fromMesh: function ( mesh ) {

		this.fromWireframeGeometry( new THREE.WireframeGeometry( mesh.geometry ) );

		// set colors, maybe

		return this;

	},

	fromLineSegements: function ( lineSegments ) {

		var geometry = lineSegments.geometry;

		if ( geometry.isGeometry ) {

			this.setPositions( geometry.vertices );

		} else if ( geometry.isBufferGeometry ) {

			this.setPositions( geometry.position.array ); // assumes non-indexed

		}

		// set colors, maybe

		return this;

	},

	computeBoundingBox: function () {

		var box = new THREE.Box3();

		return function computeBoundingBox() {

			if ( this.boundingBox === null ) {

				this.boundingBox = new THREE.Box3();

			}

			var start = this.attributes.instanceStart;
			var end = this.attributes.instanceEnd;

			if ( start !== undefined && end !== undefined ) {

				this.boundingBox.setFromBufferAttribute( start );

				box.setFromBufferAttribute( end );

				this.boundingBox.union( box );

			}

		};

	}(),

	computeBoundingSphere: function () {

		var vector = new THREE.Vector3();

		return function computeBoundingSphere() {

			if ( this.boundingSphere === null ) {

				this.boundingSphere = new THREE.Sphere();

			}

			if ( this.boundingBox === null ) {

				this.computeBoundingBox();

			}

			var start = this.attributes.instanceStart;
			var end = this.attributes.instanceEnd;

			if ( start !== undefined && end !== undefined ) {

				var center = this.boundingSphere.center;

				this.boundingBox.getCenter( center );

				var maxRadiusSq = 0;

				for ( var i = 0, il = start.count; i < il; i ++ ) {

					vector.fromBufferAttribute( start, i );
					maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( vector ) );

					vector.fromBufferAttribute( end, i );
					maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( vector ) );

				}

				this.boundingSphere.radius = Math.sqrt( maxRadiusSq );

				if ( isNaN( this.boundingSphere.radius ) ) {

					console.error( 'THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.', this );

				}

			}

		};

	}(),

	toJSON: function () {

		// todo

	},

	clone: function () {

		// todo

	},

	copy: function ( source ) {

		// todo

		return this;

	}

} );

/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

THREE.LineGeometry = function () {

	THREE.LineSegmentsGeometry.call( this );

	this.type = 'LineGeometry';

};

THREE.LineGeometry.prototype = Object.assign( Object.create( THREE.LineSegmentsGeometry.prototype ), {

	constructor: THREE.LineGeometry,

	isLineGeometry: true,

	setPositions: function ( array ) {

		// converts [ x1, y1, z1,  x2, y2, z2, ... ] to pairs format

		var length = array.length - 3;
		var points = new Float32Array( 2 * length );

		for ( var i = 0; i < length; i += 3 ) {

			points[ 2 * i ] = array[ i ];
			points[ 2 * i + 1 ] = array[ i + 1 ];
			points[ 2 * i + 2 ] = array[ i + 2 ];

			points[ 2 * i + 3 ] = array[ i + 3 ];
			points[ 2 * i + 4 ] = array[ i + 4 ];
			points[ 2 * i + 5 ] = array[ i + 5 ];

		}

		THREE.LineSegmentsGeometry.prototype.setPositions.call( this, points );

		return this;

	},

	setColors: function ( array ) {

		// converts [ r1, g1, b1,  r2, g2, b2, ... ] to pairs format

		var length = array.length - 3;
		var colors = new Float32Array( 2 * length );

		for ( var i = 0; i < length; i += 3 ) {

			colors[ 2 * i ] = array[ i ];
			colors[ 2 * i + 1 ] = array[ i + 1 ];
			colors[ 2 * i + 2 ] = array[ i + 2 ];

			colors[ 2 * i + 3 ] = array[ i + 3 ];
			colors[ 2 * i + 4 ] = array[ i + 4 ];
			colors[ 2 * i + 5 ] = array[ i + 5 ];

		}

		THREE.LineSegmentsGeometry.prototype.setColors.call( this, colors );

		return this;

	},

	fromLine: function ( line ) {

		var geometry = line.geometry;

		if ( geometry.isGeometry ) {

			this.setPositions( geometry.vertices );

		} else if ( geometry.isBufferGeometry ) {

			this.setPositions( geometry.position.array ); // assumes non-indexed

		}

		// set colors, maybe

		return this;

	},

	copy: function ( source ) {

		// todo

		return this;

	}

} );

/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

THREE.WireframeGeometry2 = function ( geometry ) {

	THREE.LineSegmentsGeometry.call( this );

	this.type = 'WireframeGeometry2';

	this.fromWireframeGeometry( new THREE.WireframeGeometry( geometry ) );

	// set colors, maybe

};

THREE.WireframeGeometry2.prototype = Object.assign( Object.create( THREE.LineSegmentsGeometry.prototype ), {

	constructor: THREE.WireframeGeometry2,

	isWireframeGeometry2: true,

	copy: function ( source ) {

		// todo

		return this;

	}

} );

/**
 * @author WestLangley / http://github.com/WestLangley
 *
 * parameters = {
 *  color: <hex>,
 *  linewidth: <float>,
 *  dashed: <boolean>,
 *  dashScale: <float>,
 *  dashSize: <float>,
 *  gapSize: <float>,
 *  resolution: <Vector2>, // to be set by renderer
 * }
 */

THREE.UniformsLib.line = {

	linewidth: { value: 1 },
	resolution: { value: new THREE.Vector2( 1, 1 ) },
	dashScale: { value: 1 },
	dashSize: { value: 1 },
	gapSize: { value: 1 } // todo FIX - maybe change to totalSize

};

THREE.ShaderLib[ 'line' ] = {

	uniforms: THREE.UniformsUtils.merge( [
		THREE.UniformsLib.common,
		THREE.UniformsLib.fog,
		THREE.UniformsLib.line
	] ),

	vertexShader:
		`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		varying vec2 vUv;

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			vUv = uv;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec2 ndcStart = clipStart.xy / clipStart.w;
			vec2 ndcEnd = clipEnd.xy / clipEnd.w;

			// direction
			vec2 dir = ndcEnd - ndcStart;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			// perpendicular to dir
			vec2 offset = vec2( dir.y, - dir.x );

			// undo aspect ratio adjustment
			dir.x /= aspect;
			offset.x /= aspect;

			// sign flip
			if ( position.x < 0.0 ) offset *= - 1.0;

			// endcaps
			if ( position.y < 0.0 ) {

				offset += - dir;

			} else if ( position.y > 1.0 ) {

				offset += dir;

			}

			// adjust for linewidth
			offset *= linewidth;

			// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
			offset /= resolution.y;

			// select end
			vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

			// back to clip space
			offset *= clip.w;

			clip.xy += offset;

			gl_Position = clip;

			#include <logdepthbuf_vertex>

			#include <worldpos_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,

	fragmentShader:
		`
		uniform vec3 diffuse;
		uniform float opacity;

		#ifdef USE_DASH

			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		varying vec2 vUv;

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < 0.5 || vUv.y > 0.5 ) discard; // discard endcaps

				if ( mod( vLineDistance, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			if ( vUv.y < 0.5 || vUv.y > 0.5 ) {

				float a = vUv.x - 0.5;
				float b = vUv.y - 0.5;
				float len2 = a * a + b * b;

				if ( len2 > 0.25 ) discard;

			}

			vec4 diffuseColor = vec4( diffuse, opacity );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, opacity );

			#include <premultiplied_alpha_fragment>
			#include <tonemapping_fragment>
			#include <encodings_fragment>
			#include <fog_fragment>

		}
		`
};

THREE.LineMaterial = function ( parameters ) {

	var lineUniforms = THREE.UniformsUtils.clone( THREE.ShaderLib[ 'line' ].uniforms );
	lineUniforms.opacity.value = parameters.opacity;

	THREE.ShaderMaterial.call( this, {

		type: 'LineMaterial',

		uniforms: lineUniforms,

		vertexShader: THREE.ShaderLib[ 'line' ].vertexShader,
		fragmentShader: THREE.ShaderLib[ 'line' ].fragmentShader

	} );

	this.dashed = false;

	Object.defineProperties( this, {

		color: {

			enumerable: true,

			get: function () {

				return this.uniforms.diffuse.value;

			},

			set: function ( value ) {

				this.uniforms.diffuse.value = value;

			}

		},

		linewidth: {

			enumerable: true,

			get: function () {

				return this.uniforms.linewidth.value;

			},

			set: function ( value ) {

				this.uniforms.linewidth.value = value;

			}

		},

		dashScale: {

			enumerable: true,

			get: function () {

				return this.uniforms.dashScale.value;

			},

			set: function ( value ) {

				this.uniforms.dashScale.value = value;

			}

		},

		dashSize: {

			enumerable: true,

			get: function () {

				return this.uniforms.dashSize.value;

			},

			set: function ( value ) {

				this.uniforms.dashSize.value = value;

			}

		},

		gapSize: {

			enumerable: true,

			get: function () {

				return this.uniforms.gapSize.value;

			},

			set: function ( value ) {

				this.uniforms.gapSize.value = value;

			}

		},

		resolution: {

			enumerable: true,

			get: function () {

				return this.uniforms.resolution.value;

			},

			set: function ( value ) {

				this.uniforms.resolution.value.copy( value );

			}

		}

	} );

	this.setValues( parameters );

};

THREE.LineMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );
THREE.LineMaterial.prototype.constructor = THREE.LineMaterial;

THREE.LineMaterial.prototype.isLineMaterial = true;

THREE.LineMaterial.prototype.copy = function ( source ) {

	THREE.ShaderMaterial.prototype.copy.call( this, source );

	this.color.copy( source.color );

	this.linewidth = source.linewidth;

	this.resolution = source.resolution;

	// todo

	return this;

};

/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

THREE.LineSegments2 = function ( geometry, material ) {

	THREE.Mesh.call( this );

	this.type = 'LineSegments2';

	this.geometry = geometry !== undefined ? geometry : new THREE.LineSegmentsGeometry();
	this.material = material !== undefined ? material : new THREE.LineMaterial( { color: Math.random() * 0xffffff } );

};

THREE.LineSegments2.prototype = Object.assign( Object.create( THREE.Mesh.prototype ), {

	constructor: THREE.LineSegments2,

	isLineSegments2: true,

	computeLineDistances: ( function () { // for backwards-compatability, but could be a method of LineSegmentsGeometry...

		var start = new THREE.Vector3();
		var end = new THREE.Vector3();

		return function computeLineDistances() {

			var geometry = this.geometry;

			var instanceStart = geometry.attributes.instanceStart;
			var instanceEnd = geometry.attributes.instanceEnd;
			var lineDistances = new Float32Array( 2 * instanceStart.data.count );

			for ( var i = 0, j = 0, l = instanceStart.data.count; i < l; i ++, j += 2 ) {

				start.fromBufferAttribute( instanceStart, i );
				end.fromBufferAttribute( instanceEnd, i );

				lineDistances[ j ] = ( j === 0 ) ? 0 : lineDistances[ j - 1 ];
				lineDistances[ j + 1 ] = lineDistances[ j ] + start.distanceTo( end );

			}

			var instanceDistanceBuffer = new THREE.InstancedInterleavedBuffer( lineDistances, 2, 1 ); // d0, d1

			geometry.addAttribute( 'instanceDistanceStart', new THREE.InterleavedBufferAttribute( instanceDistanceBuffer, 1, 0 ) ); // d0
			geometry.addAttribute( 'instanceDistanceEnd', new THREE.InterleavedBufferAttribute( instanceDistanceBuffer, 1, 1 ) ); // d1

			return this;

		};

	}() ),

	copy: function ( source ) {

		// todo

		return this;

	}

} );

/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

THREE.Line2 = function ( geometry, material ) {

	THREE.LineSegments2.call( this );

	this.type = 'Line2';

	this.geometry = geometry !== undefined ? geometry : new THREE.LineGeometry();
	this.material = material !== undefined ? material : new THREE.LineMaterial( { color: Math.random() * 0xffffff } );

};

THREE.Line2.prototype = Object.assign( Object.create( THREE.LineSegments2.prototype ), {

	constructor: THREE.Line2,

	isLine2: true,

	copy: function ( source ) {

		// todo

		return this;

	}

} );

/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

THREE.Wireframe = function ( geometry, material ) {

	THREE.Mesh.call( this );

	this.type = 'Wireframe';

	this.geometry = geometry !== undefined ? geometry : new THREE.LineSegmentsGeometry();
	this.material = material !== undefined ? material : new THREE.LineMaterial( { color: Math.random() * 0xffffff } );

};

THREE.Wireframe.prototype = Object.assign( Object.create( THREE.Mesh.prototype ), {

	constructor: THREE.Wireframe,

	isWireframe: true,

	computeLineDistances: ( function () { // for backwards-compatability, but could be a method of LineSegmentsGeometry...

		var start = new THREE.Vector3();
		var end = new THREE.Vector3();

		return function computeLineDistances() {

			var geometry = this.geometry;

			var instanceStart = geometry.attributes.instanceStart;
			var instanceEnd = geometry.attributes.instanceEnd;
			var lineDistances = new Float32Array( 2 * instanceStart.data.count );

			for ( var i = 0, j = 0, l = instanceStart.data.count; i < l; i ++, j += 2 ) {

				start.fromBufferAttribute( instanceStart, i );
				end.fromBufferAttribute( instanceEnd, i );

				lineDistances[ j ] = ( j === 0 ) ? 0 : lineDistances[ j - 1 ];
				lineDistances[ j + 1 ] = lineDistances[ j ] + start.distanceTo( end );

			}

			var instanceDistanceBuffer = new THREE.InstancedInterleavedBuffer( lineDistances, 2, 1 ); // d0, d1

			geometry.addAttribute( 'instanceDistanceStart', new THREE.InterleavedBufferAttribute( instanceDistanceBuffer, 1, 0 ) ); // d0
			geometry.addAttribute( 'instanceDistanceEnd', new THREE.InterleavedBufferAttribute( instanceDistanceBuffer, 1, 1 ) ); // d1

			return this;

		};

	}() ),

	copy: function ( source ) {

		// todo

		return this;

	}

} );

},{"../three.js":16,"../utils/utils.js":19,"./objects.js":13}],10:[function(require,module,exports){
var utils = require("../utils/utils.js");
var Objects = require('./objects.js');
const OBJLoader = require("./loaders/OBJLoader.js");
const MTLLoader = require("./loaders/MTLLoader.js");

function loadObj(options, cb){

	    if (options === undefined) return console.error("Invalid options provided to loadObj()");

	    this.loaded = false;

        const modelComplete = (m) => {
            console.log("Model complete!", m);

            if(--remaining === 0) this.loaded = true;
        }

        

        // TODO: Support formats other than OBJ/MTL
        const objLoader = new OBJLoader();
        const materialLoader = new MTLLoader();
        materialLoader.load(options.mtl, loadObject, () => (null), error => {
            console.warn("No material file found for SymbolLayer3D model " + m);
        });

        function loadObject(materials) {

            if (materials) {
                materials.preload();
                objLoader.setMaterials( materials );
            }
            
            objLoader.load(options.obj, obj => {

            	var r = utils.types.rotation(options, [0, 0, 0]);
            	var s = utils.types.scale(options, [1, 1, 1]);

            	obj = obj.children[0];
            	obj.rotation.set(r[0] + Math.PI/2, r[1] + Math.PI, r[2]);
            	obj.scale.set(s[0], s[1], s[2]);

            	var projScaleGroup = new THREE.Group();
            	projScaleGroup.add(obj)
		        var userScaleGroup = Objects.prototype._makeGroup(projScaleGroup, options);
		        Objects.prototype._addMethods(userScaleGroup);

                cb(userScaleGroup);

            }, () => (null), error => {
                console.error("Could not load model file.");    
            } );

        };
	}


module.exports = exports = loadObj;
},{"../utils/utils.js":19,"./loaders/MTLLoader.js":11,"./loaders/OBJLoader.js":12,"./objects.js":13}],11:[function(require,module,exports){
/**
 * Loads a Wavefront .mtl file specifying materials
 *
 * @author angelxuanchang
 */

const THREE = require('../../three.js');

const MTLLoader = function ( manager ) {

    this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

MTLLoader.prototype = {

    constructor: MTLLoader,

    /**
     * Loads and parses a MTL asset from a URL.
     *
     * @param {String} url - URL to the MTL file.
     * @param {Function} [onLoad] - Callback invoked with the loaded object.
     * @param {Function} [onProgress] - Callback for download progress.
     * @param {Function} [onError] - Callback for download errors.
     *
     * @see setPath setTexturePath
     *
     * @note In order for relative texture references to resolve correctly
     * you must call setPath and/or setTexturePath explicitly prior to load.
     */
    load: function ( url, onLoad, onProgress, onError ) {

        var scope = this;

        var loader = new THREE.FileLoader( this.manager );
        loader.setPath( this.path );
        loader.load( url, function ( text ) {

            onLoad( scope.parse( text ) );

        }, onProgress, onError );

    },

    /**
     * Set base path for resolving references.
     * If set this path will be prepended to each loaded and found reference.
     *
     * @see setTexturePath
     * @param {String} path
     *
     * @example
     *     mtlLoader.setPath( 'assets/obj/' );
     *     mtlLoader.load( 'my.mtl', ... );
     */
    setPath: function ( path ) {

        this.path = path;

    },

    /**
     * Set base path for resolving texture references.
     * If set this path will be prepended found texture reference.
     * If not set and setPath is, it will be used as texture base path.
     *
     * @see setPath
     * @param {String} path
     *
     * @example
     *     mtlLoader.setPath( 'assets/obj/' );
     *     mtlLoader.setTexturePath( 'assets/textures/' );
     *     mtlLoader.load( 'my.mtl', ... );
     */
    setTexturePath: function ( path ) {

        this.texturePath = path;

    },

    setBaseUrl: function ( path ) {

        console.warn( 'THREE.MTLLoader: .setBaseUrl() is deprecated. Use .setTexturePath( path ) for texture path or .setPath( path ) for general base path instead.' );

        this.setTexturePath( path );

    },

    setCrossOrigin: function ( value ) {

        this.crossOrigin = value;

    },

    setMaterialOptions: function ( value ) {

        this.materialOptions = value;

    },

    /**
     * Parses a MTL file.
     *
     * @param {String} text - Content of MTL file
     * @return {THREE.MTLLoader.MaterialCreator}
     *
     * @see setPath setTexturePath
     *
     * @note In order for relative texture references to resolve correctly
     * you must call setPath and/or setTexturePath explicitly prior to parse.
     */
    parse: function ( text ) {

        var lines = text.split( '\n' );
        var info = {};
        var delimiter_pattern = /\s+/;
        var materialsInfo = {};

        for ( var i = 0; i < lines.length; i ++ ) {

            var line = lines[ i ];
            line = line.trim();

            if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

                // Blank line or comment ignore
                continue;

            }

            var pos = line.indexOf( ' ' );

            var key = ( pos >= 0 ) ? line.substring( 0, pos ) : line;
            key = key.toLowerCase();

            var value = ( pos >= 0 ) ? line.substring( pos + 1 ) : '';
            value = value.trim();

            if ( key === 'newmtl' ) {

                // New material

                info = { name: value };
                materialsInfo[ value ] = info;

            } else if ( info ) {

                if ( key === 'ka' || key === 'kd' || key === 'ks' ) {

                    var ss = value.split( delimiter_pattern, 3 );
                    info[ key ] = [ parseFloat( ss[ 0 ] ), parseFloat( ss[ 1 ] ), parseFloat( ss[ 2 ] ) ];

                } else {

                    info[ key ] = value;

                }

            }

        }

        var materialCreator = new MTLLoader.MaterialCreator( this.texturePath || this.path, this.materialOptions );
        materialCreator.setCrossOrigin( this.crossOrigin );
        materialCreator.setManager( this.manager );
        materialCreator.setMaterials( materialsInfo );
        return materialCreator;

    }

};

/**
 * Create a new THREE-MTLLoader.MaterialCreator
 * @param baseUrl - Url relative to which textures are loaded
 * @param options - Set of options on how to construct the materials
 *                  side: Which side to apply the material
 *                        THREE.FrontSide (default), THREE.BackSide, THREE.DoubleSide
 *                  wrap: What type of wrapping to apply for textures
 *                        THREE.RepeatWrapping (default), THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
 *                  normalizeRGB: RGBs need to be normalized to 0-1 from 0-255
 *                                Default: false, assumed to be already normalized
 *                  ignoreZeroRGBs: Ignore values of RGBs (Ka,Kd,Ks) that are all 0's
 *                                  Default: false
 * @constructor
 */

MTLLoader.MaterialCreator = function ( baseUrl, options ) {

    this.baseUrl = baseUrl || '';
    this.options = options;
    this.materialsInfo = {};
    this.materials = {};
    this.materialsArray = [];
    this.nameLookup = {};

    this.side = ( this.options && this.options.side ) ? this.options.side : THREE.FrontSide;
    this.wrap = ( this.options && this.options.wrap ) ? this.options.wrap : THREE.RepeatWrapping;

};

MTLLoader.MaterialCreator.prototype = {

    constructor: MTLLoader.MaterialCreator,

    setCrossOrigin: function ( value ) {

        this.crossOrigin = value;

    },

    setManager: function ( value ) {

        this.manager = value;

    },

    setMaterials: function ( materialsInfo ) {

        this.materialsInfo = this.convert( materialsInfo );
        this.materials = {};
        this.materialsArray = [];
        this.nameLookup = {};

    },

    convert: function ( materialsInfo ) {

        if ( ! this.options ) return materialsInfo;

        var converted = {};

        for ( var mn in materialsInfo ) {

            // Convert materials info into normalized form based on options

            var mat = materialsInfo[ mn ];

            var covmat = {};

            converted[ mn ] = covmat;

            for ( var prop in mat ) {

                var save = true;
                var value = mat[ prop ];
                var lprop = prop.toLowerCase();

                switch ( lprop ) {

                    case 'kd':
                    case 'ka':
                    case 'ks':

                        // Diffuse color (color under white light) using RGB values

                        if ( this.options && this.options.normalizeRGB ) {

                            value = [ value[ 0 ] / 255, value[ 1 ] / 255, value[ 2 ] / 255 ];

                        }

                        if ( this.options && this.options.ignoreZeroRGBs ) {

                            if ( value[ 0 ] === 0 && value[ 1 ] === 0 && value[ 2 ] === 0 ) {

                                // ignore

                                save = false;

                            }

                        }

                        break;

                    default:

                        break;

                }

                if ( save ) {

                    covmat[ lprop ] = value;

                }

            }

        }

        return converted;

    },

    preload: function () {

        for ( var mn in this.materialsInfo ) {

            this.create( mn );

        }

    },

    getIndex: function ( materialName ) {

        return this.nameLookup[ materialName ];

    },

    getAsArray: function () {

        var index = 0;

        for ( var mn in this.materialsInfo ) {

            this.materialsArray[ index ] = this.create( mn );
            this.nameLookup[ mn ] = index;
            index ++;

        }

        return this.materialsArray;

    },

    create: function ( materialName ) {

        if ( this.materials[ materialName ] === undefined ) {

            this.createMaterial_( materialName );

        }

        return this.materials[ materialName ];

    },

    createMaterial_: function ( materialName ) {

        // Create material

        var scope = this;
        var mat = this.materialsInfo[ materialName ];
        var params = {

            name: materialName,
            side: this.side

        };

        function resolveURL( baseUrl, url ) {

            if ( typeof url !== 'string' || url === '' )
                return '';

            // Absolute URL
            if ( /^https?:\/\//i.test( url ) ) return url;

            return baseUrl + url;

        }

        function setMapForType( mapType, value ) {

            if ( params[ mapType ] ) return; // Keep the first encountered texture

            var texParams = scope.getTextureParams( value, params );
            var map = scope.loadTexture( resolveURL( scope.baseUrl, texParams.url ) );

            map.repeat.copy( texParams.scale );
            map.offset.copy( texParams.offset );

            map.wrapS = scope.wrap;
            map.wrapT = scope.wrap;

            params[ mapType ] = map;

        }

        for ( var prop in mat ) {

            var value = mat[ prop ];

            if ( value === '' ) continue;

            switch ( prop.toLowerCase() ) {

                // Ns is material specular exponent

                case 'kd':

                    // Diffuse color (color under white light) using RGB values

                    params.color = new THREE.Color().fromArray( value );

                    break;

                case 'ks':

                    // Specular color (color when light is reflected from shiny surface) using RGB values
                    params.specular = new THREE.Color().fromArray( value );

                    break;

                case 'map_kd':

                    // Diffuse texture map

                    setMapForType( "map", value );

                    break;

                case 'map_ks':

                    // Specular map

                    setMapForType( "specularMap", value );

                    break;

                case 'map_bump':
                case 'bump':

                    // Bump texture map

                    setMapForType( "bumpMap", value );

                    break;

                case 'ns':

                    // The specular exponent (defines the focus of the specular highlight)
                    // A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.
                    params.shininess = parseFloat( value );

                    break;

                case 'd':

                    if ( value < 1 ) {

                        params.opacity = value;
                        params.transparent = true;

                    }

                    break;

                case 'Tr':

                    if ( value > 0 ) {

                        params.opacity = 1 - value;
                        params.transparent = true;

                    }

                    break;

                default:
                    break;

            }

        }

        this.materials[ materialName ] = new THREE.MeshPhongMaterial( params );
        return this.materials[ materialName ];

    },

    getTextureParams: function ( value, matParams ) {

        var texParams = {

            scale: new THREE.Vector2( 1, 1 ),
            offset: new THREE.Vector2( 0, 0 )

         };

        var items = value.split( /\s+/ );
        var pos;

        pos = items.indexOf( '-bm' );

        if ( pos >= 0 ) {

            matParams.bumpScale = parseFloat( items[ pos + 1 ] );
            items.splice( pos, 2 );

        }

        pos = items.indexOf( '-s' );

        if ( pos >= 0 ) {

            texParams.scale.set( parseFloat( items[ pos + 1 ] ), parseFloat( items[ pos + 2 ] ) );
            items.splice( pos, 4 ); // we expect 3 parameters here!

        }

        pos = items.indexOf( '-o' );

        if ( pos >= 0 ) {

            texParams.offset.set( parseFloat( items[ pos + 1 ] ), parseFloat( items[ pos + 2 ] ) );
            items.splice( pos, 4 ); // we expect 3 parameters here!

        }

        texParams.url = items.join( ' ' ).trim();
        return texParams;

    },

    loadTexture: function ( url, mapping, onLoad, onProgress, onError ) {

        var texture;
        var loader = THREE.Loader.Handlers.get( url );
        var manager = ( this.manager !== undefined ) ? this.manager : THREE.DefaultLoadingManager;

        if ( loader === null ) {

            loader = new THREE.TextureLoader( manager );

        }

        if ( loader.setCrossOrigin ) loader.setCrossOrigin( this.crossOrigin );
        texture = loader.load( url, onLoad, onProgress, onError );

        if ( mapping !== undefined ) texture.mapping = mapping;

        return texture;

    }

};

module.exports = exports = MTLLoader;
},{"../../three.js":16}],12:[function(require,module,exports){
/**
 * @author mrdoob / http://mrdoob.com/
 */
const THREE = require('../../three.js');

const OBJLoader = function ( manager ) {

    this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

    this.materials = null;

    this.regexp = {
        // v float float float
        vertex_pattern           : /^v\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
        // vn float float float
        normal_pattern           : /^vn\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
        // vt float float
        uv_pattern               : /^vt\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
        // f vertex vertex vertex
        face_vertex              : /^f\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)(?:\s+(-?\d+))?/,
        // f vertex/uv vertex/uv vertex/uv
        face_vertex_uv           : /^f\s+(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)(?:\s+(-?\d+)\/(-?\d+))?/,
        // f vertex/uv/normal vertex/uv/normal vertex/uv/normal
        face_vertex_uv_normal    : /^f\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)(?:\s+(-?\d+)\/(-?\d+)\/(-?\d+))?/,
        // f vertex//normal vertex//normal vertex//normal
        face_vertex_normal       : /^f\s+(-?\d+)\/\/(-?\d+)\s+(-?\d+)\/\/(-?\d+)\s+(-?\d+)\/\/(-?\d+)(?:\s+(-?\d+)\/\/(-?\d+))?/,
        // o object_name | g group_name
        object_pattern           : /^[og]\s*(.+)?/,
        // s boolean
        smoothing_pattern        : /^s\s+(\d+|on|off)/,
        // mtllib file_reference
        material_library_pattern : /^mtllib /,
        // usemtl material_name
        material_use_pattern     : /^usemtl /
    };

};

OBJLoader.prototype = {

    constructor: OBJLoader,

    load: function ( url, onLoad, onProgress, onError ) {

        var scope = this;

        var loader = new THREE.FileLoader( scope.manager );
        loader.setPath( this.path );
        loader.load( url, function ( text ) {

            onLoad( scope.parse( text ) );

        }, onProgress, onError );

    },

    setPath: function ( value ) {

        this.path = value;

    },

    setMaterials: function ( materials ) {

        this.materials = materials;

    },

    _createParserState : function () {

        var state = {
            objects  : [],
            object   : {},

            vertices : [],
            normals  : [],
            uvs      : [],

            materialLibraries : [],

            startObject: function ( name, fromDeclaration ) {

                // If the current object (initial from reset) is not from a g/o declaration in the parsed
                // file. We need to use it for the first parsed g/o to keep things in sync.
                if ( this.object && this.object.fromDeclaration === false ) {

                    this.object.name = name;
                    this.object.fromDeclaration = ( fromDeclaration !== false );
                    return;

                }

                var previousMaterial = ( this.object && typeof this.object.currentMaterial === 'function' ? this.object.currentMaterial() : undefined );

                if ( this.object && typeof this.object._finalize === 'function' ) {

                    this.object._finalize( true );

                }

                this.object = {
                    name : name || '',
                    fromDeclaration : ( fromDeclaration !== false ),

                    geometry : {
                        vertices : [],
                        normals  : [],
                        uvs      : []
                    },
                    materials : [],
                    smooth : true,

                    startMaterial : function( name, libraries ) {

                        var previous = this._finalize( false );

                        // New usemtl declaration overwrites an inherited material, except if faces were declared
                        // after the material, then it must be preserved for proper MultiMaterial continuation.
                        if ( previous && ( previous.inherited || previous.groupCount <= 0 ) ) {

                            this.materials.splice( previous.index, 1 );

                        }

                        var material = {
                            index      : this.materials.length,
                            name       : name || '',
                            mtllib     : ( Array.isArray( libraries ) && libraries.length > 0 ? libraries[ libraries.length - 1 ] : '' ),
                            smooth     : ( previous !== undefined ? previous.smooth : this.smooth ),
                            groupStart : ( previous !== undefined ? previous.groupEnd : 0 ),
                            groupEnd   : -1,
                            groupCount : -1,
                            inherited  : false,

                            clone : function( index ) {
                                var cloned = {
                                    index      : ( typeof index === 'number' ? index : this.index ),
                                    name       : this.name,
                                    mtllib     : this.mtllib,
                                    smooth     : this.smooth,
                                    groupStart : 0,
                                    groupEnd   : -1,
                                    groupCount : -1,
                                    inherited  : false
                                };
                                cloned.clone = this.clone.bind(cloned);
                                return cloned;
                            }
                        };

                        this.materials.push( material );

                        return material;

                    },

                    currentMaterial : function() {

                        if ( this.materials.length > 0 ) {
                            return this.materials[ this.materials.length - 1 ];
                        }

                        return undefined;

                    },

                    _finalize : function( end ) {

                        var lastMultiMaterial = this.currentMaterial();
                        if ( lastMultiMaterial && lastMultiMaterial.groupEnd === -1 ) {

                            lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
                            lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
                            lastMultiMaterial.inherited = false;

                        }

                        // Ignore objects tail materials if no face declarations followed them before a new o/g started.
                        if ( end && this.materials.length > 1 ) {

                            for ( var mi = this.materials.length - 1; mi >= 0; mi-- ) {
                                if ( this.materials[mi].groupCount <= 0 ) {
                                    this.materials.splice( mi, 1 );
                                }
                            }

                        }

                        // Guarantee at least one empty material, this makes the creation later more straight forward.
                        if ( end && this.materials.length === 0 ) {

                            this.materials.push({
                                name   : '',
                                smooth : this.smooth
                            });

                        }

                        return lastMultiMaterial;

                    }
                };

                // Inherit previous objects material.
                // Spec tells us that a declared material must be set to all objects until a new material is declared.
                // If a usemtl declaration is encountered while this new object is being parsed, it will
                // overwrite the inherited material. Exception being that there was already face declarations
                // to the inherited material, then it will be preserved for proper MultiMaterial continuation.

                if ( previousMaterial && previousMaterial.name && typeof previousMaterial.clone === "function" ) {

                    var declared = previousMaterial.clone( 0 );
                    declared.inherited = true;
                    this.object.materials.push( declared );

                }

                this.objects.push( this.object );

            },

            finalize : function() {

                if ( this.object && typeof this.object._finalize === 'function' ) {

                    this.object._finalize( true );

                }

            },

            parseVertexIndex: function ( value, len ) {

                var index = parseInt( value, 10 );
                return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;

            },

            parseNormalIndex: function ( value, len ) {

                var index = parseInt( value, 10 );
                return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;

            },

            parseUVIndex: function ( value, len ) {

                var index = parseInt( value, 10 );
                return ( index >= 0 ? index - 1 : index + len / 2 ) * 2;

            },

            addVertex: function ( a, b, c ) {

                var src = this.vertices;
                var dst = this.object.geometry.vertices;

                dst.push( src[ a + 0 ] );
                dst.push( src[ a + 1 ] );
                dst.push( src[ a + 2 ] );
                dst.push( src[ b + 0 ] );
                dst.push( src[ b + 1 ] );
                dst.push( src[ b + 2 ] );
                dst.push( src[ c + 0 ] );
                dst.push( src[ c + 1 ] );
                dst.push( src[ c + 2 ] );

            },

            addVertexLine: function ( a ) {

                var src = this.vertices;
                var dst = this.object.geometry.vertices;

                dst.push( src[ a + 0 ] );
                dst.push( src[ a + 1 ] );
                dst.push( src[ a + 2 ] );

            },

            addNormal : function ( a, b, c ) {

                var src = this.normals;
                var dst = this.object.geometry.normals;

                dst.push( src[ a + 0 ] );
                dst.push( src[ a + 1 ] );
                dst.push( src[ a + 2 ] );
                dst.push( src[ b + 0 ] );
                dst.push( src[ b + 1 ] );
                dst.push( src[ b + 2 ] );
                dst.push( src[ c + 0 ] );
                dst.push( src[ c + 1 ] );
                dst.push( src[ c + 2 ] );

            },

            addUV: function ( a, b, c ) {

                var src = this.uvs;
                var dst = this.object.geometry.uvs;

                dst.push( src[ a + 0 ] );
                dst.push( src[ a + 1 ] );
                dst.push( src[ b + 0 ] );
                dst.push( src[ b + 1 ] );
                dst.push( src[ c + 0 ] );
                dst.push( src[ c + 1 ] );

            },

            addUVLine: function ( a ) {

                var src = this.uvs;
                var dst = this.object.geometry.uvs;

                dst.push( src[ a + 0 ] );
                dst.push( src[ a + 1 ] );

            },

            addFace: function ( a, b, c, d, ua, ub, uc, ud, na, nb, nc, nd ) {

                var vLen = this.vertices.length;

                var ia = this.parseVertexIndex( a, vLen );
                var ib = this.parseVertexIndex( b, vLen );
                var ic = this.parseVertexIndex( c, vLen );
                var id;

                if ( d === undefined ) {

                    this.addVertex( ia, ib, ic );

                } else {

                    id = this.parseVertexIndex( d, vLen );

                    this.addVertex( ia, ib, id );
                    this.addVertex( ib, ic, id );

                }

                if ( ua !== undefined ) {

                    var uvLen = this.uvs.length;

                    ia = this.parseUVIndex( ua, uvLen );
                    ib = this.parseUVIndex( ub, uvLen );
                    ic = this.parseUVIndex( uc, uvLen );

                    if ( d === undefined ) {

                        this.addUV( ia, ib, ic );

                    } else {

                        id = this.parseUVIndex( ud, uvLen );

                        this.addUV( ia, ib, id );
                        this.addUV( ib, ic, id );

                    }

                }

                if ( na !== undefined ) {

                    // Normals are many times the same. If so, skip function call and parseInt.
                    var nLen = this.normals.length;
                    ia = this.parseNormalIndex( na, nLen );

                    ib = na === nb ? ia : this.parseNormalIndex( nb, nLen );
                    ic = na === nc ? ia : this.parseNormalIndex( nc, nLen );

                    if ( d === undefined ) {

                        this.addNormal( ia, ib, ic );

                    } else {

                        id = this.parseNormalIndex( nd, nLen );

                        this.addNormal( ia, ib, id );
                        this.addNormal( ib, ic, id );

                    }

                }

            },

            addLineGeometry: function ( vertices, uvs ) {

                this.object.geometry.type = 'Line';

                var vLen = this.vertices.length;
                var uvLen = this.uvs.length;

                for ( var vi = 0, l = vertices.length; vi < l; vi ++ ) {

                    this.addVertexLine( this.parseVertexIndex( vertices[ vi ], vLen ) );

                }

                for ( var uvi = 0, l = uvs.length; uvi < l; uvi ++ ) {

                    this.addUVLine( this.parseUVIndex( uvs[ uvi ], uvLen ) );

                }

            }

        };

        state.startObject( '', false );

        return state;

    },

    parse: function ( text ) {

        //console.time( 'OBJLoader' );

        var state = this._createParserState();

        if ( text.indexOf( '\r\n' ) !== - 1 ) {

            // This is faster than String.split with regex that splits on both
            text = text.replace( /\r\n/g, '\n' );

        }

        if ( text.indexOf( '\\\n' ) !== - 1) {

            // join lines separated by a line continuation character (\)
            text = text.replace( /\\\n/g, '' );

        }

        var lines = text.split( '\n' );
        var line = '', lineFirstChar = '', lineSecondChar = '';
        var lineLength = 0;
        var result = [];

        // Faster to just trim left side of the line. Use if available.
        var trimLeft = ( typeof ''.trimLeft === 'function' );

        for ( var i = 0, l = lines.length; i < l; i ++ ) {

            line = lines[ i ];

            line = trimLeft ? line.trimLeft() : line.trim();

            lineLength = line.length;

            if ( lineLength === 0 ) continue;

            lineFirstChar = line.charAt( 0 );

            // @todo invoke passed in handler if any
            if ( lineFirstChar === '#' ) continue;

            if ( lineFirstChar === 'v' ) {

                lineSecondChar = line.charAt( 1 );

                if ( lineSecondChar === ' ' && ( result = this.regexp.vertex_pattern.exec( line ) ) !== null ) {

                    // 0                  1      2      3
                    // ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

                    state.vertices.push(
                        parseFloat( result[ 1 ] ),
                        parseFloat( result[ 2 ] ),
                        parseFloat( result[ 3 ] )
                    );

                } else if ( lineSecondChar === 'n' && ( result = this.regexp.normal_pattern.exec( line ) ) !== null ) {

                    // 0                   1      2      3
                    // ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

                    state.normals.push(
                        parseFloat( result[ 1 ] ),
                        parseFloat( result[ 2 ] ),
                        parseFloat( result[ 3 ] )
                    );

                } else if ( lineSecondChar === 't' && ( result = this.regexp.uv_pattern.exec( line ) ) !== null ) {

                    // 0               1      2
                    // ["vt 0.1 0.2", "0.1", "0.2"]

                    state.uvs.push(
                        parseFloat( result[ 1 ] ),
                        parseFloat( result[ 2 ] )
                    );

                } else {

                    throw new Error( "Unexpected vertex/normal/uv line: '" + line  + "'" );

                }

            } else if ( lineFirstChar === "f" ) {

                if ( ( result = this.regexp.face_vertex_uv_normal.exec( line ) ) !== null ) {

                    // f vertex/uv/normal vertex/uv/normal vertex/uv/normal
                    // 0                        1    2    3    4    5    6    7    8    9   10         11         12
                    // ["f 1/1/1 2/2/2 3/3/3", "1", "1", "1", "2", "2", "2", "3", "3", "3", undefined, undefined, undefined]

                    state.addFace(
                        result[ 1 ], result[ 4 ], result[ 7 ], result[ 10 ],
                        result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
                        result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
                    );

                } else if ( ( result = this.regexp.face_vertex_uv.exec( line ) ) !== null ) {

                    // f vertex/uv vertex/uv vertex/uv
                    // 0                  1    2    3    4    5    6   7          8
                    // ["f 1/1 2/2 3/3", "1", "1", "2", "2", "3", "3", undefined, undefined]

                    state.addFace(
                        result[ 1 ], result[ 3 ], result[ 5 ], result[ 7 ],
                        result[ 2 ], result[ 4 ], result[ 6 ], result[ 8 ]
                    );

                } else if ( ( result = this.regexp.face_vertex_normal.exec( line ) ) !== null ) {

                    // f vertex//normal vertex//normal vertex//normal
                    // 0                     1    2    3    4    5    6   7          8
                    // ["f 1//1 2//2 3//3", "1", "1", "2", "2", "3", "3", undefined, undefined]

                    state.addFace(
                        result[ 1 ], result[ 3 ], result[ 5 ], result[ 7 ],
                        undefined, undefined, undefined, undefined,
                        result[ 2 ], result[ 4 ], result[ 6 ], result[ 8 ]
                    );

                } else if ( ( result = this.regexp.face_vertex.exec( line ) ) !== null ) {

                    // f vertex vertex vertex
                    // 0            1    2    3   4
                    // ["f 1 2 3", "1", "2", "3", undefined]

                    state.addFace(
                        result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ]
                    );

                } else {

                    throw new Error( "Unexpected face line: '" + line  + "'" );

                }

            } else if ( lineFirstChar === "l" ) {

                var lineParts = line.substring( 1 ).trim().split( " " );
                var lineVertices = [], lineUVs = [];

                if ( line.indexOf( "/" ) === - 1 ) {

                    lineVertices = lineParts;

                } else {

                    for ( var li = 0, llen = lineParts.length; li < llen; li ++ ) {

                        var parts = lineParts[ li ].split( "/" );

                        if ( parts[ 0 ] !== "" ) lineVertices.push( parts[ 0 ] );
                        if ( parts[ 1 ] !== "" ) lineUVs.push( parts[ 1 ] );

                    }

                }
                state.addLineGeometry( lineVertices, lineUVs );

            } else if ( ( result = this.regexp.object_pattern.exec( line ) ) !== null ) {

                // o object_name
                // or
                // g group_name

                // WORKAROUND: https://bugs.chromium.org/p/v8/issues/detail?id=2869
                // var name = result[ 0 ].substr( 1 ).trim();
                var name = ( " " + result[ 0 ].substr( 1 ).trim() ).substr( 1 );

                state.startObject( name );

            } else if ( this.regexp.material_use_pattern.test( line ) ) {

                // material

                state.object.startMaterial( line.substring( 7 ).trim(), state.materialLibraries );

            } else if ( this.regexp.material_library_pattern.test( line ) ) {

                // mtl file

                state.materialLibraries.push( line.substring( 7 ).trim() );

            } else if ( ( result = this.regexp.smoothing_pattern.exec( line ) ) !== null ) {

                // smooth shading

                // @todo Handle files that have varying smooth values for a set of faces inside one geometry,
                // but does not define a usemtl for each face set.
                // This should be detected and a dummy material created (later MultiMaterial and geometry groups).
                // This requires some care to not create extra material on each smooth value for "normal" obj files.
                // where explicit usemtl defines geometry groups.
                // Example asset: examples/models/obj/cerberus/Cerberus.obj

                var value = result[ 1 ].trim().toLowerCase();
                state.object.smooth = ( value === '1' || value === 'on' );

                var material = state.object.currentMaterial();
                if ( material ) {

                    material.smooth = state.object.smooth;

                }

            } else {

                // Handle null terminated files without exception
                if ( line === '\0' ) continue;

                throw new Error( "Unexpected line: '" + line  + "'" );

            }

        }

        state.finalize();

        var container = new THREE.Group();
        container.materialLibraries = [].concat( state.materialLibraries );

        for ( var i = 0, l = state.objects.length; i < l; i ++ ) {

            var object = state.objects[ i ];
            var geometry = object.geometry;
            var materials = object.materials;
            var isLine = ( geometry.type === 'Line' );

            // Skip o/g line declarations that did not follow with any faces
            if ( geometry.vertices.length === 0 ) continue;

            var buffergeometry = new THREE.BufferGeometry();

            buffergeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( geometry.vertices ), 3 ) );

            if ( geometry.normals.length > 0 ) {

                buffergeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( geometry.normals ), 3 ) );

            } else {

                buffergeometry.computeVertexNormals();

            }

            if ( geometry.uvs.length > 0 ) {

                buffergeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( geometry.uvs ), 2 ) );

            }

            // Create materials

            var createdMaterials = [];

            for ( var mi = 0, miLen = materials.length; mi < miLen ; mi++ ) {

                var sourceMaterial = materials[mi];
                var material = undefined;

                if ( this.materials !== null ) {

                    material = this.materials.create( sourceMaterial.name );

                    // mtl etc. loaders probably can't create line materials correctly, copy properties to a line material.
                    if ( isLine && material && ! ( material instanceof THREE.LineBasicMaterial ) ) {

                        var materialLine = new THREE.LineBasicMaterial();
                        materialLine.copy( material );
                        materialLine.lights = false;
                        material = materialLine;

                    }

                }

                if ( ! material ) {

                    material = ( ! isLine ? new THREE.MeshPhongMaterial() : new THREE.LineBasicMaterial() );
                    material.name = sourceMaterial.name;

                }

                material.shading = sourceMaterial.smooth ? THREE.SmoothShading : THREE.FlatShading;

                createdMaterials.push(material);

            }

            // Create mesh

            var mesh;

            if ( createdMaterials.length > 1 ) {

                for ( var mi = 0, miLen = materials.length; mi < miLen ; mi++ ) {

                    var sourceMaterial = materials[mi];
                    buffergeometry.addGroup( sourceMaterial.groupStart, sourceMaterial.groupCount, mi );

                }

                var multiMaterial = new THREE.MultiMaterial( createdMaterials );
                mesh = ( ! isLine ? new THREE.Mesh( buffergeometry, multiMaterial ) : new THREE.LineSegments( buffergeometry, multiMaterial ) );

            } else {

                mesh = ( ! isLine ? new THREE.Mesh( buffergeometry, createdMaterials[ 0 ] ) : new THREE.LineSegments( buffergeometry, createdMaterials[ 0 ] ) );
            }

            mesh.name = object.name;

            container.add( mesh );

        }

        //console.timeEnd( 'OBJLoader' );

        return container;

    }

};

module.exports = exports = OBJLoader;
},{"../../three.js":16}],13:[function(require,module,exports){
var utils = require("../utils/utils.js");
var material = require("../utils/material.js");

const AnimationManager = require("../animation/AnimationManager.js");


function Objects(){

}

Objects.prototype = {

	// standard 1px line with gl
	line: function(obj){

		obj = utils._validate(obj, this._defaults.line);

		//project to world and normalize
        var straightProject = utils.lnglatsToWorld(obj.geometry);
		var normalized = utils.normalizeVertices(straightProject);

		//flatten array for buffergeometry
        var flattenedArray = utils.flattenVectors(normalized.vertices);

		var positions = new Float32Array(flattenedArray); // 3 vertices per point
		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

		// material
		var material = new THREE.LineBasicMaterial( { color: 0xff0000, linewidth: 21 } );
		var line = new THREE.Line( geometry,  material );

        line.options = options || {};
        line.position.copy(normalized.position)

  		return line  
	},


	extrusion: function(options){

	},

	_addMethods: function(obj, staticVal){

		var root = this;

		if (staticVal) {

		}

		else {

			if (!obj.coordinates) obj.coordinates = [0,0,0];

	    	// Bestow this mesh with animation superpowers and keeps track of its movements in the global animation queue			
			root.animationManager.enroll(obj); 
			obj.setCoords = function(lnglat){

		        /** Place the given object on the map, centered around the provided longitude and latitude
		            The object's internal coordinates are assumed to be in meter-offset format, meaning
		            1 unit represents 1 meter distance away from the provided coordinate.
		        */

		        // If object already added, scale the model so that its units are interpreted as meters at the given latitude
				if (obj.userData.units === 'meters'){
					var s = utils.projectedUnitsPerMeter(lnglat[1]);
					obj.scale.set(s,s,s);
				}

				obj.coordinates = lnglat;
	        	obj.set({position:lnglat})
		        

		        return obj;

			}

			obj.setRotation = function(xyz) {

				if (typeof xyz === 'number') xyz = {z: xyz}

				var r = {
					x: utils.radify(xyz.x) || obj.rotation.x,
					y: utils.radify(xyz.y) || obj.rotation.y,
					z: utils.radify(xyz.z) || obj.rotation.z
				}

				obj._setObject({rotation: [r.x, r.y, r.z]})
			}

		}

		obj.add = function(){
	        root.world.add(obj);
	        if (!staticVal) obj.set({position:obj.coordinates});
	        return obj;
		}


		obj.remove = function(){
			root.world.remove(obj);
			root.map.repaint = true;
		}

		obj.duplicate = function(a) {
			var dupe = obj.clone(); 
			dupe.userData = obj.userData;
			root._addMethods(dupe);
			return dupe
		}
	
		return obj
	},

	_makeGroup: function(obj, options){
        var geoGroup = new THREE.Group();
        geoGroup.userData = options || {};
        geoGroup.userData.isGeoGroup = true;

        var isArrayOfObjects = obj.length;

        if (isArrayOfObjects) for (o of obj) geoGroup.add(o)


    	else geoGroup.add(obj);

        utils._flipMaterialSides(obj);

        return geoGroup
	},

	animationManager: new AnimationManager,

	_defaults: {

		line: {
			geometry: null,
			color: 'black',
			width:1,
			opacity:1
		},

		sphere: {
			position: [0,0,0],
			radius: 1,
			sides: 20,
			units: 'scene',
			material: 'MeshBasicMaterial'
		},

		tube: {                
			geometry: null,
            radius: 1,
            sides:6,
			material: 'MeshBasicMaterial'
        },

        extrusion:{
        	footprint: null,
        	base: 0,
        	top: 100,
        	color:'black',
			material: 'MeshBasicMaterial',
			scaleToLatitude: false
        },

        loadObj:{
        	obj: null,
        	mtl: null,
        	rotation: 0,
        	scale: 1,
			units: 'scene'
        },

        Object3D: {
        	obj: null, 
			units: 'scene'
        }
	},

	geometries:{
		line: ['LineString'],
		tube: ['LineString'],
		sphere: ['Point'],
	}
}

module.exports = exports = Objects;
},{"../animation/AnimationManager.js":6,"../utils/material.js":18,"../utils/utils.js":19}],14:[function(require,module,exports){
var utils = require("../utils/utils.js");
var material = require("../utils/material.js");
var Objects = require('./objects.js');

function Sphere(obj){

	obj = utils._validate(obj,  Objects.prototype._defaults.sphere);
	var geometry = new THREE.SphereBufferGeometry( obj.radius, obj.sides, obj.sides );
	var mat = material(obj)
	var output = new THREE.Mesh( geometry, mat );

	if (obj.units === 'meters') output = Objects.prototype._makeGroup(output, obj);
    Objects.prototype._addMethods(output);
    return output
}


module.exports = exports = Sphere;
},{"../utils/material.js":18,"../utils/utils.js":19,"./objects.js":13}],15:[function(require,module,exports){
var utils = require("../utils/utils.js");
var material = require("../utils/material.js");
var Objects = require('./objects.js');
var THREE = require("../three.js");

function tube(obj, world){

	// validate and prep input geometry
	var obj = utils._validate(obj, Objects.prototype._defaults.tube);
    var straightProject = utils.lnglatsToWorld(obj.geometry);
	var normalized = utils.normalizeVertices(straightProject);

	var crossSection = tube.prototype.defineCrossSection(obj);
	var vertices = tube.prototype.buildVertices(crossSection, normalized.vertices, world);
	var geom = tube.prototype.buildFaces(vertices, normalized.vertices, obj);

	var mat = material(obj);

    var mesh = new THREE.Mesh( geom, mat );
    mesh.position.copy(normalized.position);

    return mesh

}

tube.prototype = {

	buildVertices: function (crossSection, spine, world){

		//create reusable plane for intersection calculations
		var geometry = new THREE.PlaneBufferGeometry(99999999999, 9999999999);
		var m = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
		m.opacity = 0
		var plane = new THREE.Mesh( geometry, m );
		// world.add( plane );

		var geom = new THREE.Geometry(); 
		var lastElbow = false;


		// BUILD VERTICES: iterate through points in spine and position each vertex in cross section


		// get normalized vectors for each spine segment
		var spineSegments = [spine[0].clone().normalize()];

		for (i in spine) {

			i = parseFloat(i);

			var segment;

			if (spine[i+1]){
				segment = new THREE.Vector3()
					.subVectors( spine[i+1], spine[i])
					.normalize();

			}

			spineSegments.push(segment);
		}

		spineSegments.push(new THREE.Vector3());

		for (i in spine) {

			i = parseFloat(i);
			var lineVertex = spine[i];

			// ROTATE cross section

			var humerus = spineSegments[i]

			var forearm = spineSegments[i+1]

			var midpointToLookAt = humerus.clone()
				.add(forearm)
				.normalize();

			if (i === 0) midpointToLookAt = forearm;
			
			else if (i === spine.length - 1) midpointToLookAt = humerus;

						
			// if first point in input line, rotate and translate it to position
			if (!lastElbow) {

				var elbow = crossSection.clone();

				elbow
					.lookAt(midpointToLookAt)

				elbow.vertices.forEach(function(vertex){
					geom.vertices
						.push(vertex.add(lineVertex));
				})

				lastElbow = elbow.vertices;

			}

			else {

				var elbow = [];
				plane.position.copy(lineVertex);
				plane.lookAt(midpointToLookAt.clone().add(lineVertex));
				plane.updateMatrixWorld();

				lastElbow.forEach(function(v3){

					var raycaster = new THREE.Raycaster(v3, humerus);

					var intersection = raycaster
						.intersectObject(plane)[0];

					if (intersection) {
						geom.vertices.push(intersection.point);
						elbow.push(intersection.point);
					}

					else console.error('Tube geometry failed at vertex '+i+'. Consider reducing tube radius, or smoothening out the sharp angle at this vertex')
				})

				lastElbow = elbow
			}

		}

		world.remove(plane);

		return geom
	},

	defineCrossSection: function(obj){
        var crossSection = new THREE.Geometry();
        var count = obj.sides;

        for ( var i = 0; i < count; i ++ ) {

            var l = obj.radius;
            var a = (i+0.5) / count * Math.PI;

            crossSection.vertices.push( 
            	new THREE.Vector3 ( 
            		-Math.sin( 2 * a ), 
            		Math.cos( 2 * a ),
            		0
            	)
            	.multiplyScalar(l)
            );
        }

        return crossSection
	},

	//build faces between vertices

	buildFaces: function(geom, spine, obj){

		for (var i in spine) {

			i = parseFloat(i);
			var vertex = spine[i];

			if (i < spine.length - 1) {

				for (var p = 0; p < obj.sides; p++) {

					var b1 = i * obj.sides + p;
					var b2 = i * obj.sides + (p+1) % obj.sides
					var t1 = b1 + obj.sides
					var t2 = b2 + obj.sides;

					var triangle1 = new THREE.Face3(t1, b1, b2);
					var triangle2 = new THREE.Face3(t1, b2, t2);
					geom.faces.push(triangle1, triangle2)
				}				
			}
		}

		//add endcaps
		var v = geom.vertices.length;

		for (var c = 0; c+2<obj.sides; c++) {
			var tri1 = new THREE.Face3(0, c+2, c+1);
			var tri2 = new THREE.Face3(v-1, v-1-(c+2), v-1-(c+1))
			geom.faces.push(tri1, tri2)
		}

		//compute normals to get shading to work properly
		geom.computeFaceNormals();

		var bufferGeom = new THREE.BufferGeometry().fromGeometry(geom);
		return geom
	}
}

module.exports = exports = tube;


},{"../three.js":16,"../utils/material.js":18,"../utils/utils.js":19,"./objects.js":13}],16:[function(require,module,exports){
// threejs.org/license
(function(k,za){"object"===typeof exports&&"undefined"!==typeof module?za(exports):"function"===typeof define&&define.amd?define(["exports"],za):za(k.THREE={})})(this,function(k){function za(){}function B(a,b){this.x=a||0;this.y=b||0}function R(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];0<arguments.length&&console.error("THREE.Matrix4: the constructor no longer reads arguments. use .set() instead.")}function ca(a,b,c,d){this._x=a||0;this._y=b||0;this._z=c||0;this._w=void 0!==d?d:1}function p(a,
b,c){this.x=a||0;this.y=b||0;this.z=c||0}function la(){this.elements=[1,0,0,0,1,0,0,0,1];0<arguments.length&&console.error("THREE.Matrix3: the constructor no longer reads arguments. use .set() instead.")}function ea(a,b,c,d,e,f,g,h,l,m){Object.defineProperty(this,"id",{value:Ff++});this.uuid=J.generateUUID();this.name="";this.image=void 0!==a?a:ea.DEFAULT_IMAGE;this.mipmaps=[];this.mapping=void 0!==b?b:ea.DEFAULT_MAPPING;this.wrapS=void 0!==c?c:1001;this.wrapT=void 0!==d?d:1001;this.magFilter=void 0!==
e?e:1006;this.minFilter=void 0!==f?f:1008;this.anisotropy=void 0!==l?l:1;this.format=void 0!==g?g:1023;this.type=void 0!==h?h:1009;this.offset=new B(0,0);this.repeat=new B(1,1);this.center=new B(0,0);this.rotation=0;this.matrixAutoUpdate=!0;this.matrix=new la;this.generateMipmaps=!0;this.premultiplyAlpha=!1;this.flipY=!0;this.unpackAlignment=4;this.encoding=void 0!==m?m:3E3;this.version=0;this.onUpdate=null}function W(a,b,c,d){this.x=a||0;this.y=b||0;this.z=c||0;this.w=void 0!==d?d:1}function kb(a,
b,c){this.width=a;this.height=b;this.scissor=new W(0,0,a,b);this.scissorTest=!1;this.viewport=new W(0,0,a,b);c=c||{};void 0===c.minFilter&&(c.minFilter=1006);this.texture=new ea(void 0,void 0,c.wrapS,c.wrapT,c.magFilter,c.minFilter,c.format,c.type,c.anisotropy,c.encoding);this.texture.generateMipmaps=void 0!==c.generateMipmaps?c.generateMipmaps:!0;this.depthBuffer=void 0!==c.depthBuffer?c.depthBuffer:!0;this.stencilBuffer=void 0!==c.stencilBuffer?c.stencilBuffer:!0;this.depthTexture=void 0!==c.depthTexture?
c.depthTexture:null}function Lb(a,b,c){kb.call(this,a,b,c);this.activeMipMapLevel=this.activeCubeFace=0}function lb(a,b,c,d,e,f,g,h,l,m,v,n){ea.call(this,null,f,g,h,l,m,d,e,v,n);this.image={data:a,width:b,height:c};this.magFilter=void 0!==l?l:1003;this.minFilter=void 0!==m?m:1003;this.flipY=this.generateMipmaps=!1;this.unpackAlignment=1}function Xa(a,b){this.min=void 0!==a?a:new p(Infinity,Infinity,Infinity);this.max=void 0!==b?b:new p(-Infinity,-Infinity,-Infinity)}function Ha(a,b){this.center=void 0!==
a?a:new p;this.radius=void 0!==b?b:0}function Ia(a,b){this.normal=void 0!==a?a:new p(1,0,0);this.constant=void 0!==b?b:0}function td(a,b,c,d,e,f){this.planes=[void 0!==a?a:new Ia,void 0!==b?b:new Ia,void 0!==c?c:new Ia,void 0!==d?d:new Ia,void 0!==e?e:new Ia,void 0!==f?f:new Ia]}function G(a,b,c){return void 0===b&&void 0===c?this.set(a):this.setRGB(a,b,c)}function Vd(){function a(e,f){!1!==c&&(d(e,f),b.requestAnimationFrame(a))}var b=null,c=!1,d=null;return{start:function(){!0!==c&&null!==d&&(b.requestAnimationFrame(a),
c=!0)},stop:function(){c=!1},setAnimationLoop:function(a){d=a},setContext:function(a){b=a}}}function Gf(a){function b(b,c){var d=b.array,e=b.dynamic?a.DYNAMIC_DRAW:a.STATIC_DRAW,h=a.createBuffer();a.bindBuffer(c,h);a.bufferData(c,d,e);b.onUploadCallback();c=a.FLOAT;d instanceof Float32Array?c=a.FLOAT:d instanceof Float64Array?console.warn("THREE.WebGLAttributes: Unsupported data buffer format: Float64Array."):d instanceof Uint16Array?c=a.UNSIGNED_SHORT:d instanceof Int16Array?c=a.SHORT:d instanceof
Uint32Array?c=a.UNSIGNED_INT:d instanceof Int32Array?c=a.INT:d instanceof Int8Array?c=a.BYTE:d instanceof Uint8Array&&(c=a.UNSIGNED_BYTE);return{buffer:h,type:c,bytesPerElement:d.BYTES_PER_ELEMENT,version:b.version}}var c=new WeakMap;return{get:function(a){a.isInterleavedBufferAttribute&&(a=a.data);return c.get(a)},remove:function(b){b.isInterleavedBufferAttribute&&(b=b.data);var d=c.get(b);d&&(a.deleteBuffer(d.buffer),c.delete(b))},update:function(d,e){d.isInterleavedBufferAttribute&&(d=d.data);
var f=c.get(d);if(void 0===f)c.set(d,b(d,e));else if(f.version<d.version){var g=d,h=g.array,l=g.updateRange;a.bindBuffer(e,f.buffer);!1===g.dynamic?a.bufferData(e,h,a.STATIC_DRAW):-1===l.count?a.bufferSubData(e,0,h):0===l.count?console.error("THREE.WebGLObjects.updateBuffer: dynamic THREE.BufferAttribute marked as needsUpdate but updateRange.count is 0, ensure you are using set methods or updating manually."):(a.bufferSubData(e,l.offset*h.BYTES_PER_ELEMENT,h.subarray(l.offset,l.offset+l.count)),l.count=
-1);f.version=d.version}}}}function mb(a,b,c,d){this._x=a||0;this._y=b||0;this._z=c||0;this._order=d||mb.DefaultOrder}function Wd(){this.mask=1}function H(){Object.defineProperty(this,"id",{value:Hf++});this.uuid=J.generateUUID();this.name="";this.type="Object3D";this.parent=null;this.children=[];this.up=H.DefaultUp.clone();var a=new p,b=new mb,c=new ca,d=new p(1,1,1);b.onChange(function(){c.setFromEuler(b,!1)});c.onChange(function(){b.setFromQuaternion(c,void 0,!1)});Object.defineProperties(this,
{position:{enumerable:!0,value:a},rotation:{enumerable:!0,value:b},quaternion:{enumerable:!0,value:c},scale:{enumerable:!0,value:d},modelViewMatrix:{value:new R},normalMatrix:{value:new la}});this.matrix=new R;this.matrixWorld=new R;this.matrixAutoUpdate=H.DefaultMatrixAutoUpdate;this.matrixWorldNeedsUpdate=!1;this.layers=new Wd;this.visible=!0;this.receiveShadow=this.castShadow=!1;this.frustumCulled=!0;this.renderOrder=0;this.userData={}}function Ra(){H.call(this);this.type="Camera";this.matrixWorldInverse=
new R;this.projectionMatrix=new R}function Mb(a,b,c,d,e,f){Ra.call(this);this.type="OrthographicCamera";this.zoom=1;this.view=null;this.left=a;this.right=b;this.top=c;this.bottom=d;this.near=void 0!==e?e:.1;this.far=void 0!==f?f:2E3;this.updateProjectionMatrix()}function Ya(a,b,c,d,e,f){this.a=a;this.b=b;this.c=c;this.normal=d&&d.isVector3?d:new p;this.vertexNormals=Array.isArray(d)?d:[];this.color=e&&e.isColor?e:new G;this.vertexColors=Array.isArray(e)?e:[];this.materialIndex=void 0!==f?f:0}function P(){Object.defineProperty(this,
"id",{value:If+=2});this.uuid=J.generateUUID();this.name="";this.type="Geometry";this.vertices=[];this.colors=[];this.faces=[];this.faceVertexUvs=[[]];this.morphTargets=[];this.morphNormals=[];this.skinWeights=[];this.skinIndices=[];this.lineDistances=[];this.boundingSphere=this.boundingBox=null;this.groupsNeedUpdate=this.lineDistancesNeedUpdate=this.colorsNeedUpdate=this.normalsNeedUpdate=this.uvsNeedUpdate=this.verticesNeedUpdate=this.elementsNeedUpdate=!1}function L(a,b,c){if(Array.isArray(a))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");
this.name="";this.array=a;this.itemSize=b;this.count=void 0!==a?a.length/b:0;this.normalized=!0===c;this.dynamic=!1;this.updateRange={offset:0,count:-1};this.version=0}function yc(a,b,c){L.call(this,new Int8Array(a),b,c)}function zc(a,b,c){L.call(this,new Uint8Array(a),b,c)}function Ac(a,b,c){L.call(this,new Uint8ClampedArray(a),b,c)}function Bc(a,b,c){L.call(this,new Int16Array(a),b,c)}function nb(a,b,c){L.call(this,new Uint16Array(a),b,c)}function Cc(a,b,c){L.call(this,new Int32Array(a),b,c)}function ob(a,
b,c){L.call(this,new Uint32Array(a),b,c)}function z(a,b,c){L.call(this,new Float32Array(a),b,c)}function Dc(a,b,c){L.call(this,new Float64Array(a),b,c)}function Ge(){this.vertices=[];this.normals=[];this.colors=[];this.uvs=[];this.uvs2=[];this.groups=[];this.morphTargets={};this.skinWeights=[];this.skinIndices=[];this.boundingSphere=this.boundingBox=null;this.groupsNeedUpdate=this.uvsNeedUpdate=this.colorsNeedUpdate=this.normalsNeedUpdate=this.verticesNeedUpdate=!1}function He(a){if(0===a.length)return-Infinity;
for(var b=a[0],c=1,d=a.length;c<d;++c)a[c]>b&&(b=a[c]);return b}function D(){Object.defineProperty(this,"id",{value:Jf+=2});this.uuid=J.generateUUID();this.name="";this.type="BufferGeometry";this.index=null;this.attributes={};this.morphAttributes={};this.groups=[];this.boundingSphere=this.boundingBox=null;this.drawRange={start:0,count:Infinity};this.userData={}}function Nb(a,b,c,d,e,f){P.call(this);this.type="BoxGeometry";this.parameters={width:a,height:b,depth:c,widthSegments:d,heightSegments:e,
depthSegments:f};this.fromBufferGeometry(new pb(a,b,c,d,e,f));this.mergeVertices()}function pb(a,b,c,d,e,f){function g(a,b,c,d,e,f,g,k,Q,M,Ob){var r=f/Q,u=g/M,O=f/2,y=g/2,x=k/2;g=Q+1;var w=M+1,C=f=0,A,B,z=new p;for(B=0;B<w;B++){var H=B*u-y;for(A=0;A<g;A++)z[a]=(A*r-O)*d,z[b]=H*e,z[c]=x,m.push(z.x,z.y,z.z),z[a]=0,z[b]=0,z[c]=0<k?1:-1,v.push(z.x,z.y,z.z),n.push(A/Q),n.push(1-B/M),f+=1}for(B=0;B<M;B++)for(A=0;A<Q;A++)a=t+A+g*(B+1),b=t+(A+1)+g*(B+1),c=t+(A+1)+g*B,l.push(t+A+g*B,a,c),l.push(a,b,c),C+=
6;h.addGroup(q,C,Ob);q+=C;t+=f}D.call(this);this.type="BoxBufferGeometry";this.parameters={width:a,height:b,depth:c,widthSegments:d,heightSegments:e,depthSegments:f};var h=this;a=a||1;b=b||1;c=c||1;d=Math.floor(d)||1;e=Math.floor(e)||1;f=Math.floor(f)||1;var l=[],m=[],v=[],n=[],t=0,q=0;g("z","y","x",-1,-1,c,b,a,f,e,0);g("z","y","x",1,-1,c,b,-a,f,e,1);g("x","z","y",1,1,a,c,b,d,f,2);g("x","z","y",1,-1,a,c,-b,d,f,3);g("x","y","z",1,-1,a,b,c,d,e,4);g("x","y","z",-1,-1,a,b,-c,d,e,5);this.setIndex(l);this.addAttribute("position",
new z(m,3));this.addAttribute("normal",new z(v,3));this.addAttribute("uv",new z(n,2))}function Fc(a,b,c,d){P.call(this);this.type="PlaneGeometry";this.parameters={width:a,height:b,widthSegments:c,heightSegments:d};this.fromBufferGeometry(new rb(a,b,c,d));this.mergeVertices()}function rb(a,b,c,d){D.call(this);this.type="PlaneBufferGeometry";this.parameters={width:a,height:b,widthSegments:c,heightSegments:d};a=a||1;b=b||1;var e=a/2,f=b/2;c=Math.floor(c)||1;d=Math.floor(d)||1;var g=c+1,h=d+1,l=a/c,m=
b/d,v=[],n=[],t=[],q=[];for(a=0;a<h;a++){var r=a*m-f;for(b=0;b<g;b++)n.push(b*l-e,-r,0),t.push(0,0,1),q.push(b/c),q.push(1-a/d)}for(a=0;a<d;a++)for(b=0;b<c;b++)e=b+g*(a+1),f=b+1+g*(a+1),h=b+1+g*a,v.push(b+g*a,e,h),v.push(e,f,h);this.setIndex(v);this.addAttribute("position",new z(n,3));this.addAttribute("normal",new z(t,3));this.addAttribute("uv",new z(q,2))}function I(){Object.defineProperty(this,"id",{value:Kf++});this.uuid=J.generateUUID();this.name="";this.type="Material";this.lights=this.fog=
!0;this.blending=1;this.side=0;this.flatShading=!1;this.vertexColors=0;this.opacity=1;this.transparent=!1;this.blendSrc=204;this.blendDst=205;this.blendEquation=100;this.blendEquationAlpha=this.blendDstAlpha=this.blendSrcAlpha=null;this.depthFunc=3;this.depthWrite=this.depthTest=!0;this.clippingPlanes=null;this.clipShadows=this.clipIntersection=!1;this.shadowSide=null;this.colorWrite=!0;this.precision=null;this.polygonOffset=!1;this.polygonOffsetUnits=this.polygonOffsetFactor=0;this.dithering=!1;
this.alphaTest=0;this.premultipliedAlpha=!1;this.overdraw=0;this.visible=!0;this.userData={};this.needsUpdate=!0}function ua(a){I.call(this);this.type="MeshBasicMaterial";this.color=new G(16777215);this.lightMap=this.map=null;this.lightMapIntensity=1;this.aoMap=null;this.aoMapIntensity=1;this.envMap=this.alphaMap=this.specularMap=null;this.combine=0;this.reflectivity=1;this.refractionRatio=.98;this.wireframe=!1;this.wireframeLinewidth=1;this.wireframeLinejoin=this.wireframeLinecap="round";this.lights=
this.morphTargets=this.skinning=!1;this.setValues(a)}function Fa(a){I.call(this);this.type="ShaderMaterial";this.defines={};this.uniforms={};this.vertexShader="void main() {\n\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}";this.fragmentShader="void main() {\n\tgl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );\n}";this.linewidth=1;this.wireframe=!1;this.wireframeLinewidth=1;this.morphNormals=this.morphTargets=this.skinning=this.clipping=this.lights=this.fog=!1;this.extensions=
{derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1};this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv2:[0,0]};this.index0AttributeName=void 0;this.uniformsNeedUpdate=!1;void 0!==a&&(void 0!==a.attributes&&console.error("THREE.ShaderMaterial: attributes should now be defined in THREE.BufferGeometry instead."),this.setValues(a))}function sb(a,b){this.origin=void 0!==a?a:new p;this.direction=void 0!==b?b:new p}function Qb(a,b){this.start=void 0!==a?a:new p;this.end=void 0!==b?b:new p}
function ta(a,b,c){this.a=void 0!==a?a:new p;this.b=void 0!==b?b:new p;this.c=void 0!==c?c:new p}function va(a,b){H.call(this);this.type="Mesh";this.geometry=void 0!==a?a:new D;this.material=void 0!==b?b:new ua({color:16777215*Math.random()});this.drawMode=0;this.updateMorphTargets()}function Lf(a,b,c,d){function e(a,c){b.buffers.color.setClear(a.r,a.g,a.b,c,d)}var f=new G(0),g=0,h,l,m;return{getClearColor:function(){return f},setClearColor:function(a,b){f.set(a);g=void 0!==b?b:1;e(f,g)},getClearAlpha:function(){return g},
setClearAlpha:function(a){g=a;e(f,g)},render:function(b,d,t,q){d=d.background;null===d?e(f,g):d&&d.isColor&&(e(d,1),q=!0);(a.autoClear||q)&&a.clear(a.autoClearColor,a.autoClearDepth,a.autoClearStencil);d&&d.isCubeTexture?(void 0===m&&(m=new va(new pb(1,1,1),new Fa({uniforms:tb.cube.uniforms,vertexShader:tb.cube.vertexShader,fragmentShader:tb.cube.fragmentShader,side:1,depthTest:!0,depthWrite:!1,fog:!1})),m.geometry.removeAttribute("normal"),m.geometry.removeAttribute("uv"),m.onBeforeRender=function(a,
b,c){this.matrixWorld.copyPosition(c.matrixWorld)},c.update(m)),m.material.uniforms.tCube.value=d,b.push(m,m.geometry,m.material,0,null)):d&&d.isTexture&&(void 0===h&&(h=new Mb(-1,1,1,-1,0,1),l=new va(new rb(2,2),new ua({depthTest:!1,depthWrite:!1,fog:!1})),c.update(l)),l.material.map=d,a.renderBufferDirect(h,null,l.geometry,l.material,l,null))}}}function Mf(a,b,c){var d;this.setMode=function(a){d=a};this.render=function(b,f){a.drawArrays(d,b,f);c.update(f,d)};this.renderInstances=function(a,f,g){var e=
b.get("ANGLE_instanced_arrays");null===e?console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays."):(e.drawArraysInstancedANGLE(d,f,g,a.maxInstancedCount),c.update(g,d,a.maxInstancedCount))}}function Nf(a,b,c){function d(b){if("highp"===b){if(0<a.getShaderPrecisionFormat(a.VERTEX_SHADER,a.HIGH_FLOAT).precision&&0<a.getShaderPrecisionFormat(a.FRAGMENT_SHADER,a.HIGH_FLOAT).precision)return"highp";b="mediump"}return"mediump"===
b&&0<a.getShaderPrecisionFormat(a.VERTEX_SHADER,a.MEDIUM_FLOAT).precision&&0<a.getShaderPrecisionFormat(a.FRAGMENT_SHADER,a.MEDIUM_FLOAT).precision?"mediump":"lowp"}var e,f=void 0!==c.precision?c.precision:"highp",g=d(f);g!==f&&(console.warn("THREE.WebGLRenderer:",f,"not supported, using",g,"instead."),f=g);c=!0===c.logarithmicDepthBuffer;g=a.getParameter(a.MAX_TEXTURE_IMAGE_UNITS);var h=a.getParameter(a.MAX_VERTEX_TEXTURE_IMAGE_UNITS),l=a.getParameter(a.MAX_TEXTURE_SIZE),m=a.getParameter(a.MAX_CUBE_MAP_TEXTURE_SIZE),
v=a.getParameter(a.MAX_VERTEX_ATTRIBS),n=a.getParameter(a.MAX_VERTEX_UNIFORM_VECTORS),t=a.getParameter(a.MAX_VARYING_VECTORS),q=a.getParameter(a.MAX_FRAGMENT_UNIFORM_VECTORS),r=0<h,k=!!b.get("OES_texture_float");return{getMaxAnisotropy:function(){if(void 0!==e)return e;var c=b.get("EXT_texture_filter_anisotropic");return e=null!==c?a.getParameter(c.MAX_TEXTURE_MAX_ANISOTROPY_EXT):0},getMaxPrecision:d,precision:f,logarithmicDepthBuffer:c,maxTextures:g,maxVertexTextures:h,maxTextureSize:l,maxCubemapSize:m,
maxAttributes:v,maxVertexUniforms:n,maxVaryings:t,maxFragmentUniforms:q,vertexTextures:r,floatFragmentTextures:k,floatVertexTextures:r&&k}}function Of(){function a(){m.value!==d&&(m.value=d,m.needsUpdate=0<e);c.numPlanes=e;c.numIntersection=0}function b(a,b,d,e){var f=null!==a?a.length:0,g=null;if(0!==f){g=m.value;if(!0!==e||null===g){e=d+4*f;b=b.matrixWorldInverse;l.getNormalMatrix(b);if(null===g||g.length<e)g=new Float32Array(e);for(e=0;e!==f;++e,d+=4)h.copy(a[e]).applyMatrix4(b,l),h.normal.toArray(g,
d),g[d+3]=h.constant}m.value=g;m.needsUpdate=!0}c.numPlanes=f;return g}var c=this,d=null,e=0,f=!1,g=!1,h=new Ia,l=new la,m={value:null,needsUpdate:!1};this.uniform=m;this.numIntersection=this.numPlanes=0;this.init=function(a,c,g){var h=0!==a.length||c||0!==e||f;f=c;d=b(a,g,0);e=a.length;return h};this.beginShadows=function(){g=!0;b(null)};this.endShadows=function(){g=!1;a()};this.setState=function(c,h,l,q,r,k){if(!f||null===c||0===c.length||g&&!l)g?b(null):a();else{l=g?0:e;var n=4*l,v=r.clippingState||
null;m.value=v;v=b(c,q,n,k);for(c=0;c!==n;++c)v[c]=d[c];r.clippingState=v;this.numIntersection=h?this.numPlanes:0;this.numPlanes+=l}}}function Pf(a){var b={};return{get:function(c){if(void 0!==b[c])return b[c];switch(c){case "WEBGL_depth_texture":var d=a.getExtension("WEBGL_depth_texture")||a.getExtension("MOZ_WEBGL_depth_texture")||a.getExtension("WEBKIT_WEBGL_depth_texture");break;case "EXT_texture_filter_anisotropic":d=a.getExtension("EXT_texture_filter_anisotropic")||a.getExtension("MOZ_EXT_texture_filter_anisotropic")||
a.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case "WEBGL_compressed_texture_s3tc":d=a.getExtension("WEBGL_compressed_texture_s3tc")||a.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||a.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case "WEBGL_compressed_texture_pvrtc":d=a.getExtension("WEBGL_compressed_texture_pvrtc")||a.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:d=a.getExtension(c)}null===d&&console.warn("THREE.WebGLRenderer: "+c+" extension not supported.");
return b[c]=d}}}function Qf(a,b,c){function d(a){a=a.target;var g=e[a.id];null!==g.index&&b.remove(g.index);for(var l in g.attributes)b.remove(g.attributes[l]);a.removeEventListener("dispose",d);delete e[a.id];if(l=f[a.id])b.remove(l),delete f[a.id];if(l=f[g.id])b.remove(l),delete f[g.id];c.memory.geometries--}var e={},f={};return{get:function(a,b){var f=e[b.id];if(f)return f;b.addEventListener("dispose",d);b.isBufferGeometry?f=b:b.isGeometry&&(void 0===b._bufferGeometry&&(b._bufferGeometry=(new D).setFromObject(a)),
f=b._bufferGeometry);e[b.id]=f;c.memory.geometries++;return f},update:function(c){var d=c.index,e=c.attributes;null!==d&&b.update(d,a.ELEMENT_ARRAY_BUFFER);for(var f in e)b.update(e[f],a.ARRAY_BUFFER);c=c.morphAttributes;for(f in c){d=c[f];e=0;for(var g=d.length;e<g;e++)b.update(d[e],a.ARRAY_BUFFER)}},getWireframeAttribute:function(c){var d=f[c.id];if(d)return d;d=[];var e=c.index,g=c.attributes;if(null!==e){e=e.array;g=0;for(var v=e.length;g<v;g+=3){var n=e[g+0],t=e[g+1],q=e[g+2];d.push(n,t,t,q,
q,n)}}else for(e=g.position.array,g=0,v=e.length/3-1;g<v;g+=3)n=g+0,t=g+1,q=g+2,d.push(n,t,t,q,q,n);d=new (65535<He(d)?ob:nb)(d,1);b.update(d,a.ELEMENT_ARRAY_BUFFER);return f[c.id]=d}}}function Rf(a,b,c){var d,e,f;this.setMode=function(a){d=a};this.setIndex=function(a){e=a.type;f=a.bytesPerElement};this.render=function(b,h){a.drawElements(d,h,e,b*f);c.update(h,d)};this.renderInstances=function(a,h,l){var g=b.get("ANGLE_instanced_arrays");null===g?console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays."):
(g.drawElementsInstancedANGLE(d,l,e,h*f,a.maxInstancedCount),c.update(l,d,a.maxInstancedCount))}}function Sf(a){var b={frame:0,calls:0,triangles:0,points:0,lines:0};return{memory:{geometries:0,textures:0},render:b,programs:null,autoReset:!0,reset:function(){b.frame++;b.calls=0;b.triangles=0;b.points=0;b.lines=0},update:function(c,d,e){e=e||1;b.calls++;switch(d){case a.TRIANGLES:b.triangles+=c/3*e;break;case a.TRIANGLE_STRIP:case a.TRIANGLE_FAN:b.triangles+=e*(c-2);break;case a.LINES:b.lines+=c/2*
e;break;case a.LINE_STRIP:b.lines+=e*(c-1);break;case a.LINE_LOOP:b.lines+=e*c;break;case a.POINTS:b.points+=e*c;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",d)}}}}function Tf(a,b){return Math.abs(b[1])-Math.abs(a[1])}function Uf(a){var b={},c=new Float32Array(8);return{update:function(d,e,f,g){var h=d.morphTargetInfluences,l=h.length;d=b[e.id];if(void 0===d){d=[];for(var m=0;m<l;m++)d[m]=[m,0];b[e.id]=d}var v=f.morphTargets&&e.morphAttributes.position;f=f.morphNormals&&e.morphAttributes.normal;
for(m=0;m<l;m++){var n=d[m];0!==n[1]&&(v&&e.removeAttribute("morphTarget"+m),f&&e.removeAttribute("morphNormal"+m))}for(m=0;m<l;m++)n=d[m],n[0]=m,n[1]=h[m];d.sort(Tf);for(m=0;8>m;m++){if(n=d[m])if(h=n[0],l=n[1]){v&&e.addAttribute("morphTarget"+m,v[h]);f&&e.addAttribute("morphNormal"+m,f[h]);c[m]=l;continue}c[m]=0}g.getUniforms().setValue(a,"morphTargetInfluences",c)}}}function Vf(a,b){var c={};return{update:function(d){var e=b.render.frame,f=d.geometry,g=a.get(d,f);c[g.id]!==e&&(f.isGeometry&&g.updateFromObject(d),
a.update(g),c[g.id]=e);return g},dispose:function(){c={}}}}function Za(a,b,c,d,e,f,g,h,l,m){a=void 0!==a?a:[];ea.call(this,a,void 0!==b?b:301,c,d,e,f,g,h,l,m);this.flipY=!1}function Rb(a,b,c){var d=a[0];if(0>=d||0<d)return a;var e=b*c,f=Ie[e];void 0===f&&(f=new Float32Array(e),Ie[e]=f);if(0!==b)for(d.toArray(f,0),d=1,e=0;d!==b;++d)e+=c,a[d].toArray(f,e);return f}function da(a,b){if(a.length!==b.length)return!1;for(var c=0,d=a.length;c<d;c++)if(a[c]!==b[c])return!1;return!0}function qa(a,b){for(var c=
0,d=b.length;c<d;c++)a[c]=b[c]}function Je(a,b){var c=Ke[b];void 0===c&&(c=new Int32Array(b),Ke[b]=c);for(var d=0;d!==b;++d)c[d]=a.allocTextureUnit();return c}function Wf(a,b){var c=this.cache;c[0]!==b&&(a.uniform1f(this.addr,b),c[0]=b)}function Xf(a,b){var c=this.cache;c[0]!==b&&(a.uniform1i(this.addr,b),c[0]=b)}function Yf(a,b){var c=this.cache;if(void 0!==b.x){if(c[0]!==b.x||c[1]!==b.y)a.uniform2f(this.addr,b.x,b.y),c[0]=b.x,c[1]=b.y}else da(c,b)||(a.uniform2fv(this.addr,b),qa(c,b))}function Zf(a,
b){var c=this.cache;if(void 0!==b.x){if(c[0]!==b.x||c[1]!==b.y||c[2]!==b.z)a.uniform3f(this.addr,b.x,b.y,b.z),c[0]=b.x,c[1]=b.y,c[2]=b.z}else if(void 0!==b.r){if(c[0]!==b.r||c[1]!==b.g||c[2]!==b.b)a.uniform3f(this.addr,b.r,b.g,b.b),c[0]=b.r,c[1]=b.g,c[2]=b.b}else da(c,b)||(a.uniform3fv(this.addr,b),qa(c,b))}function $f(a,b){var c=this.cache;if(void 0!==b.x){if(c[0]!==b.x||c[1]!==b.y||c[2]!==b.z||c[3]!==b.w)a.uniform4f(this.addr,b.x,b.y,b.z,b.w),c[0]=b.x,c[1]=b.y,c[2]=b.z,c[3]=b.w}else da(c,b)||(a.uniform4fv(this.addr,
b),qa(c,b))}function ag(a,b){var c=this.cache,d=b.elements;void 0===d?da(c,b)||(a.uniformMatrix2fv(this.addr,!1,b),qa(c,b)):da(c,d)||(Le.set(d),a.uniformMatrix2fv(this.addr,!1,Le),qa(c,d))}function bg(a,b){var c=this.cache,d=b.elements;void 0===d?da(c,b)||(a.uniformMatrix3fv(this.addr,!1,b),qa(c,b)):da(c,d)||(Me.set(d),a.uniformMatrix3fv(this.addr,!1,Me),qa(c,d))}function cg(a,b){var c=this.cache,d=b.elements;void 0===d?da(c,b)||(a.uniformMatrix4fv(this.addr,!1,b),qa(c,b)):da(c,d)||(Ne.set(d),a.uniformMatrix4fv(this.addr,
!1,Ne),qa(c,d))}function dg(a,b,c){var d=this.cache,e=c.allocTextureUnit();d[0]!==e&&(a.uniform1i(this.addr,e),d[0]=e);c.setTexture2D(b||Oe,e)}function eg(a,b,c){var d=this.cache,e=c.allocTextureUnit();d[0]!==e&&(a.uniform1i(this.addr,e),d[0]=e);c.setTextureCube(b||Pe,e)}function Qe(a,b){var c=this.cache;da(c,b)||(a.uniform2iv(this.addr,b),qa(c,b))}function Re(a,b){var c=this.cache;da(c,b)||(a.uniform3iv(this.addr,b),qa(c,b))}function Se(a,b){var c=this.cache;da(c,b)||(a.uniform4iv(this.addr,b),qa(c,
b))}function fg(a){switch(a){case 5126:return Wf;case 35664:return Yf;case 35665:return Zf;case 35666:return $f;case 35674:return ag;case 35675:return bg;case 35676:return cg;case 35678:case 36198:return dg;case 35680:return eg;case 5124:case 35670:return Xf;case 35667:case 35671:return Qe;case 35668:case 35672:return Re;case 35669:case 35673:return Se}}function gg(a,b){var c=this.cache;da(c,b)||(a.uniform1fv(this.addr,b),qa(c,b))}function hg(a,b){var c=this.cache;da(c,b)||(a.uniform1iv(this.addr,
b),qa(c,b))}function ig(a,b){var c=this.cache;b=Rb(b,this.size,2);da(c,b)||(a.uniform2fv(this.addr,b),this.updateCache(b))}function jg(a,b){var c=this.cache;b=Rb(b,this.size,3);da(c,b)||(a.uniform3fv(this.addr,b),this.updateCache(b))}function kg(a,b){var c=this.cache;b=Rb(b,this.size,4);da(c,b)||(a.uniform4fv(this.addr,b),this.updateCache(b))}function lg(a,b){var c=this.cache;b=Rb(b,this.size,4);da(c,b)||(a.uniformMatrix2fv(this.addr,!1,b),this.updateCache(b))}function mg(a,b){var c=this.cache;b=
Rb(b,this.size,9);da(c,b)||(a.uniformMatrix3fv(this.addr,!1,b),this.updateCache(b))}function ng(a,b){var c=this.cache;b=Rb(b,this.size,16);da(c,b)||(a.uniformMatrix4fv(this.addr,!1,b),this.updateCache(b))}function og(a,b,c){var d=this.cache,e=b.length,f=Je(c,e);!1===da(d,f)&&(a.uniform1iv(this.addr,f),qa(d,f));for(a=0;a!==e;++a)c.setTexture2D(b[a]||Oe,f[a])}function pg(a,b,c){var d=this.cache,e=b.length,f=Je(c,e);!1===da(d,f)&&(a.uniform1iv(this.addr,f),qa(d,f));for(a=0;a!==e;++a)c.setTextureCube(b[a]||
Pe,f[a])}function qg(a){switch(a){case 5126:return gg;case 35664:return ig;case 35665:return jg;case 35666:return kg;case 35674:return lg;case 35675:return mg;case 35676:return ng;case 35678:return og;case 35680:return pg;case 5124:case 35670:return hg;case 35667:case 35671:return Qe;case 35668:case 35672:return Re;case 35669:case 35673:return Se}}function rg(a,b,c){this.id=a;this.addr=c;this.cache=[];this.setValue=fg(b.type)}function Te(a,b,c){this.id=a;this.addr=c;this.cache=[];this.size=b.size;
this.setValue=qg(b.type)}function Ue(a){this.id=a;this.seq=[];this.map={}}function eb(a,b,c){this.seq=[];this.map={};this.renderer=c;c=a.getProgramParameter(b,a.ACTIVE_UNIFORMS);for(var d=0;d<c;++d){var e=a.getActiveUniform(b,d),f=a.getUniformLocation(b,e.name),g=this,h=e.name,l=h.length;for(Xd.lastIndex=0;;){var m=Xd.exec(h),v=Xd.lastIndex,n=m[1],t=m[3];"]"===m[2]&&(n|=0);if(void 0===t||"["===t&&v+2===l){h=g;e=void 0===t?new rg(n,e,f):new Te(n,e,f);h.seq.push(e);h.map[e.id]=e;break}else t=g.map[n],
void 0===t&&(t=new Ue(n),n=g,g=t,n.seq.push(g),n.map[g.id]=g),g=t}}}function sg(a){a=a.split("\n");for(var b=0;b<a.length;b++)a[b]=b+1+": "+a[b];return a.join("\n")}function Ve(a,b,c){var d=a.createShader(b);a.shaderSource(d,c);a.compileShader(d);!1===a.getShaderParameter(d,a.COMPILE_STATUS)&&console.error("THREE.WebGLShader: Shader couldn't compile.");""!==a.getShaderInfoLog(d)&&console.warn("THREE.WebGLShader: gl.getShaderInfoLog()",b===a.VERTEX_SHADER?"vertex":"fragment",a.getShaderInfoLog(d),
sg(c));return d}function We(a){switch(a){case 3E3:return["Linear","( value )"];case 3001:return["sRGB","( value )"];case 3002:return["RGBE","( value )"];case 3004:return["RGBM","( value, 7.0 )"];case 3005:return["RGBM","( value, 16.0 )"];case 3006:return["RGBD","( value, 256.0 )"];case 3007:return["Gamma","( value, float( GAMMA_FACTOR ) )"];default:throw Error("unsupported encoding: "+a);}}function Yd(a,b){b=We(b);return"vec4 "+a+"( vec4 value ) { return "+b[0]+"ToLinear"+b[1]+"; }"}function tg(a,
b){b=We(b);return"vec4 "+a+"( vec4 value ) { return LinearTo"+b[0]+b[1]+"; }"}function ug(a,b){switch(b){case 1:b="Linear";break;case 2:b="Reinhard";break;case 3:b="Uncharted2";break;case 4:b="OptimizedCineon";break;default:throw Error("unsupported toneMapping: "+b);}return"vec3 "+a+"( vec3 color ) { return "+b+"ToneMapping( color ); }"}function vg(a,b,c){a=a||{};return[a.derivatives||b.envMapCubeUV||b.bumpMap||b.normalMap&&!b.objectSpaceNormalMap||b.flatShading?"#extension GL_OES_standard_derivatives : enable":
"",(a.fragDepth||b.logarithmicDepthBuffer)&&c.get("EXT_frag_depth")?"#extension GL_EXT_frag_depth : enable":"",a.drawBuffers&&c.get("WEBGL_draw_buffers")?"#extension GL_EXT_draw_buffers : require":"",(a.shaderTextureLOD||b.envMap)&&c.get("EXT_shader_texture_lod")?"#extension GL_EXT_shader_texture_lod : enable":""].filter(Gc).join("\n")}function wg(a){var b=[],c;for(c in a){var d=a[c];!1!==d&&b.push("#define "+c+" "+d)}return b.join("\n")}function Gc(a){return""!==a}function Xe(a,b){return a.replace(/NUM_DIR_LIGHTS/g,
b.numDirLights).replace(/NUM_SPOT_LIGHTS/g,b.numSpotLights).replace(/NUM_RECT_AREA_LIGHTS/g,b.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,b.numPointLights).replace(/NUM_HEMI_LIGHTS/g,b.numHemiLights)}function Ye(a,b){return a.replace(/NUM_CLIPPING_PLANES/g,b.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,b.numClippingPlanes-b.numClipIntersection)}function Zd(a){return a.replace(/^[ \t]*#include +<([\w\d.]+)>/gm,function(a,c){a=S[c];if(void 0===a)throw Error("Can not resolve #include <"+c+
">");return Zd(a)})}function Ze(a){return a.replace(/#pragma unroll_loop[\s]+?for \( int i = (\d+); i < (\d+); i \+\+ \) \{([\s\S]+?)(?=\})\}/g,function(a,c,d,e){a="";for(c=parseInt(c);c<parseInt(d);c++)a+=e.replace(/\[ i \]/g,"[ "+c+" ]");return a})}function xg(a,b,c,d,e,f){var g=a.context,h=d.defines,l=e.vertexShader,m=e.fragmentShader,v="SHADOWMAP_TYPE_BASIC";1===f.shadowMapType?v="SHADOWMAP_TYPE_PCF":2===f.shadowMapType&&(v="SHADOWMAP_TYPE_PCF_SOFT");var n="ENVMAP_TYPE_CUBE",t="ENVMAP_MODE_REFLECTION",
q="ENVMAP_BLENDING_MULTIPLY";if(f.envMap){switch(d.envMap.mapping){case 301:case 302:n="ENVMAP_TYPE_CUBE";break;case 306:case 307:n="ENVMAP_TYPE_CUBE_UV";break;case 303:case 304:n="ENVMAP_TYPE_EQUIREC";break;case 305:n="ENVMAP_TYPE_SPHERE"}switch(d.envMap.mapping){case 302:case 304:t="ENVMAP_MODE_REFRACTION"}switch(d.combine){case 0:q="ENVMAP_BLENDING_MULTIPLY";break;case 1:q="ENVMAP_BLENDING_MIX";break;case 2:q="ENVMAP_BLENDING_ADD"}}var r=0<a.gammaFactor?a.gammaFactor:1,k=vg(d.extensions,f,b),p=
wg(h),w=g.createProgram();d.isRawShaderMaterial?(h=[p].filter(Gc).join("\n"),0<h.length&&(h+="\n"),b=[k,p].filter(Gc).join("\n"),0<b.length&&(b+="\n")):(h=["precision "+f.precision+" float;","precision "+f.precision+" int;","#define SHADER_NAME "+e.name,p,f.supportsVertexTextures?"#define VERTEX_TEXTURES":"","#define GAMMA_FACTOR "+r,"#define MAX_BONES "+f.maxBones,f.useFog&&f.fog?"#define USE_FOG":"",f.useFog&&f.fogExp?"#define FOG_EXP2":"",f.map?"#define USE_MAP":"",f.envMap?"#define USE_ENVMAP":
"",f.envMap?"#define "+t:"",f.lightMap?"#define USE_LIGHTMAP":"",f.aoMap?"#define USE_AOMAP":"",f.emissiveMap?"#define USE_EMISSIVEMAP":"",f.bumpMap?"#define USE_BUMPMAP":"",f.normalMap?"#define USE_NORMALMAP":"",f.normalMap&&f.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",f.displacementMap&&f.supportsVertexTextures?"#define USE_DISPLACEMENTMAP":"",f.specularMap?"#define USE_SPECULARMAP":"",f.roughnessMap?"#define USE_ROUGHNESSMAP":"",f.metalnessMap?"#define USE_METALNESSMAP":"",f.alphaMap?
"#define USE_ALPHAMAP":"",f.vertexColors?"#define USE_COLOR":"",f.flatShading?"#define FLAT_SHADED":"",f.skinning?"#define USE_SKINNING":"",f.useVertexTexture?"#define BONE_TEXTURE":"",f.morphTargets?"#define USE_MORPHTARGETS":"",f.morphNormals&&!1===f.flatShading?"#define USE_MORPHNORMALS":"",f.doubleSided?"#define DOUBLE_SIDED":"",f.flipSided?"#define FLIP_SIDED":"",f.shadowMapEnabled?"#define USE_SHADOWMAP":"",f.shadowMapEnabled?"#define "+v:"",f.sizeAttenuation?"#define USE_SIZEATTENUATION":"",
f.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",f.logarithmicDepthBuffer&&b.get("EXT_frag_depth")?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_COLOR","\tattribute vec3 color;","#endif","#ifdef USE_MORPHTARGETS","\tattribute vec3 morphTarget0;",
"\tattribute vec3 morphTarget1;","\tattribute vec3 morphTarget2;","\tattribute vec3 morphTarget3;","\t#ifdef USE_MORPHNORMALS","\t\tattribute vec3 morphNormal0;","\t\tattribute vec3 morphNormal1;","\t\tattribute vec3 morphNormal2;","\t\tattribute vec3 morphNormal3;","\t#else","\t\tattribute vec3 morphTarget4;","\t\tattribute vec3 morphTarget5;","\t\tattribute vec3 morphTarget6;","\t\tattribute vec3 morphTarget7;","\t#endif","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;",
"#endif","\n"].filter(Gc).join("\n"),b=[k,"precision "+f.precision+" float;","precision "+f.precision+" int;","#define SHADER_NAME "+e.name,p,f.alphaTest?"#define ALPHATEST "+f.alphaTest+(f.alphaTest%1?"":".0"):"","#define GAMMA_FACTOR "+r,f.useFog&&f.fog?"#define USE_FOG":"",f.useFog&&f.fogExp?"#define FOG_EXP2":"",f.map?"#define USE_MAP":"",f.envMap?"#define USE_ENVMAP":"",f.envMap?"#define "+n:"",f.envMap?"#define "+t:"",f.envMap?"#define "+q:"",f.lightMap?"#define USE_LIGHTMAP":"",f.aoMap?"#define USE_AOMAP":
"",f.emissiveMap?"#define USE_EMISSIVEMAP":"",f.bumpMap?"#define USE_BUMPMAP":"",f.normalMap?"#define USE_NORMALMAP":"",f.normalMap&&f.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",f.specularMap?"#define USE_SPECULARMAP":"",f.roughnessMap?"#define USE_ROUGHNESSMAP":"",f.metalnessMap?"#define USE_METALNESSMAP":"",f.alphaMap?"#define USE_ALPHAMAP":"",f.vertexColors?"#define USE_COLOR":"",f.gradientMap?"#define USE_GRADIENTMAP":"",f.flatShading?"#define FLAT_SHADED":"",f.doubleSided?"#define DOUBLE_SIDED":
"",f.flipSided?"#define FLIP_SIDED":"",f.shadowMapEnabled?"#define USE_SHADOWMAP":"",f.shadowMapEnabled?"#define "+v:"",f.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",f.physicallyCorrectLights?"#define PHYSICALLY_CORRECT_LIGHTS":"",f.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",f.logarithmicDepthBuffer&&b.get("EXT_frag_depth")?"#define USE_LOGDEPTHBUF_EXT":"",f.envMap&&b.get("EXT_shader_texture_lod")?"#define TEXTURE_LOD_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;",
0!==f.toneMapping?"#define TONE_MAPPING":"",0!==f.toneMapping?S.tonemapping_pars_fragment:"",0!==f.toneMapping?ug("toneMapping",f.toneMapping):"",f.dithering?"#define DITHERING":"",f.outputEncoding||f.mapEncoding||f.envMapEncoding||f.emissiveMapEncoding?S.encodings_pars_fragment:"",f.mapEncoding?Yd("mapTexelToLinear",f.mapEncoding):"",f.envMapEncoding?Yd("envMapTexelToLinear",f.envMapEncoding):"",f.emissiveMapEncoding?Yd("emissiveMapTexelToLinear",f.emissiveMapEncoding):"",f.outputEncoding?tg("linearToOutputTexel",
f.outputEncoding):"",f.depthPacking?"#define DEPTH_PACKING "+d.depthPacking:"","\n"].filter(Gc).join("\n"));l=Zd(l);l=Xe(l,f);l=Ye(l,f);m=Zd(m);m=Xe(m,f);m=Ye(m,f);l=Ze(l);m=Ze(m);m=b+m;l=Ve(g,g.VERTEX_SHADER,h+l);m=Ve(g,g.FRAGMENT_SHADER,m);g.attachShader(w,l);g.attachShader(w,m);void 0!==d.index0AttributeName?g.bindAttribLocation(w,0,d.index0AttributeName):!0===f.morphTargets&&g.bindAttribLocation(w,0,"position");g.linkProgram(w);f=g.getProgramInfoLog(w).trim();v=g.getShaderInfoLog(l).trim();n=
g.getShaderInfoLog(m).trim();q=t=!0;if(!1===g.getProgramParameter(w,g.LINK_STATUS))t=!1,console.error("THREE.WebGLProgram: shader error: ",g.getError(),"gl.VALIDATE_STATUS",g.getProgramParameter(w,g.VALIDATE_STATUS),"gl.getProgramInfoLog",f,v,n);else if(""!==f)console.warn("THREE.WebGLProgram: gl.getProgramInfoLog()",f);else if(""===v||""===n)q=!1;q&&(this.diagnostics={runnable:t,material:d,programLog:f,vertexShader:{log:v,prefix:h},fragmentShader:{log:n,prefix:b}});g.deleteShader(l);g.deleteShader(m);
var x;this.getUniforms=function(){void 0===x&&(x=new eb(g,w,a));return x};var A;this.getAttributes=function(){if(void 0===A){for(var a={},b=g.getProgramParameter(w,g.ACTIVE_ATTRIBUTES),c=0;c<b;c++){var d=g.getActiveAttrib(w,c).name;a[d]=g.getAttribLocation(w,d)}A=a}return A};this.destroy=function(){g.deleteProgram(w);this.program=void 0};Object.defineProperties(this,{uniforms:{get:function(){console.warn("THREE.WebGLProgram: .uniforms is now .getUniforms().");return this.getUniforms()}},attributes:{get:function(){console.warn("THREE.WebGLProgram: .attributes is now .getAttributes().");
return this.getAttributes()}}});this.name=e.name;this.id=yg++;this.code=c;this.usedTimes=1;this.program=w;this.vertexShader=l;this.fragmentShader=m;return this}function zg(a,b,c){function d(a,b){if(a)a.isTexture?c=a.encoding:a.isWebGLRenderTarget&&(console.warn("THREE.WebGLPrograms.getTextureEncodingFromMap: don't use render targets as textures. Use their .texture property instead."),c=a.texture.encoding);else var c=3E3;3E3===c&&b&&(c=3007);return c}var e=[],f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",
MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"phong",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow"},g="precision supportsVertexTextures map mapEncoding envMap envMapMode envMapEncoding lightMap aoMap emissiveMap emissiveMapEncoding bumpMap normalMap objectSpaceNormalMap displacementMap specularMap roughnessMap metalnessMap gradientMap alphaMap combine vertexColors fog useFog fogExp flatShading sizeAttenuation logarithmicDepthBuffer skinning maxBones useVertexTexture morphTargets morphNormals maxMorphTargets maxMorphNormals premultipliedAlpha numDirLights numPointLights numSpotLights numHemiLights numRectAreaLights shadowMapEnabled shadowMapType toneMapping physicallyCorrectLights alphaTest doubleSided flipSided numClippingPlanes numClipIntersection depthPacking dithering".split(" ");
this.getParameters=function(b,e,g,v,n,t,q){var h=f[b.type];if(q.isSkinnedMesh){var l=q.skeleton.bones;if(c.floatVertexTextures)l=1024;else{var m=Math.min(Math.floor((c.maxVertexUniforms-20)/4),l.length);m<l.length?(console.warn("THREE.WebGLRenderer: Skeleton has "+l.length+" bones. This GPU supports "+m+"."),l=0):l=m}}else l=0;m=c.precision;null!==b.precision&&(m=c.getMaxPrecision(b.precision),m!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",m,"instead."));
var k=a.getRenderTarget();return{shaderID:h,precision:m,supportsVertexTextures:c.vertexTextures,outputEncoding:d(k?k.texture:null,a.gammaOutput),map:!!b.map,mapEncoding:d(b.map,a.gammaInput),envMap:!!b.envMap,envMapMode:b.envMap&&b.envMap.mapping,envMapEncoding:d(b.envMap,a.gammaInput),envMapCubeUV:!!b.envMap&&(306===b.envMap.mapping||307===b.envMap.mapping),lightMap:!!b.lightMap,aoMap:!!b.aoMap,emissiveMap:!!b.emissiveMap,emissiveMapEncoding:d(b.emissiveMap,a.gammaInput),bumpMap:!!b.bumpMap,normalMap:!!b.normalMap,
objectSpaceNormalMap:1===b.normalMapType,displacementMap:!!b.displacementMap,roughnessMap:!!b.roughnessMap,metalnessMap:!!b.metalnessMap,specularMap:!!b.specularMap,alphaMap:!!b.alphaMap,gradientMap:!!b.gradientMap,combine:b.combine,vertexColors:b.vertexColors,fog:!!v,useFog:b.fog,fogExp:v&&v.isFogExp2,flatShading:b.flatShading,sizeAttenuation:b.sizeAttenuation,logarithmicDepthBuffer:c.logarithmicDepthBuffer,skinning:b.skinning&&0<l,maxBones:l,useVertexTexture:c.floatVertexTextures,morphTargets:b.morphTargets,
morphNormals:b.morphNormals,maxMorphTargets:a.maxMorphTargets,maxMorphNormals:a.maxMorphNormals,numDirLights:e.directional.length,numPointLights:e.point.length,numSpotLights:e.spot.length,numRectAreaLights:e.rectArea.length,numHemiLights:e.hemi.length,numClippingPlanes:n,numClipIntersection:t,dithering:b.dithering,shadowMapEnabled:a.shadowMap.enabled&&q.receiveShadow&&0<g.length,shadowMapType:a.shadowMap.type,toneMapping:a.toneMapping,physicallyCorrectLights:a.physicallyCorrectLights,premultipliedAlpha:b.premultipliedAlpha,
alphaTest:b.alphaTest,doubleSided:2===b.side,flipSided:1===b.side,depthPacking:void 0!==b.depthPacking?b.depthPacking:!1}};this.getProgramCode=function(b,c){var d=[];c.shaderID?d.push(c.shaderID):(d.push(b.fragmentShader),d.push(b.vertexShader));if(void 0!==b.defines)for(var e in b.defines)d.push(e),d.push(b.defines[e]);for(e=0;e<g.length;e++)d.push(c[g[e]]);d.push(b.onBeforeCompile.toString());d.push(a.gammaOutput);return d.join()};this.acquireProgram=function(c,d,f,g){for(var h,l=0,m=e.length;l<
m;l++){var v=e[l];if(v.code===g){h=v;++h.usedTimes;break}}void 0===h&&(h=new xg(a,b,g,c,d,f),e.push(h));return h};this.releaseProgram=function(a){if(0===--a.usedTimes){var b=e.indexOf(a);e[b]=e[e.length-1];e.pop();a.destroy()}};this.programs=e}function Ag(){var a=new WeakMap;return{get:function(b){var c=a.get(b);void 0===c&&(c={},a.set(b,c));return c},remove:function(b){a.delete(b)},update:function(b,c,d){a.get(b)[c]=d},dispose:function(){a=new WeakMap}}}function Bg(a,b){return a.renderOrder!==b.renderOrder?
a.renderOrder-b.renderOrder:a.program&&b.program&&a.program!==b.program?a.program.id-b.program.id:a.material.id!==b.material.id?a.material.id-b.material.id:a.z!==b.z?a.z-b.z:a.id-b.id}function Cg(a,b){return a.renderOrder!==b.renderOrder?a.renderOrder-b.renderOrder:a.z!==b.z?b.z-a.z:a.id-b.id}function Dg(){var a=[],b=0,c=[],d=[];return{opaque:c,transparent:d,init:function(){b=0;c.length=0;d.length=0},push:function(e,f,g,h,l){var m=a[b];void 0===m?(m={id:e.id,object:e,geometry:f,material:g,program:g.program,
renderOrder:e.renderOrder,z:h,group:l},a[b]=m):(m.id=e.id,m.object=e,m.geometry=f,m.material=g,m.program=g.program,m.renderOrder=e.renderOrder,m.z=h,m.group=l);(!0===g.transparent?d:c).push(m);b++},sort:function(){1<c.length&&c.sort(Bg);1<d.length&&d.sort(Cg)}}}function Eg(){var a={};return{get:function(b,c){b=b.id+","+c.id;c=a[b];void 0===c&&(c=new Dg,a[b]=c);return c},dispose:function(){a={}}}}function Fg(){var a={};return{get:function(b){if(void 0!==a[b.id])return a[b.id];switch(b.type){case "DirectionalLight":var c=
{direction:new p,color:new G,shadow:!1,shadowBias:0,shadowRadius:1,shadowMapSize:new B};break;case "SpotLight":c={position:new p,direction:new p,color:new G,distance:0,coneCos:0,penumbraCos:0,decay:0,shadow:!1,shadowBias:0,shadowRadius:1,shadowMapSize:new B};break;case "PointLight":c={position:new p,color:new G,distance:0,decay:0,shadow:!1,shadowBias:0,shadowRadius:1,shadowMapSize:new B,shadowCameraNear:1,shadowCameraFar:1E3};break;case "HemisphereLight":c={direction:new p,skyColor:new G,groundColor:new G};
break;case "RectAreaLight":c={color:new G,position:new p,halfWidth:new p,halfHeight:new p}}return a[b.id]=c}}}function Gg(){var a=new Fg,b={id:Hg++,hash:"",ambient:[0,0,0],directional:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotShadowMap:[],spotShadowMatrix:[],rectArea:[],point:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[]},c=new p,d=new R,e=new R;return{setup:function(f,g,h){var l=0,m=0,v=0,n=0,t=0,q=0,r=0,k=0;h=h.matrixWorldInverse;for(var p=0,w=f.length;p<w;p++){var x=
f[p],A=x.color,C=x.intensity,O=x.distance,Q=x.shadow&&x.shadow.map?x.shadow.map.texture:null;if(x.isAmbientLight)l+=A.r*C,m+=A.g*C,v+=A.b*C;else if(x.isDirectionalLight){var M=a.get(x);M.color.copy(x.color).multiplyScalar(x.intensity);M.direction.setFromMatrixPosition(x.matrixWorld);c.setFromMatrixPosition(x.target.matrixWorld);M.direction.sub(c);M.direction.transformDirection(h);if(M.shadow=x.castShadow)A=x.shadow,M.shadowBias=A.bias,M.shadowRadius=A.radius,M.shadowMapSize=A.mapSize;b.directionalShadowMap[n]=
Q;b.directionalShadowMatrix[n]=x.shadow.matrix;b.directional[n]=M;n++}else if(x.isSpotLight){M=a.get(x);M.position.setFromMatrixPosition(x.matrixWorld);M.position.applyMatrix4(h);M.color.copy(A).multiplyScalar(C);M.distance=O;M.direction.setFromMatrixPosition(x.matrixWorld);c.setFromMatrixPosition(x.target.matrixWorld);M.direction.sub(c);M.direction.transformDirection(h);M.coneCos=Math.cos(x.angle);M.penumbraCos=Math.cos(x.angle*(1-x.penumbra));M.decay=0===x.distance?0:x.decay;if(M.shadow=x.castShadow)A=
x.shadow,M.shadowBias=A.bias,M.shadowRadius=A.radius,M.shadowMapSize=A.mapSize;b.spotShadowMap[q]=Q;b.spotShadowMatrix[q]=x.shadow.matrix;b.spot[q]=M;q++}else if(x.isRectAreaLight)M=a.get(x),M.color.copy(A).multiplyScalar(C),M.position.setFromMatrixPosition(x.matrixWorld),M.position.applyMatrix4(h),e.identity(),d.copy(x.matrixWorld),d.premultiply(h),e.extractRotation(d),M.halfWidth.set(.5*x.width,0,0),M.halfHeight.set(0,.5*x.height,0),M.halfWidth.applyMatrix4(e),M.halfHeight.applyMatrix4(e),b.rectArea[r]=
M,r++;else if(x.isPointLight){M=a.get(x);M.position.setFromMatrixPosition(x.matrixWorld);M.position.applyMatrix4(h);M.color.copy(x.color).multiplyScalar(x.intensity);M.distance=x.distance;M.decay=0===x.distance?0:x.decay;if(M.shadow=x.castShadow)A=x.shadow,M.shadowBias=A.bias,M.shadowRadius=A.radius,M.shadowMapSize=A.mapSize,M.shadowCameraNear=A.camera.near,M.shadowCameraFar=A.camera.far;b.pointShadowMap[t]=Q;b.pointShadowMatrix[t]=x.shadow.matrix;b.point[t]=M;t++}else x.isHemisphereLight&&(M=a.get(x),
M.direction.setFromMatrixPosition(x.matrixWorld),M.direction.transformDirection(h),M.direction.normalize(),M.skyColor.copy(x.color).multiplyScalar(C),M.groundColor.copy(x.groundColor).multiplyScalar(C),b.hemi[k]=M,k++)}b.ambient[0]=l;b.ambient[1]=m;b.ambient[2]=v;b.directional.length=n;b.spot.length=q;b.rectArea.length=r;b.point.length=t;b.hemi.length=k;b.hash=b.id+","+n+","+t+","+q+","+r+","+k+","+g.length},state:b}}function Ig(){var a=new Gg,b=[],c=[],d=[];return{init:function(){b.length=0;c.length=
0;d.length=0},state:{lightsArray:b,shadowsArray:c,spritesArray:d,lights:a},setupLights:function(d){a.setup(b,c,d)},pushLight:function(a){b.push(a)},pushShadow:function(a){c.push(a)},pushSprite:function(a){d.push(a)}}}function Jg(){var a={};return{get:function(b,c){b=b.id+","+c.id;c=a[b];void 0===c&&(c=new Ig,a[b]=c);return c},dispose:function(){a={}}}}function fb(a){I.call(this);this.type="MeshDepthMaterial";this.depthPacking=3200;this.morphTargets=this.skinning=!1;this.displacementMap=this.alphaMap=
this.map=null;this.displacementScale=1;this.displacementBias=0;this.wireframe=!1;this.wireframeLinewidth=1;this.lights=this.fog=!1;this.setValues(a)}function gb(a){I.call(this);this.type="MeshDistanceMaterial";this.referencePosition=new p;this.nearDistance=1;this.farDistance=1E3;this.morphTargets=this.skinning=!1;this.displacementMap=this.alphaMap=this.map=null;this.displacementScale=1;this.displacementBias=0;this.lights=this.fog=!1;this.setValues(a)}function $e(a,b,c){function d(b,c,d,e,f,g){var h=
b.geometry;var l=n;var m=b.customDepthMaterial;d&&(l=t,m=b.customDistanceMaterial);m?l=m:(m=!1,c.morphTargets&&(h&&h.isBufferGeometry?m=h.morphAttributes&&h.morphAttributes.position&&0<h.morphAttributes.position.length:h&&h.isGeometry&&(m=h.morphTargets&&0<h.morphTargets.length)),b.isSkinnedMesh&&!1===c.skinning&&console.warn("THREE.WebGLShadowMap: THREE.SkinnedMesh with material.skinning set to false:",b),b=b.isSkinnedMesh&&c.skinning,h=0,m&&(h|=1),b&&(h|=2),l=l[h]);a.localClippingEnabled&&!0===
c.clipShadows&&0!==c.clippingPlanes.length&&(h=l.uuid,m=c.uuid,b=q[h],void 0===b&&(b={},q[h]=b),h=b[m],void 0===h&&(h=l.clone(),b[m]=h),l=h);l.visible=c.visible;l.wireframe=c.wireframe;l.side=null!=c.shadowSide?c.shadowSide:r[c.side];l.clipShadows=c.clipShadows;l.clippingPlanes=c.clippingPlanes;l.clipIntersection=c.clipIntersection;l.wireframeLinewidth=c.wireframeLinewidth;l.linewidth=c.linewidth;d&&l.isMeshDistanceMaterial&&(l.referencePosition.copy(e),l.nearDistance=f,l.farDistance=g);return l}
function e(c,g,h,l){if(!1!==c.visible){if(c.layers.test(g.layers)&&(c.isMesh||c.isLine||c.isPoints)&&c.castShadow&&(!c.frustumCulled||f.intersectsObject(c))){c.modelViewMatrix.multiplyMatrices(h.matrixWorldInverse,c.matrixWorld);var m=b.update(c),n=c.material;if(Array.isArray(n))for(var t=m.groups,q=0,r=t.length;q<r;q++){var k=t[q],O=n[k.materialIndex];O&&O.visible&&(O=d(c,O,l,v,h.near,h.far),a.renderBufferDirect(h,null,m,O,c,k))}else n.visible&&(O=d(c,n,l,v,h.near,h.far),a.renderBufferDirect(h,null,
m,O,c,null))}c=c.children;m=0;for(n=c.length;m<n;m++)e(c[m],g,h,l)}}var f=new td,g=new R,h=new B,l=new B(c,c),m=new p,v=new p,n=Array(4),t=Array(4),q={},r={0:1,1:0,2:2},k=[new p(1,0,0),new p(-1,0,0),new p(0,0,1),new p(0,0,-1),new p(0,1,0),new p(0,-1,0)],y=[new p(0,1,0),new p(0,1,0),new p(0,1,0),new p(0,1,0),new p(0,0,1),new p(0,0,-1)],w=[new W,new W,new W,new W,new W,new W];for(c=0;4!==c;++c){var x=0!==(c&1),A=0!==(c&2),C=new fb({depthPacking:3201,morphTargets:x,skinning:A});n[c]=C;x=new gb({morphTargets:x,
skinning:A});t[c]=x}var O=this;this.enabled=!1;this.autoUpdate=!0;this.needsUpdate=!1;this.type=1;this.render=function(b,c,d){if(!1!==O.enabled&&(!1!==O.autoUpdate||!1!==O.needsUpdate)&&0!==b.length){var n=a.state;n.disable(a.context.BLEND);n.buffers.color.setClear(1,1,1,1);n.buffers.depth.setTest(!0);n.setScissorTest(!1);for(var t,q=0,r=b.length;q<r;q++){var u=b[q];t=u.shadow;var p=u&&u.isPointLight;if(void 0===t)console.warn("THREE.WebGLShadowMap:",u,"has no shadow.");else{var Q=t.camera;h.copy(t.mapSize);
h.min(l);if(p){var x=h.x,C=h.y;w[0].set(2*x,C,x,C);w[1].set(0,C,x,C);w[2].set(3*x,C,x,C);w[3].set(x,C,x,C);w[4].set(3*x,0,x,C);w[5].set(x,0,x,C);h.x*=4;h.y*=2}null===t.map&&(t.map=new kb(h.x,h.y,{minFilter:1003,magFilter:1003,format:1023}),t.map.texture.name=u.name+".shadowMap",Q.updateProjectionMatrix());t.isSpotLightShadow&&t.update(u);x=t.map;C=t.matrix;v.setFromMatrixPosition(u.matrixWorld);Q.position.copy(v);p?(t=6,C.makeTranslation(-v.x,-v.y,-v.z)):(t=1,m.setFromMatrixPosition(u.target.matrixWorld),
Q.lookAt(m),Q.updateMatrixWorld(),C.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),C.multiply(Q.projectionMatrix),C.multiply(Q.matrixWorldInverse));a.setRenderTarget(x);a.clear();for(u=0;u<t;u++)p&&(m.copy(Q.position),m.add(k[u]),Q.up.copy(y[u]),Q.lookAt(m),Q.updateMatrixWorld(),n.viewport(w[u])),g.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),f.setFromMatrix(g),e(c,d,Q,p)}}O.needsUpdate=!1}}}function Sb(a,b,c,d,e,f,g,h,l){ea.call(this,a,b,c,d,e,f,g,h,l);this.needsUpdate=!0}function Kg(a,
b,c,d,e){var f,g,h,l,m,v,n,t,q,r,k,y,w,x,A,C,O,Q;function M(a,b){return a.renderOrder!==b.renderOrder?a.renderOrder-b.renderOrder:a.z!==b.z?b.z-a.z:b.id-a.id}var B,qb,U,z,Ec=new p,H=new ca,D=new p;this.render=function(u,p,Ob){if(0!==u.length){if(void 0===U){var sa=new Float32Array([-.5,-.5,0,0,.5,-.5,1,0,.5,.5,1,1,-.5,.5,0,1]),Ca=new Uint16Array([0,1,2,0,2,3]);B=b.createBuffer();qb=b.createBuffer();b.bindBuffer(b.ARRAY_BUFFER,B);b.bufferData(b.ARRAY_BUFFER,sa,b.STATIC_DRAW);b.bindBuffer(b.ELEMENT_ARRAY_BUFFER,
qb);b.bufferData(b.ELEMENT_ARRAY_BUFFER,Ca,b.STATIC_DRAW);sa=b.createProgram();Ca=b.createShader(b.VERTEX_SHADER);var G=b.createShader(b.FRAGMENT_SHADER);b.shaderSource(Ca,["precision "+e.precision+" float;","#define SHADER_NAME SpriteMaterial\nuniform mat4 modelViewMatrix;\nuniform mat4 projectionMatrix;\nuniform float rotation;\nuniform vec2 center;\nuniform vec2 scale;\nuniform vec2 uvOffset;\nuniform vec2 uvScale;\nattribute vec2 position;\nattribute vec2 uv;\nvarying vec2 vUV;\nvarying float fogDepth;\nvoid main() {\n\tvUV = uvOffset + uv * uvScale;\n\tvec2 alignedPosition = ( position - center ) * scale;\n\tvec2 rotatedPosition;\n\trotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;\n\trotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;\n\tvec4 mvPosition;\n\tmvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );\n\tmvPosition.xy += rotatedPosition;\n\tgl_Position = projectionMatrix * mvPosition;\n\tfogDepth = - mvPosition.z;\n}"].join("\n"));
b.shaderSource(G,["precision "+e.precision+" float;","#define SHADER_NAME SpriteMaterial\nuniform vec3 color;\nuniform sampler2D map;\nuniform float opacity;\nuniform int fogType;\nuniform vec3 fogColor;\nuniform float fogDensity;\nuniform float fogNear;\nuniform float fogFar;\nuniform float alphaTest;\nvarying vec2 vUV;\nvarying float fogDepth;\nvoid main() {\n\tvec4 texture = texture2D( map, vUV );\n\tgl_FragColor = vec4( color * texture.xyz, texture.a * opacity );\n\tif ( gl_FragColor.a < alphaTest ) discard;\n\tif ( fogType > 0 ) {\n\t\tfloat fogFactor = 0.0;\n\t\tif ( fogType == 1 ) {\n\t\t\tfogFactor = smoothstep( fogNear, fogFar, fogDepth );\n\t\t} else {\n\t\t\tconst float LOG2 = 1.442695;\n\t\t\tfogFactor = exp2( - fogDensity * fogDensity * fogDepth * fogDepth * LOG2 );\n\t\t\tfogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );\n\t\t}\n\t\tgl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n\t}\n}"].join("\n"));
b.compileShader(Ca);b.compileShader(G);b.attachShader(sa,Ca);b.attachShader(sa,G);b.linkProgram(sa);U=sa;O=b.getAttribLocation(U,"position");Q=b.getAttribLocation(U,"uv");f=b.getUniformLocation(U,"uvOffset");g=b.getUniformLocation(U,"uvScale");h=b.getUniformLocation(U,"rotation");l=b.getUniformLocation(U,"center");m=b.getUniformLocation(U,"scale");v=b.getUniformLocation(U,"color");n=b.getUniformLocation(U,"map");t=b.getUniformLocation(U,"opacity");q=b.getUniformLocation(U,"modelViewMatrix");r=b.getUniformLocation(U,
"projectionMatrix");k=b.getUniformLocation(U,"fogType");y=b.getUniformLocation(U,"fogDensity");w=b.getUniformLocation(U,"fogNear");x=b.getUniformLocation(U,"fogFar");A=b.getUniformLocation(U,"fogColor");b.getUniformLocation(U,"fogDepth");C=b.getUniformLocation(U,"alphaTest");sa=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");sa.width=8;sa.height=8;Ca=sa.getContext("2d");Ca.fillStyle="white";Ca.fillRect(0,0,8,8);z=new Sb(sa)}c.useProgram(U);c.initAttributes();c.enableAttribute(O);
c.enableAttribute(Q);c.disableUnusedAttributes();c.disable(b.CULL_FACE);c.enable(b.BLEND);b.bindBuffer(b.ARRAY_BUFFER,B);b.vertexAttribPointer(O,2,b.FLOAT,!1,16,0);b.vertexAttribPointer(Q,2,b.FLOAT,!1,16,8);b.bindBuffer(b.ELEMENT_ARRAY_BUFFER,qb);b.uniformMatrix4fv(r,!1,Ob.projectionMatrix.elements);c.activeTexture(b.TEXTURE0);b.uniform1i(n,0);Ca=sa=0;(G=p.fog)?(b.uniform3f(A,G.color.r,G.color.g,G.color.b),G.isFog?(b.uniform1f(w,G.near),b.uniform1f(x,G.far),b.uniform1i(k,1),Ca=sa=1):G.isFogExp2&&
(b.uniform1f(y,G.density),b.uniform1i(k,2),Ca=sa=2)):(b.uniform1i(k,0),Ca=sa=0);G=0;for(var K=u.length;G<K;G++){var E=u[G];E.modelViewMatrix.multiplyMatrices(Ob.matrixWorldInverse,E.matrixWorld);E.z=-E.modelViewMatrix.elements[14]}u.sort(M);var P=[],R=[];G=0;for(K=u.length;G<K;G++){E=u[G];var V=E.material;if(!1!==V.visible){E.onBeforeRender(a,p,Ob,void 0,V,void 0);b.uniform1f(C,V.alphaTest);b.uniformMatrix4fv(q,!1,E.modelViewMatrix.elements);E.matrixWorld.decompose(Ec,H,D);P[0]=D.x;P[1]=D.y;R[0]=
E.center.x-.5;R[1]=E.center.y-.5;var N=0;p.fog&&V.fog&&(N=Ca);sa!==N&&(b.uniform1i(k,N),sa=N);null!==V.map?(b.uniform2f(f,V.map.offset.x,V.map.offset.y),b.uniform2f(g,V.map.repeat.x,V.map.repeat.y)):(b.uniform2f(f,0,0),b.uniform2f(g,1,1));b.uniform1f(t,V.opacity);b.uniform3f(v,V.color.r,V.color.g,V.color.b);b.uniform1f(h,V.rotation);b.uniform2fv(l,R);b.uniform2fv(m,P);c.setBlending(V.blending,V.blendEquation,V.blendSrc,V.blendDst,V.blendEquationAlpha,V.blendSrcAlpha,V.blendDstAlpha,V.premultipliedAlpha);
c.buffers.depth.setTest(V.depthTest);c.buffers.depth.setMask(V.depthWrite);c.buffers.color.setMask(V.colorWrite);d.setTexture2D(V.map||z,0);b.drawElements(b.TRIANGLES,6,b.UNSIGNED_SHORT,0);E.onAfterRender(a,p,Ob,void 0,V,void 0)}}c.enable(b.CULL_FACE);c.reset()}}}function Lg(a,b,c){function d(b,c,d){var e=new Uint8Array(4),f=a.createTexture();a.bindTexture(b,f);a.texParameteri(b,a.TEXTURE_MIN_FILTER,a.NEAREST);a.texParameteri(b,a.TEXTURE_MAG_FILTER,a.NEAREST);for(b=0;b<d;b++)a.texImage2D(c+b,0,a.RGBA,
1,1,0,a.RGBA,a.UNSIGNED_BYTE,e);return f}function e(c,d){p[c]=1;0===w[c]&&(a.enableVertexAttribArray(c),w[c]=1);x[c]!==d&&(b.get("ANGLE_instanced_arrays").vertexAttribDivisorANGLE(c,d),x[c]=d)}function f(b){!0!==A[b]&&(a.enable(b),A[b]=!0)}function g(b){!1!==A[b]&&(a.disable(b),A[b]=!1)}function h(b,d,e,h,l,m,n,v){0!==b?f(a.BLEND):g(a.BLEND);if(5!==b){if(b!==Q||v!==sa)switch(b){case 2:v?(a.blendEquationSeparate(a.FUNC_ADD,a.FUNC_ADD),a.blendFuncSeparate(a.ONE,a.ONE,a.ONE,a.ONE)):(a.blendEquation(a.FUNC_ADD),
a.blendFunc(a.SRC_ALPHA,a.ONE));break;case 3:v?(a.blendEquationSeparate(a.FUNC_ADD,a.FUNC_ADD),a.blendFuncSeparate(a.ZERO,a.ZERO,a.ONE_MINUS_SRC_COLOR,a.ONE_MINUS_SRC_ALPHA)):(a.blendEquation(a.FUNC_ADD),a.blendFunc(a.ZERO,a.ONE_MINUS_SRC_COLOR));break;case 4:v?(a.blendEquationSeparate(a.FUNC_ADD,a.FUNC_ADD),a.blendFuncSeparate(a.ZERO,a.SRC_COLOR,a.ZERO,a.SRC_ALPHA)):(a.blendEquation(a.FUNC_ADD),a.blendFunc(a.ZERO,a.SRC_COLOR));break;default:v?(a.blendEquationSeparate(a.FUNC_ADD,a.FUNC_ADD),a.blendFuncSeparate(a.ONE,
a.ONE_MINUS_SRC_ALPHA,a.ONE,a.ONE_MINUS_SRC_ALPHA)):(a.blendEquationSeparate(a.FUNC_ADD,a.FUNC_ADD),a.blendFuncSeparate(a.SRC_ALPHA,a.ONE_MINUS_SRC_ALPHA,a.ONE,a.ONE_MINUS_SRC_ALPHA))}Ec=z=U=qb=B=M=null}else{l=l||d;m=m||e;n=n||h;if(d!==M||l!==U)a.blendEquationSeparate(c.convert(d),c.convert(l)),M=d,U=l;if(e!==B||h!==qb||m!==z||n!==Ec)a.blendFuncSeparate(c.convert(e),c.convert(h),c.convert(m),c.convert(n)),B=e,qb=h,z=m,Ec=n}Q=b;sa=v}function l(b){G!==b&&(b?a.frontFace(a.CW):a.frontFace(a.CCW),G=b)}
function m(b){0!==b?(f(a.CULL_FACE),b!==H&&(1===b?a.cullFace(a.BACK):2===b?a.cullFace(a.FRONT):a.cullFace(a.FRONT_AND_BACK))):g(a.CULL_FACE);H=b}function v(b,c,d){if(b){if(f(a.POLYGON_OFFSET_FILL),E!==c||K!==d)a.polygonOffset(c,d),E=c,K=d}else g(a.POLYGON_OFFSET_FILL)}function n(b){void 0===b&&(b=a.TEXTURE0+P-1);I!==b&&(a.activeTexture(b),I=b)}var t=new function(){var b=!1,c=new W,d=null,e=new W(0,0,0,0);return{setMask:function(c){d===c||b||(a.colorMask(c,c,c,c),d=c)},setLocked:function(a){b=a},setClear:function(b,
d,f,g,h){!0===h&&(b*=g,d*=g,f*=g);c.set(b,d,f,g);!1===e.equals(c)&&(a.clearColor(b,d,f,g),e.copy(c))},reset:function(){b=!1;d=null;e.set(-1,0,0,0)}}},q=new function(){var b=!1,c=null,d=null,e=null;return{setTest:function(b){b?f(a.DEPTH_TEST):g(a.DEPTH_TEST)},setMask:function(d){c===d||b||(a.depthMask(d),c=d)},setFunc:function(b){if(d!==b){if(b)switch(b){case 0:a.depthFunc(a.NEVER);break;case 1:a.depthFunc(a.ALWAYS);break;case 2:a.depthFunc(a.LESS);break;case 3:a.depthFunc(a.LEQUAL);break;case 4:a.depthFunc(a.EQUAL);
break;case 5:a.depthFunc(a.GEQUAL);break;case 6:a.depthFunc(a.GREATER);break;case 7:a.depthFunc(a.NOTEQUAL);break;default:a.depthFunc(a.LEQUAL)}else a.depthFunc(a.LEQUAL);d=b}},setLocked:function(a){b=a},setClear:function(b){e!==b&&(a.clearDepth(b),e=b)},reset:function(){b=!1;e=d=c=null}}},k=new function(){var b=!1,c=null,d=null,e=null,h=null,l=null,m=null,n=null,v=null;return{setTest:function(b){b?f(a.STENCIL_TEST):g(a.STENCIL_TEST)},setMask:function(d){c===d||b||(a.stencilMask(d),c=d)},setFunc:function(b,
c,f){if(d!==b||e!==c||h!==f)a.stencilFunc(b,c,f),d=b,e=c,h=f},setOp:function(b,c,d){if(l!==b||m!==c||n!==d)a.stencilOp(b,c,d),l=b,m=c,n=d},setLocked:function(a){b=a},setClear:function(b){v!==b&&(a.clearStencil(b),v=b)},reset:function(){b=!1;v=n=m=l=h=e=d=c=null}}},u=a.getParameter(a.MAX_VERTEX_ATTRIBS),p=new Uint8Array(u),w=new Uint8Array(u),x=new Uint8Array(u),A={},C=null,O=null,Q=null,M=null,B=null,qb=null,U=null,z=null,Ec=null,sa=!1,G=null,H=null,D=null,E=null,K=null,P=a.getParameter(a.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
R=!1;u=0;u=a.getParameter(a.VERSION);-1!==u.indexOf("WebGL")?(u=parseFloat(/^WebGL ([0-9])/.exec(u)[1]),R=1<=u):-1!==u.indexOf("OpenGL ES")&&(u=parseFloat(/^OpenGL ES ([0-9])/.exec(u)[1]),R=2<=u);var I=null,L={},J=new W,fa=new W,V={};V[a.TEXTURE_2D]=d(a.TEXTURE_2D,a.TEXTURE_2D,1);V[a.TEXTURE_CUBE_MAP]=d(a.TEXTURE_CUBE_MAP,a.TEXTURE_CUBE_MAP_POSITIVE_X,6);t.setClear(0,0,0,1);q.setClear(1);k.setClear(0);f(a.DEPTH_TEST);q.setFunc(3);l(!1);m(1);f(a.CULL_FACE);f(a.BLEND);h(1);return{buffers:{color:t,depth:q,
stencil:k},initAttributes:function(){for(var a=0,b=p.length;a<b;a++)p[a]=0},enableAttribute:function(a){e(a,0)},enableAttributeAndDivisor:e,disableUnusedAttributes:function(){for(var b=0,c=w.length;b!==c;++b)w[b]!==p[b]&&(a.disableVertexAttribArray(b),w[b]=0)},enable:f,disable:g,getCompressedTextureFormats:function(){if(null===C&&(C=[],b.get("WEBGL_compressed_texture_pvrtc")||b.get("WEBGL_compressed_texture_s3tc")||b.get("WEBGL_compressed_texture_etc1")||b.get("WEBGL_compressed_texture_astc")))for(var c=
a.getParameter(a.COMPRESSED_TEXTURE_FORMATS),d=0;d<c.length;d++)C.push(c[d]);return C},useProgram:function(b){return O!==b?(a.useProgram(b),O=b,!0):!1},setBlending:h,setMaterial:function(b,c){2===b.side?g(a.CULL_FACE):f(a.CULL_FACE);var d=1===b.side;c&&(d=!d);l(d);1===b.blending&&!1===b.transparent?h(0):h(b.blending,b.blendEquation,b.blendSrc,b.blendDst,b.blendEquationAlpha,b.blendSrcAlpha,b.blendDstAlpha,b.premultipliedAlpha);q.setFunc(b.depthFunc);q.setTest(b.depthTest);q.setMask(b.depthWrite);
t.setMask(b.colorWrite);v(b.polygonOffset,b.polygonOffsetFactor,b.polygonOffsetUnits)},setFlipSided:l,setCullFace:m,setLineWidth:function(b){b!==D&&(R&&a.lineWidth(b),D=b)},setPolygonOffset:v,setScissorTest:function(b){b?f(a.SCISSOR_TEST):g(a.SCISSOR_TEST)},activeTexture:n,bindTexture:function(b,c){null===I&&n();var d=L[I];void 0===d&&(d={type:void 0,texture:void 0},L[I]=d);if(d.type!==b||d.texture!==c)a.bindTexture(b,c||V[b]),d.type=b,d.texture=c},compressedTexImage2D:function(){try{a.compressedTexImage2D.apply(a,
arguments)}catch(N){console.error("THREE.WebGLState:",N)}},texImage2D:function(){try{a.texImage2D.apply(a,arguments)}catch(N){console.error("THREE.WebGLState:",N)}},scissor:function(b){!1===J.equals(b)&&(a.scissor(b.x,b.y,b.z,b.w),J.copy(b))},viewport:function(b){!1===fa.equals(b)&&(a.viewport(b.x,b.y,b.z,b.w),fa.copy(b))},reset:function(){for(var b=0;b<w.length;b++)1===w[b]&&(a.disableVertexAttribArray(b),w[b]=0);A={};I=C=null;L={};H=G=Q=O=null;t.reset();q.reset();k.reset()}}}function Mg(a,b,c,d,
e,f,g){function h(a,b){if(a.width>b||a.height>b){if("data"in a){console.warn("THREE.WebGLRenderer: image in DataTexture is too big ("+a.width+"x"+a.height+").");return}b/=Math.max(a.width,a.height);var c=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");c.width=Math.floor(a.width*b);c.height=Math.floor(a.height*b);c.getContext("2d").drawImage(a,0,0,a.width,a.height,0,0,c.width,c.height);console.warn("THREE.WebGLRenderer: image is too big ("+a.width+"x"+a.height+"). Resized to "+c.width+
"x"+c.height,a);return c}return a}function l(a){return J.isPowerOfTwo(a.width)&&J.isPowerOfTwo(a.height)}function m(a,b){return a.generateMipmaps&&b&&1003!==a.minFilter&&1006!==a.minFilter}function v(b,c,e,f){a.generateMipmap(b);d.get(c).__maxMipLevel=Math.log(Math.max(e,f))*Math.LOG2E}function n(b){return 1003===b||1004===b||1005===b?a.NEAREST:a.LINEAR}function t(b){b=b.target;b.removeEventListener("dispose",t);a:{var c=d.get(b);if(b.image&&c.__image__webglTextureCube)a.deleteTexture(c.__image__webglTextureCube);
else{if(void 0===c.__webglInit)break a;a.deleteTexture(c.__webglTexture)}d.remove(b)}b.isVideoTexture&&delete A[b.id];g.memory.textures--}function q(b){b=b.target;b.removeEventListener("dispose",q);var c=d.get(b),e=d.get(b.texture);if(b){void 0!==e.__webglTexture&&a.deleteTexture(e.__webglTexture);b.depthTexture&&b.depthTexture.dispose();if(b.isWebGLRenderTargetCube)for(e=0;6>e;e++)a.deleteFramebuffer(c.__webglFramebuffer[e]),c.__webglDepthbuffer&&a.deleteRenderbuffer(c.__webglDepthbuffer[e]);else a.deleteFramebuffer(c.__webglFramebuffer),
c.__webglDepthbuffer&&a.deleteRenderbuffer(c.__webglDepthbuffer);d.remove(b.texture);d.remove(b)}g.memory.textures--}function k(b,n){var q=d.get(b);if(b.isVideoTexture){var k=b.id,r=g.render.frame;A[k]!==r&&(A[k]=r,b.update())}if(0<b.version&&q.__version!==b.version)if(k=b.image,void 0===k)console.warn("THREE.WebGLRenderer: Texture marked for update but image is undefined",b);else if(!1===k.complete)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete",b);else{void 0===
q.__webglInit&&(q.__webglInit=!0,b.addEventListener("dispose",t),q.__webglTexture=a.createTexture(),g.memory.textures++);c.activeTexture(a.TEXTURE0+n);c.bindTexture(a.TEXTURE_2D,q.__webglTexture);a.pixelStorei(a.UNPACK_FLIP_Y_WEBGL,b.flipY);a.pixelStorei(a.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha);a.pixelStorei(a.UNPACK_ALIGNMENT,b.unpackAlignment);n=h(b.image,e.maxTextureSize);(1001!==b.wrapS||1001!==b.wrapT||1003!==b.minFilter&&1006!==b.minFilter)&&!1===l(n)&&(n instanceof HTMLImageElement||
n instanceof HTMLCanvasElement||n instanceof ImageBitmap)&&(void 0===C&&(C=document.createElementNS("http://www.w3.org/1999/xhtml","canvas")),C.width=J.floorPowerOfTwo(n.width),C.height=J.floorPowerOfTwo(n.height),C.getContext("2d").drawImage(n,0,0,C.width,C.height),console.warn("THREE.WebGLRenderer: image is not power of two ("+n.width+"x"+n.height+"). Resized to "+C.width+"x"+C.height,n),n=C);k=l(n);r=f.convert(b.format);var p=f.convert(b.type);u(a.TEXTURE_2D,b,k);var O=b.mipmaps;if(b.isDepthTexture){var y=
a.DEPTH_COMPONENT;if(1015===b.type){if(!x)throw Error("Float Depth Texture only supported in WebGL2.0");y=a.DEPTH_COMPONENT32F}else x&&(y=a.DEPTH_COMPONENT16);1026===b.format&&y===a.DEPTH_COMPONENT&&1012!==b.type&&1014!==b.type&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),b.type=1012,p=f.convert(b.type));1027===b.format&&(y=a.DEPTH_STENCIL,1020!==b.type&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),
b.type=1020,p=f.convert(b.type)));c.texImage2D(a.TEXTURE_2D,0,y,n.width,n.height,0,r,p,null)}else if(b.isDataTexture)if(0<O.length&&k){for(var Q=0,w=O.length;Q<w;Q++)y=O[Q],c.texImage2D(a.TEXTURE_2D,Q,r,y.width,y.height,0,r,p,y.data);b.generateMipmaps=!1;q.__maxMipLevel=O.length-1}else c.texImage2D(a.TEXTURE_2D,0,r,n.width,n.height,0,r,p,n.data),q.__maxMipLevel=0;else if(b.isCompressedTexture){Q=0;for(w=O.length;Q<w;Q++)y=O[Q],1023!==b.format&&1022!==b.format?-1<c.getCompressedTextureFormats().indexOf(r)?
c.compressedTexImage2D(a.TEXTURE_2D,Q,r,y.width,y.height,0,y.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):c.texImage2D(a.TEXTURE_2D,Q,r,y.width,y.height,0,r,p,y.data);q.__maxMipLevel=O.length-1}else if(0<O.length&&k){Q=0;for(w=O.length;Q<w;Q++)y=O[Q],c.texImage2D(a.TEXTURE_2D,Q,r,r,p,y);b.generateMipmaps=!1;q.__maxMipLevel=O.length-1}else c.texImage2D(a.TEXTURE_2D,0,r,r,p,n),q.__maxMipLevel=0;m(b,k)&&v(a.TEXTURE_2D,b,n.width,
n.height);q.__version=b.version;if(b.onUpdate)b.onUpdate(b);return}c.activeTexture(a.TEXTURE0+n);c.bindTexture(a.TEXTURE_2D,q.__webglTexture)}function u(c,g,h){h?(a.texParameteri(c,a.TEXTURE_WRAP_S,f.convert(g.wrapS)),a.texParameteri(c,a.TEXTURE_WRAP_T,f.convert(g.wrapT)),a.texParameteri(c,a.TEXTURE_MAG_FILTER,f.convert(g.magFilter)),a.texParameteri(c,a.TEXTURE_MIN_FILTER,f.convert(g.minFilter))):(a.texParameteri(c,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(c,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),
1001===g.wrapS&&1001===g.wrapT||console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping.",g),a.texParameteri(c,a.TEXTURE_MAG_FILTER,n(g.magFilter)),a.texParameteri(c,a.TEXTURE_MIN_FILTER,n(g.minFilter)),1003!==g.minFilter&&1006!==g.minFilter&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.",g));!(h=b.get("EXT_texture_filter_anisotropic"))||
1015===g.type&&null===b.get("OES_texture_float_linear")||1016===g.type&&null===b.get("OES_texture_half_float_linear")||!(1<g.anisotropy||d.get(g).__currentAnisotropy)||(a.texParameterf(c,h.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(g.anisotropy,e.getMaxAnisotropy())),d.get(g).__currentAnisotropy=g.anisotropy)}function p(b,e,g,h){var l=f.convert(e.texture.format),m=f.convert(e.texture.type);c.texImage2D(h,0,l,e.width,e.height,0,l,m,null);a.bindFramebuffer(a.FRAMEBUFFER,b);a.framebufferTexture2D(a.FRAMEBUFFER,
g,h,d.get(e.texture).__webglTexture,0);a.bindFramebuffer(a.FRAMEBUFFER,null)}function w(b,c){a.bindRenderbuffer(a.RENDERBUFFER,b);c.depthBuffer&&!c.stencilBuffer?(a.renderbufferStorage(a.RENDERBUFFER,a.DEPTH_COMPONENT16,c.width,c.height),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.DEPTH_ATTACHMENT,a.RENDERBUFFER,b)):c.depthBuffer&&c.stencilBuffer?(a.renderbufferStorage(a.RENDERBUFFER,a.DEPTH_STENCIL,c.width,c.height),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.DEPTH_STENCIL_ATTACHMENT,a.RENDERBUFFER,
b)):a.renderbufferStorage(a.RENDERBUFFER,a.RGBA4,c.width,c.height);a.bindRenderbuffer(a.RENDERBUFFER,null)}var x="undefined"!==typeof WebGL2RenderingContext&&a instanceof WebGL2RenderingContext,A={},C;this.setTexture2D=k;this.setTextureCube=function(b,n){var q=d.get(b);if(6===b.image.length)if(0<b.version&&q.__version!==b.version){q.__image__webglTextureCube||(b.addEventListener("dispose",t),q.__image__webglTextureCube=a.createTexture(),g.memory.textures++);c.activeTexture(a.TEXTURE0+n);c.bindTexture(a.TEXTURE_CUBE_MAP,
q.__image__webglTextureCube);a.pixelStorei(a.UNPACK_FLIP_Y_WEBGL,b.flipY);n=b&&b.isCompressedTexture;for(var k=b.image[0]&&b.image[0].isDataTexture,r=[],p=0;6>p;p++)r[p]=n||k?k?b.image[p].image:b.image[p]:h(b.image[p],e.maxCubemapSize);var x=r[0],y=l(x),C=f.convert(b.format),w=f.convert(b.type);u(a.TEXTURE_CUBE_MAP,b,y);for(p=0;6>p;p++)if(n)for(var O,Q=r[p].mipmaps,A=0,B=Q.length;A<B;A++)O=Q[A],1023!==b.format&&1022!==b.format?-1<c.getCompressedTextureFormats().indexOf(C)?c.compressedTexImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X+
p,A,C,O.width,O.height,0,O.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):c.texImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X+p,A,C,O.width,O.height,0,C,w,O.data);else k?c.texImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X+p,0,C,r[p].width,r[p].height,0,C,w,r[p].data):c.texImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X+p,0,C,C,w,r[p]);q.__maxMipLevel=n?Q.length-1:0;m(b,y)&&v(a.TEXTURE_CUBE_MAP,b,x.width,x.height);q.__version=b.version;if(b.onUpdate)b.onUpdate(b)}else c.activeTexture(a.TEXTURE0+
n),c.bindTexture(a.TEXTURE_CUBE_MAP,q.__image__webglTextureCube)};this.setTextureCubeDynamic=function(b,e){c.activeTexture(a.TEXTURE0+e);c.bindTexture(a.TEXTURE_CUBE_MAP,d.get(b).__webglTexture)};this.setupRenderTarget=function(b){var e=d.get(b),f=d.get(b.texture);b.addEventListener("dispose",q);f.__webglTexture=a.createTexture();g.memory.textures++;var h=!0===b.isWebGLRenderTargetCube,n=l(b);if(h){e.__webglFramebuffer=[];for(var t=0;6>t;t++)e.__webglFramebuffer[t]=a.createFramebuffer()}else e.__webglFramebuffer=
a.createFramebuffer();if(h){c.bindTexture(a.TEXTURE_CUBE_MAP,f.__webglTexture);u(a.TEXTURE_CUBE_MAP,b.texture,n);for(t=0;6>t;t++)p(e.__webglFramebuffer[t],b,a.COLOR_ATTACHMENT0,a.TEXTURE_CUBE_MAP_POSITIVE_X+t);m(b.texture,n)&&v(a.TEXTURE_CUBE_MAP,b.texture,b.width,b.height);c.bindTexture(a.TEXTURE_CUBE_MAP,null)}else c.bindTexture(a.TEXTURE_2D,f.__webglTexture),u(a.TEXTURE_2D,b.texture,n),p(e.__webglFramebuffer,b,a.COLOR_ATTACHMENT0,a.TEXTURE_2D),m(b.texture,n)&&v(a.TEXTURE_2D,b.texture,b.width,b.height),
c.bindTexture(a.TEXTURE_2D,null);if(b.depthBuffer){e=d.get(b);f=!0===b.isWebGLRenderTargetCube;if(b.depthTexture){if(f)throw Error("target.depthTexture not supported in Cube render targets");if(b&&b.isWebGLRenderTargetCube)throw Error("Depth Texture with cube render targets is not supported");a.bindFramebuffer(a.FRAMEBUFFER,e.__webglFramebuffer);if(!b.depthTexture||!b.depthTexture.isDepthTexture)throw Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");d.get(b.depthTexture).__webglTexture&&
b.depthTexture.image.width===b.width&&b.depthTexture.image.height===b.height||(b.depthTexture.image.width=b.width,b.depthTexture.image.height=b.height,b.depthTexture.needsUpdate=!0);k(b.depthTexture,0);e=d.get(b.depthTexture).__webglTexture;if(1026===b.depthTexture.format)a.framebufferTexture2D(a.FRAMEBUFFER,a.DEPTH_ATTACHMENT,a.TEXTURE_2D,e,0);else if(1027===b.depthTexture.format)a.framebufferTexture2D(a.FRAMEBUFFER,a.DEPTH_STENCIL_ATTACHMENT,a.TEXTURE_2D,e,0);else throw Error("Unknown depthTexture format");
}else if(f)for(e.__webglDepthbuffer=[],f=0;6>f;f++)a.bindFramebuffer(a.FRAMEBUFFER,e.__webglFramebuffer[f]),e.__webglDepthbuffer[f]=a.createRenderbuffer(),w(e.__webglDepthbuffer[f],b);else a.bindFramebuffer(a.FRAMEBUFFER,e.__webglFramebuffer),e.__webglDepthbuffer=a.createRenderbuffer(),w(e.__webglDepthbuffer,b);a.bindFramebuffer(a.FRAMEBUFFER,null)}};this.updateRenderTargetMipmap=function(b){var e=b.texture,f=l(b);if(m(e,f)){f=b.isWebGLRenderTargetCube?a.TEXTURE_CUBE_MAP:a.TEXTURE_2D;var g=d.get(e).__webglTexture;
c.bindTexture(f,g);v(f,e,b.width,b.height);c.bindTexture(f,null)}}}function af(a,b){return{convert:function(c){if(1E3===c)return a.REPEAT;if(1001===c)return a.CLAMP_TO_EDGE;if(1002===c)return a.MIRRORED_REPEAT;if(1003===c)return a.NEAREST;if(1004===c)return a.NEAREST_MIPMAP_NEAREST;if(1005===c)return a.NEAREST_MIPMAP_LINEAR;if(1006===c)return a.LINEAR;if(1007===c)return a.LINEAR_MIPMAP_NEAREST;if(1008===c)return a.LINEAR_MIPMAP_LINEAR;if(1009===c)return a.UNSIGNED_BYTE;if(1017===c)return a.UNSIGNED_SHORT_4_4_4_4;
if(1018===c)return a.UNSIGNED_SHORT_5_5_5_1;if(1019===c)return a.UNSIGNED_SHORT_5_6_5;if(1010===c)return a.BYTE;if(1011===c)return a.SHORT;if(1012===c)return a.UNSIGNED_SHORT;if(1013===c)return a.INT;if(1014===c)return a.UNSIGNED_INT;if(1015===c)return a.FLOAT;if(1016===c){var d=b.get("OES_texture_half_float");if(null!==d)return d.HALF_FLOAT_OES}if(1021===c)return a.ALPHA;if(1022===c)return a.RGB;if(1023===c)return a.RGBA;if(1024===c)return a.LUMINANCE;if(1025===c)return a.LUMINANCE_ALPHA;if(1026===
c)return a.DEPTH_COMPONENT;if(1027===c)return a.DEPTH_STENCIL;if(100===c)return a.FUNC_ADD;if(101===c)return a.FUNC_SUBTRACT;if(102===c)return a.FUNC_REVERSE_SUBTRACT;if(200===c)return a.ZERO;if(201===c)return a.ONE;if(202===c)return a.SRC_COLOR;if(203===c)return a.ONE_MINUS_SRC_COLOR;if(204===c)return a.SRC_ALPHA;if(205===c)return a.ONE_MINUS_SRC_ALPHA;if(206===c)return a.DST_ALPHA;if(207===c)return a.ONE_MINUS_DST_ALPHA;if(208===c)return a.DST_COLOR;if(209===c)return a.ONE_MINUS_DST_COLOR;if(210===
c)return a.SRC_ALPHA_SATURATE;if(33776===c||33777===c||33778===c||33779===c)if(d=b.get("WEBGL_compressed_texture_s3tc"),null!==d){if(33776===c)return d.COMPRESSED_RGB_S3TC_DXT1_EXT;if(33777===c)return d.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(33778===c)return d.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(33779===c)return d.COMPRESSED_RGBA_S3TC_DXT5_EXT}if(35840===c||35841===c||35842===c||35843===c)if(d=b.get("WEBGL_compressed_texture_pvrtc"),null!==d){if(35840===c)return d.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(35841===
c)return d.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(35842===c)return d.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(35843===c)return d.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}if(36196===c&&(d=b.get("WEBGL_compressed_texture_etc1"),null!==d))return d.COMPRESSED_RGB_ETC1_WEBGL;if(37808===c||37809===c||37810===c||37811===c||37812===c||37813===c||37814===c||37815===c||37816===c||37817===c||37818===c||37819===c||37820===c||37821===c)if(d=b.get("WEBGL_compressed_texture_astc"),null!==d)return c;if(103===c||104===c)if(d=b.get("EXT_blend_minmax"),
null!==d){if(103===c)return d.MIN_EXT;if(104===c)return d.MAX_EXT}return 1020===c&&(d=b.get("WEBGL_depth_texture"),null!==d)?d.UNSIGNED_INT_24_8_WEBGL:0}}}function Ub(){H.call(this);this.type="Group"}function Z(a,b,c,d){Ra.call(this);this.type="PerspectiveCamera";this.fov=void 0!==a?a:50;this.zoom=1;this.near=void 0!==c?c:.1;this.far=void 0!==d?d:2E3;this.focus=10;this.aspect=void 0!==b?b:1;this.view=null;this.filmGauge=35;this.filmOffset=0;this.updateProjectionMatrix()}function Hc(a){Z.call(this);
this.cameras=a||[]}function bf(a){function b(){return null!==e&&!0===e.isPresenting}function c(){if(b()){var c=e.getEyeParameters("left"),f=c.renderWidth;c=c.renderHeight;w=a.getPixelRatio();y=a.getSize();a.setDrawingBufferSize(2*f,c,1);A.start()}else d.enabled&&(a.setDrawingBufferSize(y.width,y.height,w),A.stop())}var d=this,e=null,f=null,g=null,h=[],l=new R,m=new R;"undefined"!==typeof window&&"VRFrameData"in window&&(f=new window.VRFrameData,window.addEventListener("vrdisplaypresentchange",c,!1));
var v=new R,n=new ca,t=new p,q=new Z;q.bounds=new W(0,0,.5,1);q.layers.enable(1);var k=new Z;k.bounds=new W(.5,0,.5,1);k.layers.enable(2);var u=new Hc([q,k]);u.layers.enable(1);u.layers.enable(2);var y,w,x=!1;this.enabled=!1;this.userHeight=1.6;this.getController=function(a){var b=h[a];void 0===b&&(b=new Ub,b.matrixAutoUpdate=!1,b.visible=!1,h[a]=b);return b};this.getDevice=function(){return e};this.setDevice=function(a){void 0!==a&&(e=a);A.setContext(a)};this.setPoseTarget=function(a){void 0!==a&&
(g=a)};this.getCamera=function(a){if(null===e)return a.position.set(0,d.userHeight,0),a;e.depthNear=a.near;e.depthFar=a.far;e.getFrameData(f);var b=e.stageParameters;b?l.fromArray(b.sittingToStandingTransform):l.makeTranslation(0,d.userHeight,0);b=f.pose;var c=null!==g?g:a;c.matrix.copy(l);c.matrix.decompose(c.position,c.quaternion,c.scale);null!==b.orientation&&(n.fromArray(b.orientation),c.quaternion.multiply(n));null!==b.position&&(n.setFromRotationMatrix(l),t.fromArray(b.position),t.applyQuaternion(n),
c.position.add(t));c.updateMatrixWorld();if(!1===e.isPresenting)return a;q.near=a.near;k.near=a.near;q.far=a.far;k.far=a.far;u.matrixWorld.copy(a.matrixWorld);u.matrixWorldInverse.copy(a.matrixWorldInverse);q.matrixWorldInverse.fromArray(f.leftViewMatrix);k.matrixWorldInverse.fromArray(f.rightViewMatrix);m.getInverse(l);q.matrixWorldInverse.multiply(m);k.matrixWorldInverse.multiply(m);a=c.parent;null!==a&&(v.getInverse(a.matrixWorld),q.matrixWorldInverse.multiply(v),k.matrixWorldInverse.multiply(v));
q.matrixWorld.getInverse(q.matrixWorldInverse);k.matrixWorld.getInverse(k.matrixWorldInverse);q.projectionMatrix.fromArray(f.leftProjectionMatrix);k.projectionMatrix.fromArray(f.rightProjectionMatrix);u.projectionMatrix.copy(q.projectionMatrix);a=e.getLayers();a.length&&(a=a[0],null!==a.leftBounds&&4===a.leftBounds.length&&q.bounds.fromArray(a.leftBounds),null!==a.rightBounds&&4===a.rightBounds.length&&k.bounds.fromArray(a.rightBounds));a:for(a=0;a<h.length;a++){b=h[a];b:{c=a;for(var r=navigator.getGamepads&&
navigator.getGamepads(),p=0,y=0,w=r.length;p<w;p++){var C=r[p];if(C&&("Daydream Controller"===C.id||"Gear VR Controller"===C.id||"Oculus Go Controller"===C.id||"OpenVR Gamepad"===C.id||C.id.startsWith("Oculus Touch")||C.id.startsWith("Spatial Controller"))){if(y===c){c=C;break b}y++}}c=void 0}if(void 0!==c&&void 0!==c.pose){if(null===c.pose)break a;r=c.pose;!1===r.hasPosition&&b.position.set(.2,-.6,-.05);null!==r.position&&b.position.fromArray(r.position);null!==r.orientation&&b.quaternion.fromArray(r.orientation);
b.matrix.compose(b.position,b.quaternion,b.scale);b.matrix.premultiply(l);b.matrix.decompose(b.position,b.quaternion,b.scale);b.matrixWorldNeedsUpdate=!0;b.visible=!0;r="Daydream Controller"===c.id?0:1;x!==c.buttons[r].pressed&&((x=c.buttons[r].pressed)?b.dispatchEvent({type:"selectstart"}):(b.dispatchEvent({type:"selectend"}),b.dispatchEvent({type:"select"})))}else b.visible=!1}return u};this.getStandingMatrix=function(){return l};this.isPresenting=b;var A=new Vd;this.setAnimationLoop=function(a){A.setAnimationLoop(a)};
this.submitFrame=function(){b()&&e.submitFrame()};this.dispose=function(){"undefined"!==typeof window&&window.removeEventListener("vrdisplaypresentchange",c)}}function Ng(a){function b(){return null!==h&&null!==l}function c(a){var b=v[n.indexOf(a.inputSource)];b&&b.dispatchEvent({type:a.type})}function d(){a.setFramebuffer(null);p.stop()}function e(a,b){null===b?a.matrixWorld.copy(a.matrix):a.matrixWorld.multiplyMatrices(b.matrixWorld,a.matrix);a.matrixWorldInverse.getInverse(a.matrixWorld)}var f=
a.context,g=null,h=null,l=null,m=null,v=[],n=[],t=new Z;t.layers.enable(1);t.viewport=new W;var q=new Z;q.layers.enable(2);q.viewport=new W;var k=new Hc([t,q]);k.layers.enable(1);k.layers.enable(2);this.enabled=!1;this.getController=function(a){var b=v[a];void 0===b&&(b=new Ub,b.matrixAutoUpdate=!1,b.visible=!1,v[a]=b);return b};this.getDevice=function(){return g};this.setDevice=function(a){void 0!==a&&(g=a);f.setCompatibleXRDevice(a)};this.setSession=function(b,e){h=b;null!==h&&(h.addEventListener("select",
c),h.addEventListener("selectstart",c),h.addEventListener("selectend",c),h.addEventListener("end",d),h.baseLayer=new XRWebGLLayer(h,f),h.requestFrameOfReference(e.frameOfReferenceType).then(function(b){l=b;a.setFramebuffer(h.baseLayer.framebuffer);p.setContext(h);p.start()}),n=h.getInputSources(),h.addEventListener("inputsourceschange",function(){n=h.getInputSources();console.log(n)}))};this.getCamera=function(a){if(b()){var c=a.parent,d=k.cameras;e(k,c);for(var f=0;f<d.length;f++)e(d[f],c);a.matrixWorld.copy(k.matrixWorld);
a=a.children;f=0;for(c=a.length;f<c;f++)a[f].updateMatrixWorld(!0);return k}return a};this.isPresenting=b;var u=null,p=new Vd;p.setAnimationLoop(function(a,b){m=b.getDevicePose(l);if(null!==m)for(var c=h.baseLayer,d=b.views,e=0;e<d.length;e++){var f=d[e],g=c.getViewport(f),t=m.getViewMatrix(f),q=k.cameras[e];q.matrix.fromArray(t).getInverse(q.matrix);q.projectionMatrix.fromArray(f.projectionMatrix);q.viewport.set(g.x,g.y,g.width,g.height);0===e&&(k.matrix.copy(q.matrix),k.projectionMatrix.copy(q.projectionMatrix))}for(e=
0;e<v.length;e++){c=v[e];if(d=n[e])if(d=b.getInputPose(d,l),null!==d){c.matrix.elements=d.pointerMatrix;c.matrix.decompose(c.position,c.rotation,c.scale);c.visible=!0;continue}c.visible=!1}u&&u(a)});this.setAnimationLoop=function(a){u=a};this.dispose=function(){};this.getStandingMatrix=function(){console.warn("THREE.WebXRManager: getStandingMatrix() is no longer needed.");return new THREE.Matrix4};this.submitFrame=function(){}}function ae(a){function b(){ma=new Pf(F);ma.get("WEBGL_depth_texture");
ma.get("OES_texture_float");ma.get("OES_texture_float_linear");ma.get("OES_texture_half_float");ma.get("OES_texture_half_float_linear");ma.get("OES_standard_derivatives");ma.get("OES_element_index_uint");ma.get("ANGLE_instanced_arrays");ia=new af(F,ma);Sa=new Nf(F,ma,a);aa=new Lg(F,ma,ia);aa.scissor(S.copy(ba).multiplyScalar(V));aa.viewport(db.copy(N).multiplyScalar(V));hb=new Sf(F);Aa=new Ag;Z=new Mg(F,ma,aa,Aa,Sa,ia,hb);ja=new Gf(F);qa=new Qf(F,ja,hb);pa=new Vf(qa,hb);va=new Uf(F);na=new zg(U,ma,
Sa);ra=new Eg;oa=new Jg;la=new Lf(U,aa,pa,O);wa=new Mf(F,ma,hb);xa=new Rf(F,ma,hb);ya=new Kg(U,F,aa,Z,Sa);hb.programs=na.programs;U.context=F;U.capabilities=Sa;U.extensions=ma;U.properties=Aa;U.renderLists=ra;U.state=aa;U.info=hb}function c(a){a.preventDefault();console.log("THREE.WebGLRenderer: Context Lost.");G=!0}function d(){console.log("THREE.WebGLRenderer: Context Restored.");G=!1;b()}function e(a){a=a.target;a.removeEventListener("dispose",e);f(a);Aa.remove(a)}function f(a){var b=Aa.get(a).program;
a.program=void 0;void 0!==b&&na.releaseProgram(b)}function g(a,b,c){a.render(function(a){U.renderBufferImmediate(a,b,c)})}function h(a,b,c){if(!1!==a.visible){if(a.layers.test(b.layers))if(a.isLight)z.pushLight(a),a.castShadow&&z.pushShadow(a);else if(a.isSprite)a.frustumCulled&&!da.intersectsSprite(a)||z.pushSprite(a);else if(a.isImmediateRenderObject)c&&Tb.setFromMatrixPosition(a.matrixWorld).applyMatrix4(ud),B.push(a,null,a.material,Tb.z,null);else if(a.isMesh||a.isLine||a.isPoints)if(a.isSkinnedMesh&&
a.skeleton.update(),!a.frustumCulled||da.intersectsObject(a)){c&&Tb.setFromMatrixPosition(a.matrixWorld).applyMatrix4(ud);var d=pa.update(a),e=a.material;if(Array.isArray(e))for(var f=d.groups,g=0,l=f.length;g<l;g++){var m=f[g],n=e[m.materialIndex];n&&n.visible&&B.push(a,d,n,Tb.z,m)}else e.visible&&B.push(a,d,e,Tb.z,null)}a=a.children;g=0;for(l=a.length;g<l;g++)h(a[g],b,c)}}function l(a,b,c,d){for(var e=0,f=a.length;e<f;e++){var g=a[e],h=g.object,l=g.geometry,n=void 0===d?g.material:d;g=g.group;if(c.isArrayCamera){Pb=
c;for(var v=c.cameras,t=0,q=v.length;t<q;t++){var k=v[t];if(h.layers.test(k.layers)){if("viewport"in k)aa.viewport(db.copy(k.viewport));else{var r=k.bounds;aa.viewport(db.set(r.x*Y,r.y*fa,r.z*Y,r.w*fa).multiplyScalar(V))}m(h,b,k,l,n,g)}}}else Pb=null,m(h,b,c,l,n,g)}}function m(a,b,c,d,e,f){a.onBeforeRender(U,b,c,d,e,f);z=oa.get(b,Pb||c);a.modelViewMatrix.multiplyMatrices(c.matrixWorldInverse,a.matrixWorld);a.normalMatrix.getNormalMatrix(a.modelViewMatrix);if(a.isImmediateRenderObject){var h=a.isMesh&&
0>a.matrixWorld.determinant();aa.setMaterial(e,h);h=n(c,b.fog,e,a);I="";g(a,h,e)}else U.renderBufferDirect(c,b.fog,d,e,a,f);a.onAfterRender(U,b,c,d,e,f);z=oa.get(b,Pb||c)}function v(a,b,c){var d=Aa.get(a),g=z.state.lights;c=na.getParameters(a,g.state,z.state.shadowsArray,b,X.numPlanes,X.numIntersection,c);var h=na.getProgramCode(a,c),l=d.program,m=!0;if(void 0===l)a.addEventListener("dispose",e);else if(l.code!==h)f(a);else{if(d.lightsHash!==g.state.hash)Aa.update(a,"lightsHash",g.state.hash);else if(void 0!==
c.shaderID)return;m=!1}m&&(c.shaderID?(l=tb[c.shaderID],d.shader={name:a.type,uniforms:Ba.clone(l.uniforms),vertexShader:l.vertexShader,fragmentShader:l.fragmentShader}):d.shader={name:a.type,uniforms:a.uniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader},a.onBeforeCompile(d.shader,U),l=na.acquireProgram(a,d.shader,c,h),d.program=l,a.program=l);c=l.getAttributes();if(a.morphTargets)for(h=a.numSupportedMorphTargets=0;h<U.maxMorphTargets;h++)0<=c["morphTarget"+h]&&a.numSupportedMorphTargets++;
if(a.morphNormals)for(h=a.numSupportedMorphNormals=0;h<U.maxMorphNormals;h++)0<=c["morphNormal"+h]&&a.numSupportedMorphNormals++;c=d.shader.uniforms;if(!a.isShaderMaterial&&!a.isRawShaderMaterial||!0===a.clipping)d.numClippingPlanes=X.numPlanes,d.numIntersection=X.numIntersection,c.clippingPlanes=X.uniform;d.fog=b;d.lightsHash=g.state.hash;a.lights&&(c.ambientLightColor.value=g.state.ambient,c.directionalLights.value=g.state.directional,c.spotLights.value=g.state.spot,c.rectAreaLights.value=g.state.rectArea,
c.pointLights.value=g.state.point,c.hemisphereLights.value=g.state.hemi,c.directionalShadowMap.value=g.state.directionalShadowMap,c.directionalShadowMatrix.value=g.state.directionalShadowMatrix,c.spotShadowMap.value=g.state.spotShadowMap,c.spotShadowMatrix.value=g.state.spotShadowMatrix,c.pointShadowMap.value=g.state.pointShadowMap,c.pointShadowMatrix.value=g.state.pointShadowMatrix);a=d.program.getUniforms();a=eb.seqWithValue(a.seq,c);d.uniformsList=a}function n(a,b,c,d){$d=0;var e=Aa.get(c),f=z.state.lights;
ca&&(ha||a!==L)&&X.setState(c.clippingPlanes,c.clipIntersection,c.clipShadows,a,e,a===L&&c.id===P);!1===c.needsUpdate&&(void 0===e.program?c.needsUpdate=!0:c.fog&&e.fog!==b?c.needsUpdate=!0:c.lights&&e.lightsHash!==f.state.hash?c.needsUpdate=!0:void 0===e.numClippingPlanes||e.numClippingPlanes===X.numPlanes&&e.numIntersection===X.numIntersection||(c.needsUpdate=!0));c.needsUpdate&&(v(c,b,d),c.needsUpdate=!1);var g=!1,h=!1,l=!1;f=e.program;var m=f.getUniforms(),n=e.shader.uniforms;aa.useProgram(f.program)&&
(l=h=g=!0);c.id!==P&&(P=c.id,h=!0);if(g||a!==L){m.setValue(F,"projectionMatrix",a.projectionMatrix);Sa.logarithmicDepthBuffer&&m.setValue(F,"logDepthBufFC",2/(Math.log(a.far+1)/Math.LN2));L!==(Pb||a)&&(L=Pb||a,l=h=!0);if(c.isShaderMaterial||c.isMeshPhongMaterial||c.isMeshStandardMaterial||c.envMap)g=m.map.cameraPosition,void 0!==g&&g.setValue(F,Tb.setFromMatrixPosition(a.matrixWorld));(c.isMeshPhongMaterial||c.isMeshLambertMaterial||c.isMeshBasicMaterial||c.isMeshStandardMaterial||c.isShaderMaterial||
c.skinning)&&m.setValue(F,"viewMatrix",a.matrixWorldInverse)}if(c.skinning&&(m.setOptional(F,d,"bindMatrix"),m.setOptional(F,d,"bindMatrixInverse"),a=d.skeleton))if(g=a.bones,Sa.floatVertexTextures){if(void 0===a.boneTexture){g=Math.sqrt(4*g.length);g=J.ceilPowerOfTwo(g);g=Math.max(g,4);var r=new Float32Array(g*g*4);r.set(a.boneMatrices);var u=new lb(r,g,g,1023,1015);u.needsUpdate=!0;a.boneMatrices=r;a.boneTexture=u;a.boneTextureSize=g}m.setValue(F,"boneTexture",a.boneTexture);m.setValue(F,"boneTextureSize",
a.boneTextureSize)}else m.setOptional(F,a,"boneMatrices");h&&(m.setValue(F,"toneMappingExposure",U.toneMappingExposure),m.setValue(F,"toneMappingWhitePoint",U.toneMappingWhitePoint),c.lights&&(h=l,n.ambientLightColor.needsUpdate=h,n.directionalLights.needsUpdate=h,n.pointLights.needsUpdate=h,n.spotLights.needsUpdate=h,n.rectAreaLights.needsUpdate=h,n.hemisphereLights.needsUpdate=h),b&&c.fog&&(n.fogColor.value=b.color,b.isFog?(n.fogNear.value=b.near,n.fogFar.value=b.far):b.isFogExp2&&(n.fogDensity.value=
b.density)),c.isMeshBasicMaterial?t(n,c):c.isMeshLambertMaterial?(t(n,c),c.emissiveMap&&(n.emissiveMap.value=c.emissiveMap)):c.isMeshPhongMaterial?(t(n,c),c.isMeshToonMaterial?(q(n,c),c.gradientMap&&(n.gradientMap.value=c.gradientMap)):q(n,c)):c.isMeshStandardMaterial?(t(n,c),c.isMeshPhysicalMaterial?(k(n,c),n.reflectivity.value=c.reflectivity,n.clearCoat.value=c.clearCoat,n.clearCoatRoughness.value=c.clearCoatRoughness):k(n,c)):c.isMeshDepthMaterial?(t(n,c),c.displacementMap&&(n.displacementMap.value=
c.displacementMap,n.displacementScale.value=c.displacementScale,n.displacementBias.value=c.displacementBias)):c.isMeshDistanceMaterial?(t(n,c),c.displacementMap&&(n.displacementMap.value=c.displacementMap,n.displacementScale.value=c.displacementScale,n.displacementBias.value=c.displacementBias),n.referencePosition.value.copy(c.referencePosition),n.nearDistance.value=c.nearDistance,n.farDistance.value=c.farDistance):c.isMeshNormalMaterial?(t(n,c),c.bumpMap&&(n.bumpMap.value=c.bumpMap,n.bumpScale.value=
c.bumpScale,1===c.side&&(n.bumpScale.value*=-1)),c.normalMap&&(n.normalMap.value=c.normalMap,n.normalScale.value.copy(c.normalScale),1===c.side&&n.normalScale.value.negate()),c.displacementMap&&(n.displacementMap.value=c.displacementMap,n.displacementScale.value=c.displacementScale,n.displacementBias.value=c.displacementBias)):c.isLineBasicMaterial?(n.diffuse.value=c.color,n.opacity.value=c.opacity,c.isLineDashedMaterial&&(n.dashSize.value=c.dashSize,n.totalSize.value=c.dashSize+c.gapSize,n.scale.value=
c.scale)):c.isPointsMaterial?(n.diffuse.value=c.color,n.opacity.value=c.opacity,n.size.value=c.size*V,n.scale.value=.5*fa,n.map.value=c.map,null!==c.map&&(!0===c.map.matrixAutoUpdate&&c.map.updateMatrix(),n.uvTransform.value.copy(c.map.matrix))):c.isShadowMaterial&&(n.color.value=c.color,n.opacity.value=c.opacity),void 0!==n.ltc_1&&(n.ltc_1.value=K.LTC_1),void 0!==n.ltc_2&&(n.ltc_2.value=K.LTC_2),eb.upload(F,e.uniformsList,n,U));c.isShaderMaterial&&!0===c.uniformsNeedUpdate&&(eb.upload(F,e.uniformsList,
n,U),c.uniformsNeedUpdate=!1);m.setValue(F,"modelViewMatrix",d.modelViewMatrix);m.setValue(F,"normalMatrix",d.normalMatrix);m.setValue(F,"modelMatrix",d.matrixWorld);return f}function t(a,b){a.opacity.value=b.opacity;b.color&&(a.diffuse.value=b.color);b.emissive&&a.emissive.value.copy(b.emissive).multiplyScalar(b.emissiveIntensity);b.map&&(a.map.value=b.map);b.alphaMap&&(a.alphaMap.value=b.alphaMap);b.specularMap&&(a.specularMap.value=b.specularMap);b.envMap&&(a.envMap.value=b.envMap,a.flipEnvMap.value=
b.envMap&&b.envMap.isCubeTexture?-1:1,a.reflectivity.value=b.reflectivity,a.refractionRatio.value=b.refractionRatio,a.maxMipLevel.value=Aa.get(b.envMap).__maxMipLevel);b.lightMap&&(a.lightMap.value=b.lightMap,a.lightMapIntensity.value=b.lightMapIntensity);b.aoMap&&(a.aoMap.value=b.aoMap,a.aoMapIntensity.value=b.aoMapIntensity);if(b.map)var c=b.map;else b.specularMap?c=b.specularMap:b.displacementMap?c=b.displacementMap:b.normalMap?c=b.normalMap:b.bumpMap?c=b.bumpMap:b.roughnessMap?c=b.roughnessMap:
b.metalnessMap?c=b.metalnessMap:b.alphaMap?c=b.alphaMap:b.emissiveMap&&(c=b.emissiveMap);void 0!==c&&(c.isWebGLRenderTarget&&(c=c.texture),!0===c.matrixAutoUpdate&&c.updateMatrix(),a.uvTransform.value.copy(c.matrix))}function q(a,b){a.specular.value=b.specular;a.shininess.value=Math.max(b.shininess,1E-4);b.emissiveMap&&(a.emissiveMap.value=b.emissiveMap);b.bumpMap&&(a.bumpMap.value=b.bumpMap,a.bumpScale.value=b.bumpScale,1===b.side&&(a.bumpScale.value*=-1));b.normalMap&&(a.normalMap.value=b.normalMap,
a.normalScale.value.copy(b.normalScale),1===b.side&&a.normalScale.value.negate());b.displacementMap&&(a.displacementMap.value=b.displacementMap,a.displacementScale.value=b.displacementScale,a.displacementBias.value=b.displacementBias)}function k(a,b){a.roughness.value=b.roughness;a.metalness.value=b.metalness;b.roughnessMap&&(a.roughnessMap.value=b.roughnessMap);b.metalnessMap&&(a.metalnessMap.value=b.metalnessMap);b.emissiveMap&&(a.emissiveMap.value=b.emissiveMap);b.bumpMap&&(a.bumpMap.value=b.bumpMap,
a.bumpScale.value=b.bumpScale,1===b.side&&(a.bumpScale.value*=-1));b.normalMap&&(a.normalMap.value=b.normalMap,a.normalScale.value.copy(b.normalScale),1===b.side&&a.normalScale.value.negate());b.displacementMap&&(a.displacementMap.value=b.displacementMap,a.displacementScale.value=b.displacementScale,a.displacementBias.value=b.displacementBias);b.envMap&&(a.envMapIntensity.value=b.envMapIntensity)}console.log("THREE.WebGLRenderer","94");a=a||{};var u=void 0!==a.canvas?a.canvas:document.createElementNS("http://www.w3.org/1999/xhtml",
"canvas"),y=void 0!==a.context?a.context:null,w=void 0!==a.alpha?a.alpha:!1,x=void 0!==a.depth?a.depth:!0,A=void 0!==a.stencil?a.stencil:!0,C=void 0!==a.antialias?a.antialias:!1,O=void 0!==a.premultipliedAlpha?a.premultipliedAlpha:!0,Q=void 0!==a.preserveDrawingBuffer?a.preserveDrawingBuffer:!1,M=void 0!==a.powerPreference?a.powerPreference:"default",B=null,z=null;this.domElement=u;this.context=null;this.sortObjects=this.autoClearStencil=this.autoClearDepth=this.autoClearColor=this.autoClear=!0;this.clippingPlanes=
[];this.localClippingEnabled=!1;this.gammaFactor=2;this.physicallyCorrectLights=this.gammaOutput=this.gammaInput=!1;this.toneMappingWhitePoint=this.toneMappingExposure=this.toneMapping=1;this.maxMorphTargets=8;this.maxMorphNormals=4;var U=this,G=!1,H=null,D=null,E=null,P=-1,I="",L=null,Pb=null,db=new W,S=new W,T=null,$d=0,Y=u.width,fa=u.height,V=1,N=new W(0,0,Y,fa),ba=new W(0,0,Y,fa),ea=!1,da=new td,X=new Of,ca=!1,ha=!1,ud=new R,Tb=new p;try{w={alpha:w,depth:x,stencil:A,antialias:C,premultipliedAlpha:O,
preserveDrawingBuffer:Q,powerPreference:M};u.addEventListener("webglcontextlost",c,!1);u.addEventListener("webglcontextrestored",d,!1);var F=y||u.getContext("webgl",w)||u.getContext("experimental-webgl",w);if(null===F){if(null!==u.getContext("webgl"))throw Error("Error creating WebGL context with your selected attributes.");throw Error("Error creating WebGL context.");}void 0===F.getShaderPrecisionFormat&&(F.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(Og){console.error("THREE.WebGLRenderer: "+
Og.message)}var ma,Sa,aa,hb,Aa,Z,ja,qa,pa,na,ra,oa,la,va,wa,xa,ya,ia;b();var ka="xr"in navigator?new Ng(U):new bf(U);this.vr=ka;var za=new $e(U,pa,Sa.maxTextureSize);this.shadowMap=za;this.getContext=function(){return F};this.getContextAttributes=function(){return F.getContextAttributes()};this.forceContextLoss=function(){var a=ma.get("WEBGL_lose_context");a&&a.loseContext()};this.forceContextRestore=function(){var a=ma.get("WEBGL_lose_context");a&&a.restoreContext()};this.getPixelRatio=function(){return V};
this.setPixelRatio=function(a){void 0!==a&&(V=a,this.setSize(Y,fa,!1))};this.getSize=function(){return{width:Y,height:fa}};this.setSize=function(a,b,c){ka.isPresenting()?console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting."):(Y=a,fa=b,u.width=a*V,u.height=b*V,!1!==c&&(u.style.width=a+"px",u.style.height=b+"px"),this.setViewport(0,0,a,b))};this.getDrawingBufferSize=function(){return{width:Y*V,height:fa*V}};this.setDrawingBufferSize=function(a,b,c){Y=a;fa=b;V=c;u.width=
a*c;u.height=b*c;this.setViewport(0,0,a,b)};this.getCurrentViewport=function(){return db};this.setViewport=function(a,b,c,d){N.set(a,fa-b-d,c,d);aa.viewport(db.copy(N).multiplyScalar(V))};this.setScissor=function(a,b,c,d){ba.set(a,fa-b-d,c,d);aa.scissor(S.copy(ba).multiplyScalar(V))};this.setScissorTest=function(a){aa.setScissorTest(ea=a)};this.getClearColor=function(){return la.getClearColor()};this.setClearColor=function(){la.setClearColor.apply(la,arguments)};this.getClearAlpha=function(){return la.getClearAlpha()};
this.setClearAlpha=function(){la.setClearAlpha.apply(la,arguments)};this.clear=function(a,b,c){var d=0;if(void 0===a||a)d|=F.COLOR_BUFFER_BIT;if(void 0===b||b)d|=F.DEPTH_BUFFER_BIT;if(void 0===c||c)d|=F.STENCIL_BUFFER_BIT;F.clear(d)};this.clearColor=function(){this.clear(!0,!1,!1)};this.clearDepth=function(){this.clear(!1,!0,!1)};this.clearStencil=function(){this.clear(!1,!1,!0)};this.clearTarget=function(a,b,c,d){this.setRenderTarget(a);this.clear(b,c,d)};this.dispose=function(){u.removeEventListener("webglcontextlost",
c,!1);u.removeEventListener("webglcontextrestored",d,!1);ra.dispose();oa.dispose();Aa.dispose();pa.dispose();ka.dispose();ta.stop()};this.renderBufferImmediate=function(a,b,c){aa.initAttributes();var d=Aa.get(a);a.hasPositions&&!d.position&&(d.position=F.createBuffer());a.hasNormals&&!d.normal&&(d.normal=F.createBuffer());a.hasUvs&&!d.uv&&(d.uv=F.createBuffer());a.hasColors&&!d.color&&(d.color=F.createBuffer());b=b.getAttributes();a.hasPositions&&(F.bindBuffer(F.ARRAY_BUFFER,d.position),F.bufferData(F.ARRAY_BUFFER,
a.positionArray,F.DYNAMIC_DRAW),aa.enableAttribute(b.position),F.vertexAttribPointer(b.position,3,F.FLOAT,!1,0,0));if(a.hasNormals){F.bindBuffer(F.ARRAY_BUFFER,d.normal);if(!c.isMeshPhongMaterial&&!c.isMeshStandardMaterial&&!c.isMeshNormalMaterial&&!0===c.flatShading)for(var e=0,f=3*a.count;e<f;e+=9){var g=a.normalArray,h=(g[e+0]+g[e+3]+g[e+6])/3,l=(g[e+1]+g[e+4]+g[e+7])/3,m=(g[e+2]+g[e+5]+g[e+8])/3;g[e+0]=h;g[e+1]=l;g[e+2]=m;g[e+3]=h;g[e+4]=l;g[e+5]=m;g[e+6]=h;g[e+7]=l;g[e+8]=m}F.bufferData(F.ARRAY_BUFFER,
a.normalArray,F.DYNAMIC_DRAW);aa.enableAttribute(b.normal);F.vertexAttribPointer(b.normal,3,F.FLOAT,!1,0,0)}a.hasUvs&&c.map&&(F.bindBuffer(F.ARRAY_BUFFER,d.uv),F.bufferData(F.ARRAY_BUFFER,a.uvArray,F.DYNAMIC_DRAW),aa.enableAttribute(b.uv),F.vertexAttribPointer(b.uv,2,F.FLOAT,!1,0,0));a.hasColors&&0!==c.vertexColors&&(F.bindBuffer(F.ARRAY_BUFFER,d.color),F.bufferData(F.ARRAY_BUFFER,a.colorArray,F.DYNAMIC_DRAW),aa.enableAttribute(b.color),F.vertexAttribPointer(b.color,3,F.FLOAT,!1,0,0));aa.disableUnusedAttributes();
F.drawArrays(F.TRIANGLES,0,a.count);a.count=0};this.renderBufferDirect=function(a,b,c,d,e,f){var g=e.isMesh&&0>e.matrixWorld.determinant();aa.setMaterial(d,g);var h=n(a,b,d,e);a=c.id+"_"+h.id+"_"+(!0===d.wireframe);var l=!1;a!==I&&(I=a,l=!0);e.morphTargetInfluences&&(va.update(e,c,d,h),l=!0);g=c.index;var m=c.attributes.position;b=1;!0===d.wireframe&&(g=qa.getWireframeAttribute(c),b=2);a=wa;if(null!==g){var v=ja.get(g);a=xa;a.setIndex(v)}if(l){if(c&&c.isInstancedBufferGeometry&&null===ma.get("ANGLE_instanced_arrays"))console.error("THREE.WebGLRenderer.setupVertexAttributes: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");
else{aa.initAttributes();l=c.attributes;h=h.getAttributes();var t=d.defaultAttributeValues;for(A in h){var q=h[A];if(0<=q){var k=l[A];if(void 0!==k){var r=k.normalized,u=k.itemSize,p=ja.get(k);if(void 0!==p){var y=p.buffer,x=p.type;p=p.bytesPerElement;if(k.isInterleavedBufferAttribute){var w=k.data,C=w.stride;k=k.offset;w&&w.isInstancedInterleavedBuffer?(aa.enableAttributeAndDivisor(q,w.meshPerAttribute),void 0===c.maxInstancedCount&&(c.maxInstancedCount=w.meshPerAttribute*w.count)):aa.enableAttribute(q);
F.bindBuffer(F.ARRAY_BUFFER,y);F.vertexAttribPointer(q,u,x,r,C*p,k*p)}else k.isInstancedBufferAttribute?(aa.enableAttributeAndDivisor(q,k.meshPerAttribute),void 0===c.maxInstancedCount&&(c.maxInstancedCount=k.meshPerAttribute*k.count)):aa.enableAttribute(q),F.bindBuffer(F.ARRAY_BUFFER,y),F.vertexAttribPointer(q,u,x,r,0,0)}}else if(void 0!==t&&(r=t[A],void 0!==r))switch(r.length){case 2:F.vertexAttrib2fv(q,r);break;case 3:F.vertexAttrib3fv(q,r);break;case 4:F.vertexAttrib4fv(q,r);break;default:F.vertexAttrib1fv(q,
r)}}}aa.disableUnusedAttributes()}null!==g&&F.bindBuffer(F.ELEMENT_ARRAY_BUFFER,v.buffer)}v=Infinity;null!==g?v=g.count:void 0!==m&&(v=m.count);g=c.drawRange.start*b;m=null!==f?f.start*b:0;var A=Math.max(g,m);f=Math.max(0,Math.min(v,g+c.drawRange.count*b,m+(null!==f?f.count*b:Infinity))-1-A+1);if(0!==f){if(e.isMesh)if(!0===d.wireframe)aa.setLineWidth(d.wireframeLinewidth*(null===D?V:1)),a.setMode(F.LINES);else switch(e.drawMode){case 0:a.setMode(F.TRIANGLES);break;case 1:a.setMode(F.TRIANGLE_STRIP);
break;case 2:a.setMode(F.TRIANGLE_FAN)}else e.isLine?(d=d.linewidth,void 0===d&&(d=1),aa.setLineWidth(d*(null===D?V:1)),e.isLineSegments?a.setMode(F.LINES):e.isLineLoop?a.setMode(F.LINE_LOOP):a.setMode(F.LINE_STRIP)):e.isPoints&&a.setMode(F.POINTS);c&&c.isInstancedBufferGeometry?0<c.maxInstancedCount&&a.renderInstances(c,A,f):a.render(A,f)}};this.compile=function(a,b){z=oa.get(a,b);z.init();a.traverse(function(a){a.isLight&&(z.pushLight(a),a.castShadow&&z.pushShadow(a))});z.setupLights(b);a.traverse(function(b){if(b.material)if(Array.isArray(b.material))for(var c=
0;c<b.material.length;c++)v(b.material[c],a.fog,b);else v(b.material,a.fog,b)})};var ua=null,ta=new Vd;ta.setAnimationLoop(function(a){ka.isPresenting()||ua&&ua(a)});"undefined"!==typeof window&&ta.setContext(window);this.setAnimationLoop=function(a){ua=a;ka.setAnimationLoop(a);ta.start()};this.render=function(a,b,c,d){if(!b||!b.isCamera)console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");else if(!G){I="";P=-1;L=null;!0===a.autoUpdate&&a.updateMatrixWorld();null===
b.parent&&b.updateMatrixWorld();ka.enabled&&(b=ka.getCamera(b));z=oa.get(a,b);z.init();a.onBeforeRender(U,a,b,c);ud.multiplyMatrices(b.projectionMatrix,b.matrixWorldInverse);da.setFromMatrix(ud);ha=this.localClippingEnabled;ca=X.init(this.clippingPlanes,ha,b);B=ra.get(a,b);B.init();h(a,b,U.sortObjects);!0===U.sortObjects&&B.sort();ca&&X.beginShadows();za.render(z.state.shadowsArray,a,b);z.setupLights(b);ca&&X.endShadows();this.info.autoReset&&this.info.reset();void 0===c&&(c=null);this.setRenderTarget(c);
la.render(B,a,b,d);d=B.opaque;var e=B.transparent;if(a.overrideMaterial){var f=a.overrideMaterial;d.length&&l(d,a,b,f);e.length&&l(e,a,b,f)}else d.length&&l(d,a,b),e.length&&l(e,a,b);ya.render(z.state.spritesArray,a,b);c&&Z.updateRenderTargetMipmap(c);aa.buffers.depth.setTest(!0);aa.buffers.depth.setMask(!0);aa.buffers.color.setMask(!0);aa.setPolygonOffset(!1);a.onAfterRender(U,a,b);ka.enabled&&ka.submitFrame();z=B=null}};this.allocTextureUnit=function(){var a=$d;a>=Sa.maxTextures&&console.warn("THREE.WebGLRenderer: Trying to use "+
a+" texture units while this GPU supports only "+Sa.maxTextures);$d+=1;return a};this.setTexture2D=function(){var a=!1;return function(b,c){b&&b.isWebGLRenderTarget&&(a||(console.warn("THREE.WebGLRenderer.setTexture2D: don't use render targets as textures. Use their .texture property instead."),a=!0),b=b.texture);Z.setTexture2D(b,c)}}();this.setTexture=function(){var a=!1;return function(b,c){a||(console.warn("THREE.WebGLRenderer: .setTexture is deprecated, use setTexture2D instead."),a=!0);Z.setTexture2D(b,
c)}}();this.setTextureCube=function(){var a=!1;return function(b,c){b&&b.isWebGLRenderTargetCube&&(a||(console.warn("THREE.WebGLRenderer.setTextureCube: don't use cube render targets as textures. Use their .texture property instead."),a=!0),b=b.texture);b&&b.isCubeTexture||Array.isArray(b.image)&&6===b.image.length?Z.setTextureCube(b,c):Z.setTextureCubeDynamic(b,c)}}();this.setFramebuffer=function(a){H=a};this.getRenderTarget=function(){return D};this.setRenderTarget=function(a){(D=a)&&void 0===Aa.get(a).__webglFramebuffer&&
Z.setupRenderTarget(a);var b=H,c=!1;a?(b=Aa.get(a).__webglFramebuffer,a.isWebGLRenderTargetCube&&(b=b[a.activeCubeFace],c=!0),db.copy(a.viewport),S.copy(a.scissor),T=a.scissorTest):(db.copy(N).multiplyScalar(V),S.copy(ba).multiplyScalar(V),T=ea);E!==b&&(F.bindFramebuffer(F.FRAMEBUFFER,b),E=b);aa.viewport(db);aa.scissor(S);aa.setScissorTest(T);c&&(c=Aa.get(a.texture),F.framebufferTexture2D(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_CUBE_MAP_POSITIVE_X+a.activeCubeFace,c.__webglTexture,a.activeMipMapLevel))};
this.readRenderTargetPixels=function(a,b,c,d,e,f){if(a&&a.isWebGLRenderTarget){var g=Aa.get(a).__webglFramebuffer;if(g){var h=!1;g!==E&&(F.bindFramebuffer(F.FRAMEBUFFER,g),h=!0);try{var l=a.texture,m=l.format,n=l.type;1023!==m&&ia.convert(m)!==F.getParameter(F.IMPLEMENTATION_COLOR_READ_FORMAT)?console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format."):1009===n||ia.convert(n)===F.getParameter(F.IMPLEMENTATION_COLOR_READ_TYPE)||1015===
n&&(ma.get("OES_texture_float")||ma.get("WEBGL_color_buffer_float"))||1016===n&&ma.get("EXT_color_buffer_half_float")?F.checkFramebufferStatus(F.FRAMEBUFFER)===F.FRAMEBUFFER_COMPLETE?0<=b&&b<=a.width-d&&0<=c&&c<=a.height-e&&F.readPixels(b,c,d,e,ia.convert(m),ia.convert(n),f):console.error("THREE.WebGLRenderer.readRenderTargetPixels: readPixels from renderTarget failed. Framebuffer not complete."):console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.")}finally{h&&
F.bindFramebuffer(F.FRAMEBUFFER,E)}}}else console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.")};this.copyFramebufferToTexture=function(a,b,c){var d=b.image.width,e=b.image.height,f=ia.convert(b.format);this.setTexture2D(b,0);F.copyTexImage2D(F.TEXTURE_2D,c||0,f,a.x,a.y,d,e,0)};this.copyTextureToTexture=function(a,b,c,d){var e=b.image.width,f=b.image.height,g=ia.convert(c.format),h=ia.convert(c.type);this.setTexture2D(c,0);b.isDataTexture?F.texSubImage2D(F.TEXTURE_2D,
d||0,a.x,a.y,e,f,g,h,b.image.data):F.texSubImage2D(F.TEXTURE_2D,d||0,a.x,a.y,g,h,b.image)}}function Vb(a,b){this.name="";this.color=new G(a);this.density=void 0!==b?b:2.5E-4}function Wb(a,b,c){this.name="";this.color=new G(a);this.near=void 0!==b?b:1;this.far=void 0!==c?c:1E3}function vd(){H.call(this);this.type="Scene";this.overrideMaterial=this.fog=this.background=null;this.autoUpdate=!0}function ib(a){I.call(this);this.type="SpriteMaterial";this.color=new G(16777215);this.map=null;this.rotation=
0;this.lights=this.fog=!1;this.setValues(a)}function Ic(a){H.call(this);this.type="Sprite";this.material=void 0!==a?a:new ib;this.center=new B(.5,.5)}function Jc(){H.call(this);this.type="LOD";Object.defineProperties(this,{levels:{enumerable:!0,value:[]}})}function Kc(a,b){a=a||[];this.bones=a.slice(0);this.boneMatrices=new Float32Array(16*this.bones.length);if(void 0===b)this.calculateInverses();else if(this.bones.length===b.length)this.boneInverses=b.slice(0);else for(console.warn("THREE.Skeleton boneInverses is the wrong length."),
this.boneInverses=[],a=0,b=this.bones.length;a<b;a++)this.boneInverses.push(new R)}function wd(){H.call(this);this.type="Bone"}function xd(a,b){va.call(this,a,b);this.type="SkinnedMesh";this.bindMode="attached";this.bindMatrix=new R;this.bindMatrixInverse=new R;a=this.initBones();a=new Kc(a);this.bind(a,this.matrixWorld);this.normalizeSkinWeights()}function T(a){I.call(this);this.type="LineBasicMaterial";this.color=new G(16777215);this.linewidth=1;this.linejoin=this.linecap="round";this.lights=!1;
this.setValues(a)}function wa(a,b,c){if(1===c)return console.warn("THREE.Line: parameter THREE.LinePieces no longer supported. Created THREE.LineSegments instead."),new Y(a,b);H.call(this);this.type="Line";this.geometry=void 0!==a?a:new D;this.material=void 0!==b?b:new T({color:16777215*Math.random()})}function Y(a,b){wa.call(this,a,b);this.type="LineSegments"}function yd(a,b){wa.call(this,a,b);this.type="LineLoop"}function Ja(a){I.call(this);this.type="PointsMaterial";this.color=new G(16777215);
this.map=null;this.size=1;this.sizeAttenuation=!0;this.lights=this.morphTargets=!1;this.setValues(a)}function Xb(a,b){H.call(this);this.type="Points";this.geometry=void 0!==a?a:new D;this.material=void 0!==b?b:new Ja({color:16777215*Math.random()})}function be(a,b,c,d,e,f,g,h,l){ea.call(this,a,b,c,d,e,f,g,h,l);this.generateMipmaps=!1}function Yb(a,b,c,d,e,f,g,h,l,m,v,n){ea.call(this,null,f,g,h,l,m,d,e,v,n);this.image={width:b,height:c};this.mipmaps=a;this.generateMipmaps=this.flipY=!1}function Lc(a,
b,c,d,e,f,g,h,l,m){m=void 0!==m?m:1026;if(1026!==m&&1027!==m)throw Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");void 0===c&&1026===m&&(c=1012);void 0===c&&1027===m&&(c=1020);ea.call(this,null,d,e,f,g,h,m,c,l);this.image={width:a,height:b};this.magFilter=void 0!==g?g:1003;this.minFilter=void 0!==h?h:1003;this.generateMipmaps=this.flipY=!1}function Zb(a){D.call(this);this.type="WireframeGeometry";var b=[],c,d,e,f=[0,0],g={},h=["a","b","c"];if(a&&a.isGeometry){var l=
a.faces;var m=0;for(d=l.length;m<d;m++){var v=l[m];for(c=0;3>c;c++){var n=v[h[c]];var t=v[h[(c+1)%3]];f[0]=Math.min(n,t);f[1]=Math.max(n,t);n=f[0]+","+f[1];void 0===g[n]&&(g[n]={index1:f[0],index2:f[1]})}}for(n in g)m=g[n],h=a.vertices[m.index1],b.push(h.x,h.y,h.z),h=a.vertices[m.index2],b.push(h.x,h.y,h.z)}else if(a&&a.isBufferGeometry)if(h=new p,null!==a.index){l=a.attributes.position;v=a.index;var q=a.groups;0===q.length&&(q=[{start:0,count:v.count,materialIndex:0}]);a=0;for(e=q.length;a<e;++a)for(m=
q[a],c=m.start,d=m.count,m=c,d=c+d;m<d;m+=3)for(c=0;3>c;c++)n=v.getX(m+c),t=v.getX(m+(c+1)%3),f[0]=Math.min(n,t),f[1]=Math.max(n,t),n=f[0]+","+f[1],void 0===g[n]&&(g[n]={index1:f[0],index2:f[1]});for(n in g)m=g[n],h.fromBufferAttribute(l,m.index1),b.push(h.x,h.y,h.z),h.fromBufferAttribute(l,m.index2),b.push(h.x,h.y,h.z)}else for(l=a.attributes.position,m=0,d=l.count/3;m<d;m++)for(c=0;3>c;c++)g=3*m+c,h.fromBufferAttribute(l,g),b.push(h.x,h.y,h.z),g=3*m+(c+1)%3,h.fromBufferAttribute(l,g),b.push(h.x,
h.y,h.z);this.addAttribute("position",new z(b,3))}function Mc(a,b,c){P.call(this);this.type="ParametricGeometry";this.parameters={func:a,slices:b,stacks:c};this.fromBufferGeometry(new $b(a,b,c));this.mergeVertices()}function $b(a,b,c){D.call(this);this.type="ParametricBufferGeometry";this.parameters={func:a,slices:b,stacks:c};var d=[],e=[],f=[],g=[],h=new p,l=new p,m=new p,v=new p,n=new p,t,q;3>a.length&&console.error("THREE.ParametricGeometry: Function must now modify a Vector3 as third parameter.");
var k=b+1;for(t=0;t<=c;t++){var u=t/c;for(q=0;q<=b;q++){var y=q/b;a(y,u,l);e.push(l.x,l.y,l.z);0<=y-1E-5?(a(y-1E-5,u,m),v.subVectors(l,m)):(a(y+1E-5,u,m),v.subVectors(m,l));0<=u-1E-5?(a(y,u-1E-5,m),n.subVectors(l,m)):(a(y,u+1E-5,m),n.subVectors(m,l));h.crossVectors(v,n).normalize();f.push(h.x,h.y,h.z);g.push(y,u)}}for(t=0;t<c;t++)for(q=0;q<b;q++)a=t*k+q+1,h=(t+1)*k+q+1,l=(t+1)*k+q,d.push(t*k+q,a,l),d.push(a,h,l);this.setIndex(d);this.addAttribute("position",new z(e,3));this.addAttribute("normal",
new z(f,3));this.addAttribute("uv",new z(g,2))}function Nc(a,b,c,d){P.call(this);this.type="PolyhedronGeometry";this.parameters={vertices:a,indices:b,radius:c,detail:d};this.fromBufferGeometry(new xa(a,b,c,d));this.mergeVertices()}function xa(a,b,c,d){function e(a){h.push(a.x,a.y,a.z)}function f(b,c){b*=3;c.x=a[b+0];c.y=a[b+1];c.z=a[b+2]}function g(a,b,c,d){0>d&&1===a.x&&(l[b]=a.x-1);0===c.x&&0===c.z&&(l[b]=d/2/Math.PI+.5)}D.call(this);this.type="PolyhedronBufferGeometry";this.parameters={vertices:a,
indices:b,radius:c,detail:d};c=c||1;d=d||0;var h=[],l=[];(function(a){for(var c=new p,d=new p,g=new p,h=0;h<b.length;h+=3){f(b[h+0],c);f(b[h+1],d);f(b[h+2],g);var l,m,k=c,w=d,x=g,A=Math.pow(2,a),C=[];for(m=0;m<=A;m++){C[m]=[];var O=k.clone().lerp(x,m/A),Q=w.clone().lerp(x,m/A),M=A-m;for(l=0;l<=M;l++)C[m][l]=0===l&&m===A?O:O.clone().lerp(Q,l/M)}for(m=0;m<A;m++)for(l=0;l<2*(A-m)-1;l++)k=Math.floor(l/2),0===l%2?(e(C[m][k+1]),e(C[m+1][k]),e(C[m][k])):(e(C[m][k+1]),e(C[m+1][k+1]),e(C[m+1][k]))}})(d);(function(a){for(var b=
new p,c=0;c<h.length;c+=3)b.x=h[c+0],b.y=h[c+1],b.z=h[c+2],b.normalize().multiplyScalar(a),h[c+0]=b.x,h[c+1]=b.y,h[c+2]=b.z})(c);(function(){for(var a=new p,b=0;b<h.length;b+=3)a.x=h[b+0],a.y=h[b+1],a.z=h[b+2],l.push(Math.atan2(a.z,-a.x)/2/Math.PI+.5,1-(Math.atan2(-a.y,Math.sqrt(a.x*a.x+a.z*a.z))/Math.PI+.5));a=new p;b=new p;for(var c=new p,d=new p,e=new B,f=new B,k=new B,y=0,w=0;y<h.length;y+=9,w+=6){a.set(h[y+0],h[y+1],h[y+2]);b.set(h[y+3],h[y+4],h[y+5]);c.set(h[y+6],h[y+7],h[y+8]);e.set(l[w+0],
l[w+1]);f.set(l[w+2],l[w+3]);k.set(l[w+4],l[w+5]);d.copy(a).add(b).add(c).divideScalar(3);var x=Math.atan2(d.z,-d.x);g(e,w+0,a,x);g(f,w+2,b,x);g(k,w+4,c,x)}for(a=0;a<l.length;a+=6)b=l[a+0],c=l[a+2],d=l[a+4],e=Math.min(b,c,d),.9<Math.max(b,c,d)&&.1>e&&(.2>b&&(l[a+0]+=1),.2>c&&(l[a+2]+=1),.2>d&&(l[a+4]+=1))})();this.addAttribute("position",new z(h,3));this.addAttribute("normal",new z(h.slice(),3));this.addAttribute("uv",new z(l,2));0===d?this.computeVertexNormals():this.normalizeNormals()}function Oc(a,
b){P.call(this);this.type="TetrahedronGeometry";this.parameters={radius:a,detail:b};this.fromBufferGeometry(new ac(a,b));this.mergeVertices()}function ac(a,b){xa.call(this,[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],[2,1,0,0,3,2,1,3,0,2,3,1],a,b);this.type="TetrahedronBufferGeometry";this.parameters={radius:a,detail:b}}function Pc(a,b){P.call(this);this.type="OctahedronGeometry";this.parameters={radius:a,detail:b};this.fromBufferGeometry(new ub(a,b));this.mergeVertices()}function ub(a,b){xa.call(this,[1,0,0,
-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2],a,b);this.type="OctahedronBufferGeometry";this.parameters={radius:a,detail:b}}function Qc(a,b){P.call(this);this.type="IcosahedronGeometry";this.parameters={radius:a,detail:b};this.fromBufferGeometry(new bc(a,b));this.mergeVertices()}function bc(a,b){var c=(1+Math.sqrt(5))/2;xa.call(this,[-1,c,0,1,c,0,-1,-c,0,1,-c,0,0,-1,c,0,1,c,0,-1,-c,0,1,-c,c,0,-1,c,0,1,-c,0,-1,-c,0,1],[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,
11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],a,b);this.type="IcosahedronBufferGeometry";this.parameters={radius:a,detail:b}}function Rc(a,b){P.call(this);this.type="DodecahedronGeometry";this.parameters={radius:a,detail:b};this.fromBufferGeometry(new cc(a,b));this.mergeVertices()}function cc(a,b){var c=(1+Math.sqrt(5))/2,d=1/c;xa.call(this,[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-d,-c,0,-d,c,0,d,-c,0,d,c,-d,-c,0,-d,c,0,d,-c,0,d,c,
0,-c,0,-d,c,0,-d,-c,0,d,c,0,d],[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9],a,b);this.type="DodecahedronBufferGeometry";this.parameters={radius:a,detail:b}}function Sc(a,b,c,d,e,f){P.call(this);this.type="TubeGeometry";this.parameters={path:a,tubularSegments:b,radius:c,radialSegments:d,
closed:e};void 0!==f&&console.warn("THREE.TubeGeometry: taper has been removed.");a=new dc(a,b,c,d,e);this.tangents=a.tangents;this.normals=a.normals;this.binormals=a.binormals;this.fromBufferGeometry(a);this.mergeVertices()}function dc(a,b,c,d,e){function f(e){v=a.getPointAt(e/b,v);var f=g.normals[e];e=g.binormals[e];for(k=0;k<=d;k++){var m=k/d*Math.PI*2,n=Math.sin(m);m=-Math.cos(m);l.x=m*f.x+n*e.x;l.y=m*f.y+n*e.y;l.z=m*f.z+n*e.z;l.normalize();r.push(l.x,l.y,l.z);h.x=v.x+c*l.x;h.y=v.y+c*l.y;h.z=
v.z+c*l.z;q.push(h.x,h.y,h.z)}}D.call(this);this.type="TubeBufferGeometry";this.parameters={path:a,tubularSegments:b,radius:c,radialSegments:d,closed:e};b=b||64;c=c||1;d=d||8;e=e||!1;var g=a.computeFrenetFrames(b,e);this.tangents=g.tangents;this.normals=g.normals;this.binormals=g.binormals;var h=new p,l=new p,m=new B,v=new p,n,k,q=[],r=[],u=[],y=[];for(n=0;n<b;n++)f(n);f(!1===e?b:0);for(n=0;n<=b;n++)for(k=0;k<=d;k++)m.x=n/b,m.y=k/d,u.push(m.x,m.y);(function(){for(k=1;k<=b;k++)for(n=1;n<=d;n++){var a=
(d+1)*k+(n-1),c=(d+1)*k+n,e=(d+1)*(k-1)+n;y.push((d+1)*(k-1)+(n-1),a,e);y.push(a,c,e)}})();this.setIndex(y);this.addAttribute("position",new z(q,3));this.addAttribute("normal",new z(r,3));this.addAttribute("uv",new z(u,2))}function Tc(a,b,c,d,e,f,g){P.call(this);this.type="TorusKnotGeometry";this.parameters={radius:a,tube:b,tubularSegments:c,radialSegments:d,p:e,q:f};void 0!==g&&console.warn("THREE.TorusKnotGeometry: heightScale has been deprecated. Use .scale( x, y, z ) instead.");this.fromBufferGeometry(new ec(a,
b,c,d,e,f));this.mergeVertices()}function ec(a,b,c,d,e,f){function g(a,b,c,d,e){var f=Math.sin(a);b=c/b*a;c=Math.cos(b);e.x=d*(2+c)*.5*Math.cos(a);e.y=d*(2+c)*f*.5;e.z=d*Math.sin(b)*.5}D.call(this);this.type="TorusKnotBufferGeometry";this.parameters={radius:a,tube:b,tubularSegments:c,radialSegments:d,p:e,q:f};a=a||1;b=b||.4;c=Math.floor(c)||64;d=Math.floor(d)||8;e=e||2;f=f||3;var h=[],l=[],m=[],v=[],n,k=new p,q=new p,r=new p,u=new p,y=new p,w=new p,x=new p;for(n=0;n<=c;++n){var A=n/c*e*Math.PI*2;
g(A,e,f,a,r);g(A+.01,e,f,a,u);w.subVectors(u,r);x.addVectors(u,r);y.crossVectors(w,x);x.crossVectors(y,w);y.normalize();x.normalize();for(A=0;A<=d;++A){var C=A/d*Math.PI*2,O=-b*Math.cos(C);C=b*Math.sin(C);k.x=r.x+(O*x.x+C*y.x);k.y=r.y+(O*x.y+C*y.y);k.z=r.z+(O*x.z+C*y.z);l.push(k.x,k.y,k.z);q.subVectors(k,r).normalize();m.push(q.x,q.y,q.z);v.push(n/c);v.push(A/d)}}for(A=1;A<=c;A++)for(n=1;n<=d;n++)a=(d+1)*A+(n-1),b=(d+1)*A+n,e=(d+1)*(A-1)+n,h.push((d+1)*(A-1)+(n-1),a,e),h.push(a,b,e);this.setIndex(h);
this.addAttribute("position",new z(l,3));this.addAttribute("normal",new z(m,3));this.addAttribute("uv",new z(v,2))}function Uc(a,b,c,d,e){P.call(this);this.type="TorusGeometry";this.parameters={radius:a,tube:b,radialSegments:c,tubularSegments:d,arc:e};this.fromBufferGeometry(new fc(a,b,c,d,e));this.mergeVertices()}function fc(a,b,c,d,e){D.call(this);this.type="TorusBufferGeometry";this.parameters={radius:a,tube:b,radialSegments:c,tubularSegments:d,arc:e};a=a||1;b=b||.4;c=Math.floor(c)||8;d=Math.floor(d)||
6;e=e||2*Math.PI;var f=[],g=[],h=[],l=[],m=new p,v=new p,n=new p,k,q;for(k=0;k<=c;k++)for(q=0;q<=d;q++){var r=q/d*e,u=k/c*Math.PI*2;v.x=(a+b*Math.cos(u))*Math.cos(r);v.y=(a+b*Math.cos(u))*Math.sin(r);v.z=b*Math.sin(u);g.push(v.x,v.y,v.z);m.x=a*Math.cos(r);m.y=a*Math.sin(r);n.subVectors(v,m).normalize();h.push(n.x,n.y,n.z);l.push(q/d);l.push(k/c)}for(k=1;k<=c;k++)for(q=1;q<=d;q++)a=(d+1)*(k-1)+q-1,b=(d+1)*(k-1)+q,e=(d+1)*k+q,f.push((d+1)*k+q-1,a,e),f.push(a,b,e);this.setIndex(f);this.addAttribute("position",
new z(g,3));this.addAttribute("normal",new z(h,3));this.addAttribute("uv",new z(l,2))}function cf(a,b,c,d,e){for(var f,g=0,h=b,l=c-d;h<c;h+=d)g+=(a[l]-a[h])*(a[h+1]+a[l+1]),l=h;if(e===0<g)for(e=b;e<c;e+=d)f=df(e,a[e],a[e+1],f);else for(e=c-d;e>=b;e-=d)f=df(e,a[e],a[e+1],f);f&&vb(f,f.next)&&(Vc(f),f=f.next);return f}function Wc(a,b){if(!a)return a;b||(b=a);do{var c=!1;if(a.steiner||!vb(a,a.next)&&0!==oa(a.prev,a,a.next))a=a.next;else{Vc(a);a=b=a.prev;if(a===a.next)break;c=!0}}while(c||a!==b);return b}
function Xc(a,b,c,d,e,f,g){if(a){if(!g&&f){var h=a,l=h;do null===l.z&&(l.z=ce(l.x,l.y,d,e,f)),l.prevZ=l.prev,l=l.nextZ=l.next;while(l!==h);l.prevZ.nextZ=null;l.prevZ=null;h=l;var m,v,n,k,q=1;do{l=h;var r=h=null;for(v=0;l;){v++;var p=l;for(m=n=0;m<q&&(n++,p=p.nextZ,p);m++);for(k=q;0<n||0<k&&p;)0!==n&&(0===k||!p||l.z<=p.z)?(m=l,l=l.nextZ,n--):(m=p,p=p.nextZ,k--),r?r.nextZ=m:h=m,m.prevZ=r,r=m;l=p}r.nextZ=null;q*=2}while(1<v)}for(h=a;a.prev!==a.next;){l=a.prev;p=a.next;if(f)a:{r=a;k=d;var y=e,w=f;v=r.prev;
n=r;q=r.next;if(0<=oa(v,n,q))r=!1;else{var x=v.x>n.x?v.x>q.x?v.x:q.x:n.x>q.x?n.x:q.x,A=v.y>n.y?v.y>q.y?v.y:q.y:n.y>q.y?n.y:q.y;m=ce(v.x<n.x?v.x<q.x?v.x:q.x:n.x<q.x?n.x:q.x,v.y<n.y?v.y<q.y?v.y:q.y:n.y<q.y?n.y:q.y,k,y,w);k=ce(x,A,k,y,w);for(y=r.nextZ;y&&y.z<=k;){if(y!==r.prev&&y!==r.next&&zd(v.x,v.y,n.x,n.y,q.x,q.y,y.x,y.y)&&0<=oa(y.prev,y,y.next)){r=!1;break a}y=y.nextZ}for(y=r.prevZ;y&&y.z>=m;){if(y!==r.prev&&y!==r.next&&zd(v.x,v.y,n.x,n.y,q.x,q.y,y.x,y.y)&&0<=oa(y.prev,y,y.next)){r=!1;break a}y=
y.prevZ}r=!0}}else a:if(r=a,v=r.prev,n=r,q=r.next,0<=oa(v,n,q))r=!1;else{for(m=r.next.next;m!==r.prev;){if(zd(v.x,v.y,n.x,n.y,q.x,q.y,m.x,m.y)&&0<=oa(m.prev,m,m.next)){r=!1;break a}m=m.next}r=!0}if(r)b.push(l.i/c),b.push(a.i/c),b.push(p.i/c),Vc(a),h=a=p.next;else if(a=p,a===h){if(!g)Xc(Wc(a),b,c,d,e,f,1);else if(1===g){g=b;h=c;l=a;do p=l.prev,r=l.next.next,!vb(p,r)&&ef(p,l,l.next,r)&&Yc(p,r)&&Yc(r,p)&&(g.push(p.i/h),g.push(l.i/h),g.push(r.i/h),Vc(l),Vc(l.next),l=a=r),l=l.next;while(l!==a);a=l;Xc(a,
b,c,d,e,f,2)}else if(2===g)a:{g=a;do{for(h=g.next.next;h!==g.prev;){if(l=g.i!==h.i){l=g;p=h;if(r=l.next.i!==p.i&&l.prev.i!==p.i){b:{r=l;do{if(r.i!==l.i&&r.next.i!==l.i&&r.i!==p.i&&r.next.i!==p.i&&ef(r,r.next,l,p)){r=!0;break b}r=r.next}while(r!==l);r=!1}r=!r}if(r=r&&Yc(l,p)&&Yc(p,l)){r=l;v=!1;n=(l.x+p.x)/2;p=(l.y+p.y)/2;do r.y>p!==r.next.y>p&&r.next.y!==r.y&&n<(r.next.x-r.x)*(p-r.y)/(r.next.y-r.y)+r.x&&(v=!v),r=r.next;while(r!==l);r=v}l=r}if(l){a=ff(g,h);g=Wc(g,g.next);a=Wc(a,a.next);Xc(g,b,c,d,e,
f);Xc(a,b,c,d,e,f);break a}h=h.next}g=g.next}while(g!==a)}break}}}}function Pg(a,b){return a.x-b.x}function Qg(a,b){var c=b,d=a.x,e=a.y,f=-Infinity;do{if(e<=c.y&&e>=c.next.y&&c.next.y!==c.y){var g=c.x+(e-c.y)*(c.next.x-c.x)/(c.next.y-c.y);if(g<=d&&g>f){f=g;if(g===d){if(e===c.y)return c;if(e===c.next.y)return c.next}var h=c.x<c.next.x?c:c.next}}c=c.next}while(c!==b);if(!h)return null;if(d===f)return h.prev;b=h;g=h.x;var l=h.y,m=Infinity;for(c=h.next;c!==b;){if(d>=c.x&&c.x>=g&&d!==c.x&&zd(e<l?d:f,e,
g,l,e<l?f:d,e,c.x,c.y)){var v=Math.abs(e-c.y)/(d-c.x);(v<m||v===m&&c.x>h.x)&&Yc(c,a)&&(h=c,m=v)}c=c.next}return h}function ce(a,b,c,d,e){a=32767*(a-c)*e;b=32767*(b-d)*e;a=(a|a<<8)&16711935;a=(a|a<<4)&252645135;a=(a|a<<2)&858993459;b=(b|b<<8)&16711935;b=(b|b<<4)&252645135;b=(b|b<<2)&858993459;return(a|a<<1)&1431655765|((b|b<<1)&1431655765)<<1}function Rg(a){var b=a,c=a;do b.x<c.x&&(c=b),b=b.next;while(b!==a);return c}function zd(a,b,c,d,e,f,g,h){return 0<=(e-g)*(b-h)-(a-g)*(f-h)&&0<=(a-g)*(d-h)-(c-
g)*(b-h)&&0<=(c-g)*(f-h)-(e-g)*(d-h)}function oa(a,b,c){return(b.y-a.y)*(c.x-b.x)-(b.x-a.x)*(c.y-b.y)}function vb(a,b){return a.x===b.x&&a.y===b.y}function ef(a,b,c,d){return vb(a,b)&&vb(c,d)||vb(a,d)&&vb(c,b)?!0:0<oa(a,b,c)!==0<oa(a,b,d)&&0<oa(c,d,a)!==0<oa(c,d,b)}function Yc(a,b){return 0>oa(a.prev,a,a.next)?0<=oa(a,b,a.next)&&0<=oa(a,a.prev,b):0>oa(a,b,a.prev)||0>oa(a,a.next,b)}function ff(a,b){var c=new de(a.i,a.x,a.y),d=new de(b.i,b.x,b.y),e=a.next,f=b.prev;a.next=b;b.prev=a;c.next=e;e.prev=
c;d.next=c;c.prev=d;f.next=d;d.prev=f;return d}function df(a,b,c,d){a=new de(a,b,c);d?(a.next=d.next,a.prev=d,d.next.prev=a,d.next=a):(a.prev=a,a.next=a);return a}function Vc(a){a.next.prev=a.prev;a.prev.next=a.next;a.prevZ&&(a.prevZ.nextZ=a.nextZ);a.nextZ&&(a.nextZ.prevZ=a.prevZ)}function de(a,b,c){this.i=a;this.x=b;this.y=c;this.nextZ=this.prevZ=this.z=this.next=this.prev=null;this.steiner=!1}function gf(a){var b=a.length;2<b&&a[b-1].equals(a[0])&&a.pop()}function hf(a,b){for(var c=0;c<b.length;c++)a.push(b[c].x),
a.push(b[c].y)}function wb(a,b){P.call(this);this.type="ExtrudeGeometry";this.parameters={shapes:a,options:b};this.fromBufferGeometry(new Ta(a,b));this.mergeVertices()}function Ta(a,b){function c(a){function c(a,b,c){b||console.error("THREE.ExtrudeGeometry: vec does not exist");return b.clone().multiplyScalar(c).add(a)}function g(a,b,c){var d=a.x-b.x;var e=a.y-b.y;var f=c.x-a.x;var g=c.y-a.y,h=d*d+e*e;if(Math.abs(d*g-e*f)>Number.EPSILON){var l=Math.sqrt(h),m=Math.sqrt(f*f+g*g);h=b.x-e/l;b=b.y+d/l;
g=((c.x-g/m-h)*g-(c.y+f/m-b)*f)/(d*g-e*f);f=h+d*g-a.x;d=b+e*g-a.y;e=f*f+d*d;if(2>=e)return new B(f,d);e=Math.sqrt(e/2)}else a=!1,d>Number.EPSILON?f>Number.EPSILON&&(a=!0):d<-Number.EPSILON?f<-Number.EPSILON&&(a=!0):Math.sign(e)===Math.sign(g)&&(a=!0),a?(f=-e,e=Math.sqrt(h)):(f=d,d=e,e=Math.sqrt(h/2));return new B(f/e,d/e)}function h(a,b){for(N=a.length;0<=--N;){var c=N;var f=N-1;0>f&&(f=a.length-1);var g,h=x+2*M;for(g=0;g<h;g++){var l=Z*g,m=Z*(g+1),n=b+f+l,v=b+f+m;m=b+c+m;r(b+c+l);r(n);r(m);r(n);
r(v);r(m);l=e.length/3;l=G.generateSideWallUV(d,e,l-6,l-3,l-2,l-1);u(l[0]);u(l[1]);u(l[3]);u(l[1]);u(l[2]);u(l[3])}}}function l(a,b,c){y.push(a);y.push(b);y.push(c)}function k(a,b,c){r(a);r(b);r(c);a=e.length/3;a=G.generateTopUV(d,e,a-3,a-2,a-1);u(a[0]);u(a[1]);u(a[2])}function r(a){e.push(y[3*a]);e.push(y[3*a+1]);e.push(y[3*a+2])}function u(a){f.push(a.x);f.push(a.y)}var y=[],w=void 0!==b.curveSegments?b.curveSegments:12,x=void 0!==b.steps?b.steps:1,A=void 0!==b.depth?b.depth:100,C=void 0!==b.bevelEnabled?
b.bevelEnabled:!0,O=void 0!==b.bevelThickness?b.bevelThickness:6,Q=void 0!==b.bevelSize?b.bevelSize:O-2,M=void 0!==b.bevelSegments?b.bevelSegments:3,z=b.extrudePath,G=void 0!==b.UVGenerator?b.UVGenerator:Sg;void 0!==b.amount&&(console.warn("THREE.ExtrudeBufferGeometry: amount has been renamed to depth."),A=b.amount);var H=!1;if(z){var D=z.getSpacedPoints(x);H=!0;C=!1;var E=z.computeFrenetFrames(x,!1);var K=new p;var P=new p;var R=new p}C||(Q=O=M=0);var I;w=a.extractPoints(w);a=w.shape;var L=w.holes;
if(!$a.isClockWise(a)){a=a.reverse();var J=0;for(I=L.length;J<I;J++){var S=L[J];$a.isClockWise(S)&&(L[J]=S.reverse())}}var Y=$a.triangulateShape(a,L),X=a;J=0;for(I=L.length;J<I;J++)S=L[J],a=a.concat(S);var T,Z=a.length,fa,V=Y.length;w=[];var N=0;var ba=X.length;var W=ba-1;for(T=N+1;N<ba;N++,W++,T++)W===ba&&(W=0),T===ba&&(T=0),w[N]=g(X[N],X[W],X[T]);z=[];var ea=w.concat();J=0;for(I=L.length;J<I;J++){S=L[J];var ca=[];N=0;ba=S.length;W=ba-1;for(T=N+1;N<ba;N++,W++,T++)W===ba&&(W=0),T===ba&&(T=0),ca[N]=
g(S[N],S[W],S[T]);z.push(ca);ea=ea.concat(ca)}for(W=0;W<M;W++){ba=W/M;var da=O*Math.cos(ba*Math.PI/2);T=Q*Math.sin(ba*Math.PI/2);N=0;for(ba=X.length;N<ba;N++){var ha=c(X[N],w[N],T);l(ha.x,ha.y,-da)}J=0;for(I=L.length;J<I;J++)for(S=L[J],ca=z[J],N=0,ba=S.length;N<ba;N++)ha=c(S[N],ca[N],T),l(ha.x,ha.y,-da)}T=Q;for(N=0;N<Z;N++)ha=C?c(a[N],ea[N],T):a[N],H?(P.copy(E.normals[0]).multiplyScalar(ha.x),K.copy(E.binormals[0]).multiplyScalar(ha.y),R.copy(D[0]).add(P).add(K),l(R.x,R.y,R.z)):l(ha.x,ha.y,0);for(ba=
1;ba<=x;ba++)for(N=0;N<Z;N++)ha=C?c(a[N],ea[N],T):a[N],H?(P.copy(E.normals[ba]).multiplyScalar(ha.x),K.copy(E.binormals[ba]).multiplyScalar(ha.y),R.copy(D[ba]).add(P).add(K),l(R.x,R.y,R.z)):l(ha.x,ha.y,A/x*ba);for(W=M-1;0<=W;W--){ba=W/M;da=O*Math.cos(ba*Math.PI/2);T=Q*Math.sin(ba*Math.PI/2);N=0;for(ba=X.length;N<ba;N++)ha=c(X[N],w[N],T),l(ha.x,ha.y,A+da);J=0;for(I=L.length;J<I;J++)for(S=L[J],ca=z[J],N=0,ba=S.length;N<ba;N++)ha=c(S[N],ca[N],T),H?l(ha.x,ha.y+D[x-1].y,D[x-1].x+da):l(ha.x,ha.y,A+da)}(function(){var a=
e.length/3;if(C){var b=0*Z;for(N=0;N<V;N++)fa=Y[N],k(fa[2]+b,fa[1]+b,fa[0]+b);b=Z*(x+2*M);for(N=0;N<V;N++)fa=Y[N],k(fa[0]+b,fa[1]+b,fa[2]+b)}else{for(N=0;N<V;N++)fa=Y[N],k(fa[2],fa[1],fa[0]);for(N=0;N<V;N++)fa=Y[N],k(fa[0]+Z*x,fa[1]+Z*x,fa[2]+Z*x)}d.addGroup(a,e.length/3-a,0)})();(function(){var a=e.length/3,b=0;h(X,b);b+=X.length;J=0;for(I=L.length;J<I;J++)S=L[J],h(S,b),b+=S.length;d.addGroup(a,e.length/3-a,1)})()}D.call(this);this.type="ExtrudeBufferGeometry";this.parameters={shapes:a,options:b};
a=Array.isArray(a)?a:[a];for(var d=this,e=[],f=[],g=0,h=a.length;g<h;g++)c(a[g]);this.addAttribute("position",new z(e,3));this.addAttribute("uv",new z(f,2));this.computeVertexNormals()}function jf(a,b,c){c.shapes=[];if(Array.isArray(a))for(var d=0,e=a.length;d<e;d++)c.shapes.push(a[d].uuid);else c.shapes.push(a.uuid);void 0!==b.extrudePath&&(c.options.extrudePath=b.extrudePath.toJSON());return c}function Zc(a,b){P.call(this);this.type="TextGeometry";this.parameters={text:a,parameters:b};this.fromBufferGeometry(new gc(a,
b));this.mergeVertices()}function gc(a,b){b=b||{};var c=b.font;if(!c||!c.isFont)return console.error("THREE.TextGeometry: font parameter is not an instance of THREE.Font."),new P;a=c.generateShapes(a,b.size);b.depth=void 0!==b.height?b.height:50;void 0===b.bevelThickness&&(b.bevelThickness=10);void 0===b.bevelSize&&(b.bevelSize=8);void 0===b.bevelEnabled&&(b.bevelEnabled=!1);Ta.call(this,a,b);this.type="TextBufferGeometry"}function $c(a,b,c,d,e,f,g){P.call(this);this.type="SphereGeometry";this.parameters=
{radius:a,widthSegments:b,heightSegments:c,phiStart:d,phiLength:e,thetaStart:f,thetaLength:g};this.fromBufferGeometry(new xb(a,b,c,d,e,f,g));this.mergeVertices()}function xb(a,b,c,d,e,f,g){D.call(this);this.type="SphereBufferGeometry";this.parameters={radius:a,widthSegments:b,heightSegments:c,phiStart:d,phiLength:e,thetaStart:f,thetaLength:g};a=a||1;b=Math.max(3,Math.floor(b)||8);c=Math.max(2,Math.floor(c)||6);d=void 0!==d?d:0;e=void 0!==e?e:2*Math.PI;f=void 0!==f?f:0;g=void 0!==g?g:Math.PI;var h=
f+g,l,m,v=0,n=[],k=new p,q=new p,r=[],u=[],y=[],w=[];for(m=0;m<=c;m++){var x=[],A=m/c;for(l=0;l<=b;l++){var C=l/b;k.x=-a*Math.cos(d+C*e)*Math.sin(f+A*g);k.y=a*Math.cos(f+A*g);k.z=a*Math.sin(d+C*e)*Math.sin(f+A*g);u.push(k.x,k.y,k.z);q.set(k.x,k.y,k.z).normalize();y.push(q.x,q.y,q.z);w.push(C,1-A);x.push(v++)}n.push(x)}for(m=0;m<c;m++)for(l=0;l<b;l++)a=n[m][l+1],d=n[m][l],e=n[m+1][l],g=n[m+1][l+1],(0!==m||0<f)&&r.push(a,d,g),(m!==c-1||h<Math.PI)&&r.push(d,e,g);this.setIndex(r);this.addAttribute("position",
new z(u,3));this.addAttribute("normal",new z(y,3));this.addAttribute("uv",new z(w,2))}function ad(a,b,c,d,e,f){P.call(this);this.type="RingGeometry";this.parameters={innerRadius:a,outerRadius:b,thetaSegments:c,phiSegments:d,thetaStart:e,thetaLength:f};this.fromBufferGeometry(new hc(a,b,c,d,e,f));this.mergeVertices()}function hc(a,b,c,d,e,f){D.call(this);this.type="RingBufferGeometry";this.parameters={innerRadius:a,outerRadius:b,thetaSegments:c,phiSegments:d,thetaStart:e,thetaLength:f};a=a||.5;b=b||
1;e=void 0!==e?e:0;f=void 0!==f?f:2*Math.PI;c=void 0!==c?Math.max(3,c):8;d=void 0!==d?Math.max(1,d):1;var g=[],h=[],l=[],m=[],v=a,n=(b-a)/d,k=new p,q=new B,r,u;for(r=0;r<=d;r++){for(u=0;u<=c;u++)a=e+u/c*f,k.x=v*Math.cos(a),k.y=v*Math.sin(a),h.push(k.x,k.y,k.z),l.push(0,0,1),q.x=(k.x/b+1)/2,q.y=(k.y/b+1)/2,m.push(q.x,q.y);v+=n}for(r=0;r<d;r++)for(b=r*(c+1),u=0;u<c;u++)a=u+b,e=a+c+1,f=a+c+2,v=a+1,g.push(a,e,v),g.push(e,f,v);this.setIndex(g);this.addAttribute("position",new z(h,3));this.addAttribute("normal",
new z(l,3));this.addAttribute("uv",new z(m,2))}function bd(a,b,c,d){P.call(this);this.type="LatheGeometry";this.parameters={points:a,segments:b,phiStart:c,phiLength:d};this.fromBufferGeometry(new ic(a,b,c,d));this.mergeVertices()}function ic(a,b,c,d){D.call(this);this.type="LatheBufferGeometry";this.parameters={points:a,segments:b,phiStart:c,phiLength:d};b=Math.floor(b)||12;c=c||0;d=d||2*Math.PI;d=J.clamp(d,0,2*Math.PI);var e=[],f=[],g=[],h=1/b,l=new p,m=new B,v;for(v=0;v<=b;v++){var n=c+v*h*d;var k=
Math.sin(n),q=Math.cos(n);for(n=0;n<=a.length-1;n++)l.x=a[n].x*k,l.y=a[n].y,l.z=a[n].x*q,f.push(l.x,l.y,l.z),m.x=v/b,m.y=n/(a.length-1),g.push(m.x,m.y)}for(v=0;v<b;v++)for(n=0;n<a.length-1;n++)c=n+v*a.length,h=c+a.length,l=c+a.length+1,m=c+1,e.push(c,h,m),e.push(h,l,m);this.setIndex(e);this.addAttribute("position",new z(f,3));this.addAttribute("uv",new z(g,2));this.computeVertexNormals();if(d===2*Math.PI)for(d=this.attributes.normal.array,e=new p,f=new p,g=new p,c=b*a.length*3,n=v=0;v<a.length;v++,
n+=3)e.x=d[n+0],e.y=d[n+1],e.z=d[n+2],f.x=d[c+n+0],f.y=d[c+n+1],f.z=d[c+n+2],g.addVectors(e,f).normalize(),d[n+0]=d[c+n+0]=g.x,d[n+1]=d[c+n+1]=g.y,d[n+2]=d[c+n+2]=g.z}function yb(a,b){P.call(this);this.type="ShapeGeometry";"object"===typeof b&&(console.warn("THREE.ShapeGeometry: Options parameter has been removed."),b=b.curveSegments);this.parameters={shapes:a,curveSegments:b};this.fromBufferGeometry(new zb(a,b));this.mergeVertices()}function zb(a,b){function c(a){var c,h=e.length/3;a=a.extractPoints(b);
var m=a.shape,k=a.holes;if(!1===$a.isClockWise(m))for(m=m.reverse(),a=0,c=k.length;a<c;a++){var v=k[a];!0===$a.isClockWise(v)&&(k[a]=v.reverse())}var p=$a.triangulateShape(m,k);a=0;for(c=k.length;a<c;a++)v=k[a],m=m.concat(v);a=0;for(c=m.length;a<c;a++)v=m[a],e.push(v.x,v.y,0),f.push(0,0,1),g.push(v.x,v.y);a=0;for(c=p.length;a<c;a++)m=p[a],d.push(m[0]+h,m[1]+h,m[2]+h),l+=3}D.call(this);this.type="ShapeBufferGeometry";this.parameters={shapes:a,curveSegments:b};b=b||12;var d=[],e=[],f=[],g=[],h=0,l=
0;if(!1===Array.isArray(a))c(a);else for(var m=0;m<a.length;m++)c(a[m]),this.addGroup(h,l,m),h+=l,l=0;this.setIndex(d);this.addAttribute("position",new z(e,3));this.addAttribute("normal",new z(f,3));this.addAttribute("uv",new z(g,2))}function kf(a,b){b.shapes=[];if(Array.isArray(a))for(var c=0,d=a.length;c<d;c++)b.shapes.push(a[c].uuid);else b.shapes.push(a.uuid);return b}function jc(a,b){D.call(this);this.type="EdgesGeometry";this.parameters={thresholdAngle:b};var c=[];b=Math.cos(J.DEG2RAD*(void 0!==
b?b:1));var d=[0,0],e={},f=["a","b","c"];if(a.isBufferGeometry){var g=new P;g.fromBufferGeometry(a)}else g=a.clone();g.mergeVertices();g.computeFaceNormals();a=g.vertices;g=g.faces;for(var h=0,l=g.length;h<l;h++)for(var m=g[h],k=0;3>k;k++){var n=m[f[k]];var t=m[f[(k+1)%3]];d[0]=Math.min(n,t);d[1]=Math.max(n,t);n=d[0]+","+d[1];void 0===e[n]?e[n]={index1:d[0],index2:d[1],face1:h,face2:void 0}:e[n].face2=h}for(n in e)if(d=e[n],void 0===d.face2||g[d.face1].normal.dot(g[d.face2].normal)<=b)f=a[d.index1],
c.push(f.x,f.y,f.z),f=a[d.index2],c.push(f.x,f.y,f.z);this.addAttribute("position",new z(c,3))}function Ab(a,b,c,d,e,f,g,h){P.call(this);this.type="CylinderGeometry";this.parameters={radiusTop:a,radiusBottom:b,height:c,radialSegments:d,heightSegments:e,openEnded:f,thetaStart:g,thetaLength:h};this.fromBufferGeometry(new ab(a,b,c,d,e,f,g,h));this.mergeVertices()}function ab(a,b,c,d,e,f,g,h){function l(c){var e,f=new B,l=new p,v=0,u=!0===c?a:b,x=!0===c?1:-1;var z=r;for(e=1;e<=d;e++)n.push(0,y*x,0),t.push(0,
x,0),q.push(.5,.5),r++;var G=r;for(e=0;e<=d;e++){var H=e/d*h+g,D=Math.cos(H);H=Math.sin(H);l.x=u*H;l.y=y*x;l.z=u*D;n.push(l.x,l.y,l.z);t.push(0,x,0);f.x=.5*D+.5;f.y=.5*H*x+.5;q.push(f.x,f.y);r++}for(e=0;e<d;e++)f=z+e,l=G+e,!0===c?k.push(l,l+1,f):k.push(l+1,l,f),v+=3;m.addGroup(w,v,!0===c?1:2);w+=v}D.call(this);this.type="CylinderBufferGeometry";this.parameters={radiusTop:a,radiusBottom:b,height:c,radialSegments:d,heightSegments:e,openEnded:f,thetaStart:g,thetaLength:h};var m=this;a=void 0!==a?a:1;
b=void 0!==b?b:1;c=c||1;d=Math.floor(d)||8;e=Math.floor(e)||1;f=void 0!==f?f:!1;g=void 0!==g?g:0;h=void 0!==h?h:2*Math.PI;var k=[],n=[],t=[],q=[],r=0,u=[],y=c/2,w=0;(function(){var f,l,v=new p,O=new p,Q=0,z=(b-a)/c;for(l=0;l<=e;l++){var B=[],H=l/e,G=H*(b-a)+a;for(f=0;f<=d;f++){var D=f/d,E=D*h+g,J=Math.sin(E);E=Math.cos(E);O.x=G*J;O.y=-H*c+y;O.z=G*E;n.push(O.x,O.y,O.z);v.set(J,z,E).normalize();t.push(v.x,v.y,v.z);q.push(D,1-H);B.push(r++)}u.push(B)}for(f=0;f<d;f++)for(l=0;l<e;l++)v=u[l+1][f],O=u[l+
1][f+1],z=u[l][f+1],k.push(u[l][f],v,z),k.push(v,O,z),Q+=6;m.addGroup(w,Q,0);w+=Q})();!1===f&&(0<a&&l(!0),0<b&&l(!1));this.setIndex(k);this.addAttribute("position",new z(n,3));this.addAttribute("normal",new z(t,3));this.addAttribute("uv",new z(q,2))}function cd(a,b,c,d,e,f,g){Ab.call(this,0,a,b,c,d,e,f,g);this.type="ConeGeometry";this.parameters={radius:a,height:b,radialSegments:c,heightSegments:d,openEnded:e,thetaStart:f,thetaLength:g}}function dd(a,b,c,d,e,f,g){ab.call(this,0,a,b,c,d,e,f,g);this.type=
"ConeBufferGeometry";this.parameters={radius:a,height:b,radialSegments:c,heightSegments:d,openEnded:e,thetaStart:f,thetaLength:g}}function ed(a,b,c,d){P.call(this);this.type="CircleGeometry";this.parameters={radius:a,segments:b,thetaStart:c,thetaLength:d};this.fromBufferGeometry(new kc(a,b,c,d));this.mergeVertices()}function kc(a,b,c,d){D.call(this);this.type="CircleBufferGeometry";this.parameters={radius:a,segments:b,thetaStart:c,thetaLength:d};a=a||1;b=void 0!==b?Math.max(3,b):8;c=void 0!==c?c:
0;d=void 0!==d?d:2*Math.PI;var e=[],f=[],g=[],h=[],l,m=new p,k=new B;f.push(0,0,0);g.push(0,0,1);h.push(.5,.5);var n=0;for(l=3;n<=b;n++,l+=3){var t=c+n/b*d;m.x=a*Math.cos(t);m.y=a*Math.sin(t);f.push(m.x,m.y,m.z);g.push(0,0,1);k.x=(f[l]/a+1)/2;k.y=(f[l+1]/a+1)/2;h.push(k.x,k.y)}for(l=1;l<=b;l++)e.push(l,l+1,0);this.setIndex(e);this.addAttribute("position",new z(f,3));this.addAttribute("normal",new z(g,3));this.addAttribute("uv",new z(h,2))}function Bb(a){I.call(this);this.type="ShadowMaterial";this.color=
new G(0);this.transparent=!0;this.setValues(a)}function lc(a){Fa.call(this,a);this.type="RawShaderMaterial"}function Ua(a){I.call(this);this.defines={STANDARD:""};this.type="MeshStandardMaterial";this.color=new G(16777215);this.metalness=this.roughness=.5;this.lightMap=this.map=null;this.lightMapIntensity=1;this.aoMap=null;this.aoMapIntensity=1;this.emissive=new G(0);this.emissiveIntensity=1;this.bumpMap=this.emissiveMap=null;this.bumpScale=1;this.normalMap=null;this.normalMapType=0;this.normalScale=
new B(1,1);this.displacementMap=null;this.displacementScale=1;this.displacementBias=0;this.envMap=this.alphaMap=this.metalnessMap=this.roughnessMap=null;this.envMapIntensity=1;this.refractionRatio=.98;this.wireframe=!1;this.wireframeLinewidth=1;this.wireframeLinejoin=this.wireframeLinecap="round";this.morphNormals=this.morphTargets=this.skinning=!1;this.setValues(a)}function Cb(a){Ua.call(this);this.defines={PHYSICAL:""};this.type="MeshPhysicalMaterial";this.reflectivity=.5;this.clearCoatRoughness=
this.clearCoat=0;this.setValues(a)}function Ka(a){I.call(this);this.type="MeshPhongMaterial";this.color=new G(16777215);this.specular=new G(1118481);this.shininess=30;this.lightMap=this.map=null;this.lightMapIntensity=1;this.aoMap=null;this.aoMapIntensity=1;this.emissive=new G(0);this.emissiveIntensity=1;this.bumpMap=this.emissiveMap=null;this.bumpScale=1;this.normalMap=null;this.normalMapType=0;this.normalScale=new B(1,1);this.displacementMap=null;this.displacementScale=1;this.displacementBias=0;
this.envMap=this.alphaMap=this.specularMap=null;this.combine=0;this.reflectivity=1;this.refractionRatio=.98;this.wireframe=!1;this.wireframeLinewidth=1;this.wireframeLinejoin=this.wireframeLinecap="round";this.morphNormals=this.morphTargets=this.skinning=!1;this.setValues(a)}function Db(a){Ka.call(this);this.defines={TOON:""};this.type="MeshToonMaterial";this.gradientMap=null;this.setValues(a)}function Eb(a){I.call(this);this.type="MeshNormalMaterial";this.bumpMap=null;this.bumpScale=1;this.normalMap=
null;this.normalMapType=0;this.normalScale=new B(1,1);this.displacementMap=null;this.displacementScale=1;this.displacementBias=0;this.wireframe=!1;this.wireframeLinewidth=1;this.morphNormals=this.morphTargets=this.skinning=this.lights=this.fog=!1;this.setValues(a)}function Fb(a){I.call(this);this.type="MeshLambertMaterial";this.color=new G(16777215);this.lightMap=this.map=null;this.lightMapIntensity=1;this.aoMap=null;this.aoMapIntensity=1;this.emissive=new G(0);this.emissiveIntensity=1;this.envMap=
this.alphaMap=this.specularMap=this.emissiveMap=null;this.combine=0;this.reflectivity=1;this.refractionRatio=.98;this.wireframe=!1;this.wireframeLinewidth=1;this.wireframeLinejoin=this.wireframeLinecap="round";this.morphNormals=this.morphTargets=this.skinning=!1;this.setValues(a)}function Gb(a){T.call(this);this.type="LineDashedMaterial";this.scale=1;this.dashSize=3;this.gapSize=1;this.setValues(a)}function ee(a,b,c){var d=this,e=!1,f=0,g=0,h=void 0;this.onStart=void 0;this.onLoad=a;this.onProgress=
b;this.onError=c;this.itemStart=function(a){g++;if(!1===e&&void 0!==d.onStart)d.onStart(a,f,g);e=!0};this.itemEnd=function(a){f++;if(void 0!==d.onProgress)d.onProgress(a,f,g);if(f===g&&(e=!1,void 0!==d.onLoad))d.onLoad()};this.itemError=function(a){if(void 0!==d.onError)d.onError(a)};this.resolveURL=function(a){return h?h(a):a};this.setURLModifier=function(a){h=a;return this}}function La(a){this.manager=void 0!==a?a:ya}function lf(a){this.manager=void 0!==a?a:ya;this._parser=null}function fe(a){this.manager=
void 0!==a?a:ya;this._parser=null}function fd(a){this.manager=void 0!==a?a:ya}function ge(a){this.manager=void 0!==a?a:ya}function Ad(a){this.manager=void 0!==a?a:ya}function E(){this.type="Curve";this.arcLengthDivisions=200}function Da(a,b,c,d,e,f,g,h){E.call(this);this.type="EllipseCurve";this.aX=a||0;this.aY=b||0;this.xRadius=c||1;this.yRadius=d||1;this.aStartAngle=e||0;this.aEndAngle=f||2*Math.PI;this.aClockwise=g||!1;this.aRotation=h||0}function mc(a,b,c,d,e,f){Da.call(this,a,b,c,c,d,e,f);this.type=
"ArcCurve"}function he(){var a=0,b=0,c=0,d=0;return{initCatmullRom:function(e,f,g,h,l){e=l*(g-e);h=l*(h-f);a=f;b=e;c=-3*f+3*g-2*e-h;d=2*f-2*g+e+h},initNonuniformCatmullRom:function(e,f,g,h,l,m,k){e=((f-e)/l-(g-e)/(l+m)+(g-f)/m)*m;h=((g-f)/m-(h-f)/(m+k)+(h-g)/k)*m;a=f;b=e;c=-3*f+3*g-2*e-h;d=2*f-2*g+e+h},calc:function(e){var f=e*e;return a+b*e+c*f+d*f*e}}}function pa(a,b,c,d){E.call(this);this.type="CatmullRomCurve3";this.points=a||[];this.closed=b||!1;this.curveType=c||"centripetal";this.tension=d||
.5}function mf(a,b,c,d,e){b=.5*(d-b);e=.5*(e-c);var f=a*a;return(2*c-2*d+b+e)*a*f+(-3*c+3*d-2*b-e)*f+b*a+c}function gd(a,b,c,d){var e=1-a;return e*e*b+2*(1-a)*a*c+a*a*d}function hd(a,b,c,d,e){var f=1-a,g=1-a;return f*f*f*b+3*g*g*a*c+3*(1-a)*a*a*d+a*a*a*e}function Ma(a,b,c,d){E.call(this);this.type="CubicBezierCurve";this.v0=a||new B;this.v1=b||new B;this.v2=c||new B;this.v3=d||new B}function Va(a,b,c,d){E.call(this);this.type="CubicBezierCurve3";this.v0=a||new p;this.v1=b||new p;this.v2=c||new p;
this.v3=d||new p}function ia(a,b){E.call(this);this.type="LineCurve";this.v1=a||new B;this.v2=b||new B}function Na(a,b){E.call(this);this.type="LineCurve3";this.v1=a||new p;this.v2=b||new p}function Oa(a,b,c){E.call(this);this.type="QuadraticBezierCurve";this.v0=a||new B;this.v1=b||new B;this.v2=c||new B}function Wa(a,b,c){E.call(this);this.type="QuadraticBezierCurve3";this.v0=a||new p;this.v1=b||new p;this.v2=c||new p}function Pa(a){E.call(this);this.type="SplineCurve";this.points=a||[]}function bb(){E.call(this);
this.type="CurvePath";this.curves=[];this.autoClose=!1}function Qa(a){bb.call(this);this.type="Path";this.currentPoint=new B;a&&this.setFromPoints(a)}function jb(a){Qa.call(this,a);this.uuid=J.generateUUID();this.type="Shape";this.holes=[]}function X(a,b){H.call(this);this.type="Light";this.color=new G(a);this.intensity=void 0!==b?b:1;this.receiveShadow=void 0}function Bd(a,b,c){X.call(this,a,c);this.type="HemisphereLight";this.castShadow=void 0;this.position.copy(H.DefaultUp);this.updateMatrix();
this.groundColor=new G(b)}function Hb(a){this.camera=a;this.bias=0;this.radius=1;this.mapSize=new B(512,512);this.map=null;this.matrix=new R}function Cd(){Hb.call(this,new Z(50,1,.5,500))}function Dd(a,b,c,d,e,f){X.call(this,a,b);this.type="SpotLight";this.position.copy(H.DefaultUp);this.updateMatrix();this.target=new H;Object.defineProperty(this,"power",{get:function(){return this.intensity*Math.PI},set:function(a){this.intensity=a/Math.PI}});this.distance=void 0!==c?c:0;this.angle=void 0!==d?d:
Math.PI/3;this.penumbra=void 0!==e?e:0;this.decay=void 0!==f?f:1;this.shadow=new Cd}function Ed(a,b,c,d){X.call(this,a,b);this.type="PointLight";Object.defineProperty(this,"power",{get:function(){return 4*this.intensity*Math.PI},set:function(a){this.intensity=a/(4*Math.PI)}});this.distance=void 0!==c?c:0;this.decay=void 0!==d?d:1;this.shadow=new Hb(new Z(90,1,.5,500))}function Fd(){Hb.call(this,new Mb(-5,5,5,-5,.5,500))}function Gd(a,b){X.call(this,a,b);this.type="DirectionalLight";this.position.copy(H.DefaultUp);
this.updateMatrix();this.target=new H;this.shadow=new Fd}function Hd(a,b){X.call(this,a,b);this.type="AmbientLight";this.castShadow=void 0}function Id(a,b,c,d){X.call(this,a,b);this.type="RectAreaLight";this.width=void 0!==c?c:10;this.height=void 0!==d?d:10}function Jd(a,b,c,d){ja.call(this,a,b,c,d)}function Kd(a,b,c){ja.call(this,a,b,c)}function Ea(a,b,c,d){this.parameterPositions=a;this._cachedIndex=0;this.resultBuffer=void 0!==d?d:new b.constructor(c);this.sampleValues=b;this.valueSize=c}function Ld(a,
b,c,d){Ea.call(this,a,b,c,d)}function id(a,b,c,d){ja.call(this,a,b,c,d)}function Md(a,b,c,d){ja.call(this,a,b,c,d)}function nc(a,b,c,d){ja.call(this,a,b,c,d)}function Nd(a,b,c,d){Ea.call(this,a,b,c,d);this._offsetNext=this._weightNext=this._offsetPrev=this._weightPrev=-0}function jd(a,b,c,d){Ea.call(this,a,b,c,d)}function Od(a,b,c,d){Ea.call(this,a,b,c,d)}function ja(a,b,c,d){if(void 0===a)throw Error("THREE.KeyframeTrack: track name is undefined");if(void 0===b||0===b.length)throw Error("THREE.KeyframeTrack: no keyframes in track named "+
a);this.name=a;this.times=na.convertArray(b,this.TimeBufferType);this.values=na.convertArray(c,this.ValueBufferType);this.setInterpolation(d||this.DefaultInterpolation);this.validate();this.optimize()}function oc(a,b,c,d){ja.call(this,a,b,c,d)}function Ga(a,b,c){this.name=a;this.tracks=c;this.duration=void 0!==b?b:-1;this.uuid=J.generateUUID();0>this.duration&&this.resetDuration();this.optimize()}function Pd(a){this.manager=void 0!==a?a:ya;this.textures={}}function ie(a){this.manager=void 0!==a?a:
ya}function pc(){}function je(a){"boolean"===typeof a&&(console.warn("THREE.JSONLoader: showStatus parameter has been removed from constructor."),a=void 0);this.manager=void 0!==a?a:ya;this.withCredentials=!1}function nf(a){this.manager=void 0!==a?a:ya;this.texturePath=""}function ke(a){"undefined"===typeof createImageBitmap&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported.");"undefined"===typeof fetch&&console.warn("THREE.ImageBitmapLoader: fetch() not supported.");this.manager=
void 0!==a?a:ya;this.options=void 0}function le(){this.type="ShapePath";this.color=new G;this.subPaths=[];this.currentPath=null}function me(a){this.type="Font";this.data=a}function of(a){this.manager=void 0!==a?a:ya}function ne(a){this.manager=void 0!==a?a:ya}function pf(){this.type="StereoCamera";this.aspect=1;this.eyeSep=.064;this.cameraL=new Z;this.cameraL.layers.enable(1);this.cameraL.matrixAutoUpdate=!1;this.cameraR=new Z;this.cameraR.layers.enable(2);this.cameraR.matrixAutoUpdate=!1}function kd(a,
b,c){H.call(this);this.type="CubeCamera";var d=new Z(90,1,a,b);d.up.set(0,-1,0);d.lookAt(new p(1,0,0));this.add(d);var e=new Z(90,1,a,b);e.up.set(0,-1,0);e.lookAt(new p(-1,0,0));this.add(e);var f=new Z(90,1,a,b);f.up.set(0,0,1);f.lookAt(new p(0,1,0));this.add(f);var g=new Z(90,1,a,b);g.up.set(0,0,-1);g.lookAt(new p(0,-1,0));this.add(g);var h=new Z(90,1,a,b);h.up.set(0,-1,0);h.lookAt(new p(0,0,1));this.add(h);var l=new Z(90,1,a,b);l.up.set(0,-1,0);l.lookAt(new p(0,0,-1));this.add(l);this.renderTarget=
new Lb(c,c,{format:1022,magFilter:1006,minFilter:1006});this.renderTarget.texture.name="CubeCamera";this.update=function(a,b){null===this.parent&&this.updateMatrixWorld();var c=this.renderTarget,m=c.texture.generateMipmaps;c.texture.generateMipmaps=!1;c.activeCubeFace=0;a.render(b,d,c);c.activeCubeFace=1;a.render(b,e,c);c.activeCubeFace=2;a.render(b,f,c);c.activeCubeFace=3;a.render(b,g,c);c.activeCubeFace=4;a.render(b,h,c);c.texture.generateMipmaps=m;c.activeCubeFace=5;a.render(b,l,c);a.setRenderTarget(null)};
this.clear=function(a,b,c,d){for(var e=this.renderTarget,f=0;6>f;f++)e.activeCubeFace=f,a.setRenderTarget(e),a.clear(b,c,d);a.setRenderTarget(null)}}function oe(){H.call(this);this.type="AudioListener";this.context=pe.getContext();this.gain=this.context.createGain();this.gain.connect(this.context.destination);this.filter=null}function qc(a){H.call(this);this.type="Audio";this.context=a.context;this.gain=this.context.createGain();this.gain.connect(a.getInput());this.autoplay=!1;this.buffer=null;this.loop=
!1;this.offset=this.startTime=0;this.playbackRate=1;this.isPlaying=!1;this.hasPlaybackControl=!0;this.sourceType="empty";this.filters=[]}function qe(a){qc.call(this,a);this.panner=this.context.createPanner();this.panner.connect(this.gain)}function re(a,b){this.analyser=a.context.createAnalyser();this.analyser.fftSize=void 0!==b?b:2048;this.data=new Uint8Array(this.analyser.frequencyBinCount);a.getOutput().connect(this.analyser)}function se(a,b,c){this.binding=a;this.valueSize=c;a=Float64Array;switch(b){case "quaternion":b=
this._slerp;break;case "string":case "bool":a=Array;b=this._select;break;default:b=this._lerp}this.buffer=new a(4*c);this._mixBufferRegion=b;this.referenceCount=this.useCount=this.cumulativeWeight=0}function qf(a,b,c){c=c||ra.parseTrackName(b);this._targetGroup=a;this._bindings=a.subscribe_(b,c)}function ra(a,b,c){this.path=b;this.parsedPath=c||ra.parseTrackName(b);this.node=ra.findNode(a,this.parsedPath.nodeName)||a;this.rootNode=a}function rf(){this.uuid=J.generateUUID();this._objects=Array.prototype.slice.call(arguments);
this.nCachedObjects_=0;var a={};this._indicesByUUID=a;for(var b=0,c=arguments.length;b!==c;++b)a[arguments[b].uuid]=b;this._paths=[];this._parsedPaths=[];this._bindings=[];this._bindingsIndicesByPath={};var d=this;this.stats={objects:{get total(){return d._objects.length},get inUse(){return this.total-d.nCachedObjects_}},get bindingsPerObject(){return d._bindings.length}}}function sf(a,b,c){this._mixer=a;this._clip=b;this._localRoot=c||null;a=b.tracks;b=a.length;c=Array(b);for(var d={endingStart:2400,
endingEnd:2400},e=0;e!==b;++e){var f=a[e].createInterpolant(null);c[e]=f;f.settings=d}this._interpolantSettings=d;this._interpolants=c;this._propertyBindings=Array(b);this._weightInterpolant=this._timeScaleInterpolant=this._byClipCacheIndex=this._cacheIndex=null;this.loop=2201;this._loopCount=-1;this._startTime=null;this.time=0;this._effectiveWeight=this.weight=this._effectiveTimeScale=this.timeScale=1;this.repetitions=Infinity;this.paused=!1;this.enabled=!0;this.clampWhenFinished=!1;this.zeroSlopeAtEnd=
this.zeroSlopeAtStart=!0}function te(a){this._root=a;this._initMemoryManager();this.time=this._accuIndex=0;this.timeScale=1}function Qd(a,b){"string"===typeof a&&(console.warn("THREE.Uniform: Type parameter is no longer needed."),a=b);this.value=a}function ue(){D.call(this);this.type="InstancedBufferGeometry";this.maxInstancedCount=void 0}function ve(a,b,c,d){this.data=a;this.itemSize=b;this.offset=c;this.normalized=!0===d}function rc(a,b){this.array=a;this.stride=b;this.count=void 0!==a?a.length/
b:0;this.dynamic=!1;this.updateRange={offset:0,count:-1};this.version=0}function we(a,b,c){rc.call(this,a,b);this.meshPerAttribute=c||1}function xe(a,b,c){L.call(this,a,b);this.meshPerAttribute=c||1}function tf(a,b,c,d){this.ray=new sb(a,b);this.near=c||0;this.far=d||Infinity;this.params={Mesh:{},Line:{},LOD:{},Points:{threshold:1},Sprite:{}};Object.defineProperties(this.params,{PointCloud:{get:function(){console.warn("THREE.Raycaster: params.PointCloud has been renamed to params.Points.");return this.Points}}})}
function uf(a,b){return a.distance-b.distance}function ye(a,b,c,d){if(!1!==a.visible&&(a.raycast(b,c),!0===d)){a=a.children;d=0;for(var e=a.length;d<e;d++)ye(a[d],b,c,!0)}}function vf(a){this.autoStart=void 0!==a?a:!0;this.elapsedTime=this.oldTime=this.startTime=0;this.running=!1}function wf(a,b,c){this.radius=void 0!==a?a:1;this.phi=void 0!==b?b:0;this.theta=void 0!==c?c:0;return this}function xf(a,b,c){this.radius=void 0!==a?a:1;this.theta=void 0!==b?b:0;this.y=void 0!==c?c:0;return this}function ze(a,
b){this.min=void 0!==a?a:new B(Infinity,Infinity);this.max=void 0!==b?b:new B(-Infinity,-Infinity)}function ld(a){H.call(this);this.material=a;this.render=function(){}}function md(a,b,c,d){this.object=a;this.size=void 0!==b?b:1;a=void 0!==c?c:16711680;d=void 0!==d?d:1;b=0;(c=this.object.geometry)&&c.isGeometry?b=3*c.faces.length:c&&c.isBufferGeometry&&(b=c.attributes.normal.count);c=new D;b=new z(6*b,3);c.addAttribute("position",b);Y.call(this,c,new T({color:a,linewidth:d}));this.matrixAutoUpdate=
!1;this.update()}function sc(a,b){H.call(this);this.light=a;this.light.updateMatrixWorld();this.matrix=a.matrixWorld;this.matrixAutoUpdate=!1;this.color=b;a=new D;b=[0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,-1,0,1,0,0,0,0,1,1,0,0,0,0,-1,1];for(var c=0,d=1;32>c;c++,d++){var e=c/32*Math.PI*2,f=d/32*Math.PI*2;b.push(Math.cos(e),Math.sin(e),1,Math.cos(f),Math.sin(f),1)}a.addAttribute("position",new z(b,3));b=new T({fog:!1});this.cone=new Y(a,b);this.add(this.cone);this.update()}function yf(a){var b=[];a&&a.isBone&&
b.push(a);for(var c=0;c<a.children.length;c++)b.push.apply(b,yf(a.children[c]));return b}function tc(a){for(var b=yf(a),c=new D,d=[],e=[],f=new G(0,0,1),g=new G(0,1,0),h=0;h<b.length;h++){var l=b[h];l.parent&&l.parent.isBone&&(d.push(0,0,0),d.push(0,0,0),e.push(f.r,f.g,f.b),e.push(g.r,g.g,g.b))}c.addAttribute("position",new z(d,3));c.addAttribute("color",new z(e,3));d=new T({vertexColors:2,depthTest:!1,depthWrite:!1,transparent:!0});Y.call(this,c,d);this.root=a;this.bones=b;this.matrix=a.matrixWorld;
this.matrixAutoUpdate=!1}function uc(a,b,c){this.light=a;this.light.updateMatrixWorld();this.color=c;a=new xb(b,4,2);b=new ua({wireframe:!0,fog:!1});va.call(this,a,b);this.matrix=this.light.matrixWorld;this.matrixAutoUpdate=!1;this.update()}function vc(a,b){H.call(this);this.light=a;this.light.updateMatrixWorld();this.matrix=a.matrixWorld;this.matrixAutoUpdate=!1;this.color=b;a=new T({fog:!1});b=new D;b.addAttribute("position",new L(new Float32Array(15),3));this.line=new wa(b,a);this.add(this.line);
this.update()}function wc(a,b,c){H.call(this);this.light=a;this.light.updateMatrixWorld();this.matrix=a.matrixWorld;this.matrixAutoUpdate=!1;this.color=c;a=new ub(b);a.rotateY(.5*Math.PI);this.material=new ua({wireframe:!0,fog:!1});void 0===this.color&&(this.material.vertexColors=2);b=a.getAttribute("position");b=new Float32Array(3*b.count);a.addAttribute("color",new L(b,3));this.add(new va(a,this.material));this.update()}function nd(a,b,c,d){a=a||10;b=b||10;c=new G(void 0!==c?c:4473924);d=new G(void 0!==
d?d:8947848);var e=b/2,f=a/b,g=a/2;a=[];for(var h=[],l=0,m=0,k=-g;l<=b;l++,k+=f){a.push(-g,0,k,g,0,k);a.push(k,0,-g,k,0,g);var n=l===e?c:d;n.toArray(h,m);m+=3;n.toArray(h,m);m+=3;n.toArray(h,m);m+=3;n.toArray(h,m);m+=3}b=new D;b.addAttribute("position",new z(a,3));b.addAttribute("color",new z(h,3));c=new T({vertexColors:2});Y.call(this,b,c)}function Rd(a,b,c,d,e,f){a=a||10;b=b||16;c=c||8;d=d||64;e=new G(void 0!==e?e:4473924);f=new G(void 0!==f?f:8947848);var g=[],h=[],l;for(l=0;l<=b;l++){var m=l/
b*2*Math.PI;var k=Math.sin(m)*a;m=Math.cos(m)*a;g.push(0,0,0);g.push(k,0,m);var n=l&1?e:f;h.push(n.r,n.g,n.b);h.push(n.r,n.g,n.b)}for(l=0;l<=c;l++){n=l&1?e:f;var t=a-a/c*l;for(b=0;b<d;b++)m=b/d*2*Math.PI,k=Math.sin(m)*t,m=Math.cos(m)*t,g.push(k,0,m),h.push(n.r,n.g,n.b),m=(b+1)/d*2*Math.PI,k=Math.sin(m)*t,m=Math.cos(m)*t,g.push(k,0,m),h.push(n.r,n.g,n.b)}a=new D;a.addAttribute("position",new z(g,3));a.addAttribute("color",new z(h,3));g=new T({vertexColors:2});Y.call(this,a,g)}function od(a,b,c,d){this.object=
a;this.size=void 0!==b?b:1;a=void 0!==c?c:16776960;d=void 0!==d?d:1;b=0;(c=this.object.geometry)&&c.isGeometry?b=c.faces.length:console.warn("THREE.FaceNormalsHelper: only THREE.Geometry is supported. Use THREE.VertexNormalsHelper, instead.");c=new D;b=new z(6*b,3);c.addAttribute("position",b);Y.call(this,c,new T({color:a,linewidth:d}));this.matrixAutoUpdate=!1;this.update()}function xc(a,b,c){H.call(this);this.light=a;this.light.updateMatrixWorld();this.matrix=a.matrixWorld;this.matrixAutoUpdate=
!1;this.color=c;void 0===b&&(b=1);a=new D;a.addAttribute("position",new z([-b,b,0,b,b,0,b,-b,0,-b,-b,0,-b,b,0],3));b=new T({fog:!1});this.lightPlane=new wa(a,b);this.add(this.lightPlane);a=new D;a.addAttribute("position",new z([0,0,0,0,0,1],3));this.targetLine=new wa(a,b);this.add(this.targetLine);this.update()}function pd(a){function b(a,b,d){c(a,d);c(b,d)}function c(a,b){f.push(0,0,0);g.push(b.r,b.g,b.b);void 0===h[a]&&(h[a]=[]);h[a].push(f.length/3-1)}var d=new D,e=new T({color:16777215,vertexColors:1}),
f=[],g=[],h={},l=new G(16755200),m=new G(16711680),k=new G(43775),n=new G(16777215),t=new G(3355443);b("n1","n2",l);b("n2","n4",l);b("n4","n3",l);b("n3","n1",l);b("f1","f2",l);b("f2","f4",l);b("f4","f3",l);b("f3","f1",l);b("n1","f1",l);b("n2","f2",l);b("n3","f3",l);b("n4","f4",l);b("p","n1",m);b("p","n2",m);b("p","n3",m);b("p","n4",m);b("u1","u2",k);b("u2","u3",k);b("u3","u1",k);b("c","t",n);b("p","c",t);b("cn1","cn2",t);b("cn3","cn4",t);b("cf1","cf2",t);b("cf3","cf4",t);d.addAttribute("position",
new z(f,3));d.addAttribute("color",new z(g,3));Y.call(this,d,e);this.camera=a;this.camera.updateProjectionMatrix&&this.camera.updateProjectionMatrix();this.matrix=a.matrixWorld;this.matrixAutoUpdate=!1;this.pointMap=h;this.update()}function Ib(a,b){this.object=a;void 0===b&&(b=16776960);a=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]);var c=new Float32Array(24),d=new D;d.setIndex(new L(a,1));d.addAttribute("position",new L(c,3));Y.call(this,d,new T({color:b}));this.matrixAutoUpdate=
!1;this.update()}function qd(a,b){this.type="Box3Helper";this.box=a;a=void 0!==b?b:16776960;b=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]);var c=new D;c.setIndex(new L(b,1));c.addAttribute("position",new z([1,1,1,-1,1,1,-1,-1,1,1,-1,1,1,1,-1,-1,1,-1,-1,-1,-1,1,-1,-1],3));Y.call(this,c,new T({color:a}));this.geometry.computeBoundingSphere()}function rd(a,b,c){this.type="PlaneHelper";this.plane=a;this.size=void 0===b?1:b;a=void 0!==c?c:16776960;b=new D;b.addAttribute("position",
new z([1,-1,1,-1,1,1,-1,-1,1,1,1,1,-1,1,1,-1,-1,1,1,-1,1,1,1,1,0,0,1,0,0,0],3));b.computeBoundingSphere();wa.call(this,b,new T({color:a}));b=new D;b.addAttribute("position",new z([1,1,1,-1,1,1,-1,-1,1,1,1,1,-1,-1,1,1,-1,1],3));b.computeBoundingSphere();this.add(new va(b,new ua({color:a,opacity:.2,transparent:!0,depthWrite:!1})))}function Jb(a,b,c,d,e,f){H.call(this);void 0===d&&(d=16776960);void 0===c&&(c=1);void 0===e&&(e=.2*c);void 0===f&&(f=.2*e);void 0===Sd&&(Sd=new D,Sd.addAttribute("position",
new z([0,0,0,0,1,0],3)),Ae=new ab(0,.5,1,5,1),Ae.translate(0,-.5,0));this.position.copy(b);this.line=new wa(Sd,new T({color:d}));this.line.matrixAutoUpdate=!1;this.add(this.line);this.cone=new va(Ae,new ua({color:d}));this.cone.matrixAutoUpdate=!1;this.add(this.cone);this.setDirection(a);this.setLength(c,e,f)}function sd(a){a=a||1;var b=[0,0,0,a,0,0,0,0,0,0,a,0,0,0,0,0,0,a];a=new D;a.addAttribute("position",new z(b,3));a.addAttribute("color",new z([1,0,0,1,.6,0,0,1,0,.6,1,0,0,0,1,0,.6,1],3));b=new T({vertexColors:2});
Y.call(this,a,b)}function zf(a){console.warn("THREE.ClosedSplineCurve3 has been deprecated. Use THREE.CatmullRomCurve3 instead.");pa.call(this,a);this.type="catmullrom";this.closed=!0}function Af(a){console.warn("THREE.SplineCurve3 has been deprecated. Use THREE.CatmullRomCurve3 instead.");pa.call(this,a);this.type="catmullrom"}function Be(a){console.warn("THREE.Spline has been removed. Use THREE.CatmullRomCurve3 instead.");pa.call(this,a);this.type="catmullrom"}void 0===Number.EPSILON&&(Number.EPSILON=
Math.pow(2,-52));void 0===Number.isInteger&&(Number.isInteger=function(a){return"number"===typeof a&&isFinite(a)&&Math.floor(a)===a});void 0===Math.sign&&(Math.sign=function(a){return 0>a?-1:0<a?1:+a});!1==="name"in Function.prototype&&Object.defineProperty(Function.prototype,"name",{get:function(){return this.toString().match(/^\s*function\s*([^\(\s]*)/)[1]}});void 0===Object.assign&&function(){Object.assign=function(a){if(void 0===a||null===a)throw new TypeError("Cannot convert undefined or null to object");
for(var b=Object(a),c=1;c<arguments.length;c++){var d=arguments[c];if(void 0!==d&&null!==d)for(var e in d)Object.prototype.hasOwnProperty.call(d,e)&&(b[e]=d[e])}return b}}();Object.assign(za.prototype,{addEventListener:function(a,b){void 0===this._listeners&&(this._listeners={});var c=this._listeners;void 0===c[a]&&(c[a]=[]);-1===c[a].indexOf(b)&&c[a].push(b)},hasEventListener:function(a,b){if(void 0===this._listeners)return!1;var c=this._listeners;return void 0!==c[a]&&-1!==c[a].indexOf(b)},removeEventListener:function(a,
b){void 0!==this._listeners&&(a=this._listeners[a],void 0!==a&&(b=a.indexOf(b),-1!==b&&a.splice(b,1)))},dispatchEvent:function(a){if(void 0!==this._listeners){var b=this._listeners[a.type];if(void 0!==b){a.target=this;b=b.slice(0);for(var c=0,d=b.length;c<d;c++)b[c].call(this,a)}}}});var J={DEG2RAD:Math.PI/180,RAD2DEG:180/Math.PI,generateUUID:function(){for(var a=[],b=0;256>b;b++)a[b]=(16>b?"0":"")+b.toString(16);return function(){var b=4294967295*Math.random()|0,d=4294967295*Math.random()|0,e=4294967295*
Math.random()|0,f=4294967295*Math.random()|0;return(a[b&255]+a[b>>8&255]+a[b>>16&255]+a[b>>24&255]+"-"+a[d&255]+a[d>>8&255]+"-"+a[d>>16&15|64]+a[d>>24&255]+"-"+a[e&63|128]+a[e>>8&255]+"-"+a[e>>16&255]+a[e>>24&255]+a[f&255]+a[f>>8&255]+a[f>>16&255]+a[f>>24&255]).toUpperCase()}}(),clamp:function(a,b,c){return Math.max(b,Math.min(c,a))},euclideanModulo:function(a,b){return(a%b+b)%b},mapLinear:function(a,b,c,d,e){return d+(a-b)*(e-d)/(c-b)},lerp:function(a,b,c){return(1-c)*a+c*b},smoothstep:function(a,
b,c){if(a<=b)return 0;if(a>=c)return 1;a=(a-b)/(c-b);return a*a*(3-2*a)},smootherstep:function(a,b,c){if(a<=b)return 0;if(a>=c)return 1;a=(a-b)/(c-b);return a*a*a*(a*(6*a-15)+10)},randInt:function(a,b){return a+Math.floor(Math.random()*(b-a+1))},randFloat:function(a,b){return a+Math.random()*(b-a)},randFloatSpread:function(a){return a*(.5-Math.random())},degToRad:function(a){return a*J.DEG2RAD},radToDeg:function(a){return a*J.RAD2DEG},isPowerOfTwo:function(a){return 0===(a&a-1)&&0!==a},ceilPowerOfTwo:function(a){return Math.pow(2,
Math.ceil(Math.log(a)/Math.LN2))},floorPowerOfTwo:function(a){return Math.pow(2,Math.floor(Math.log(a)/Math.LN2))}};Object.defineProperties(B.prototype,{width:{get:function(){return this.x},set:function(a){this.x=a}},height:{get:function(){return this.y},set:function(a){this.y=a}}});Object.assign(B.prototype,{isVector2:!0,set:function(a,b){this.x=a;this.y=b;return this},setScalar:function(a){this.y=this.x=a;return this},setX:function(a){this.x=a;return this},setY:function(a){this.y=a;return this},
setComponent:function(a,b){switch(a){case 0:this.x=b;break;case 1:this.y=b;break;default:throw Error("index is out of range: "+a);}return this},getComponent:function(a){switch(a){case 0:return this.x;case 1:return this.y;default:throw Error("index is out of range: "+a);}},clone:function(){return new this.constructor(this.x,this.y)},copy:function(a){this.x=a.x;this.y=a.y;return this},add:function(a,b){if(void 0!==b)return console.warn("THREE.Vector2: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),
this.addVectors(a,b);this.x+=a.x;this.y+=a.y;return this},addScalar:function(a){this.x+=a;this.y+=a;return this},addVectors:function(a,b){this.x=a.x+b.x;this.y=a.y+b.y;return this},addScaledVector:function(a,b){this.x+=a.x*b;this.y+=a.y*b;return this},sub:function(a,b){if(void 0!==b)return console.warn("THREE.Vector2: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(a,b);this.x-=a.x;this.y-=a.y;return this},subScalar:function(a){this.x-=a;this.y-=a;return this},
subVectors:function(a,b){this.x=a.x-b.x;this.y=a.y-b.y;return this},multiply:function(a){this.x*=a.x;this.y*=a.y;return this},multiplyScalar:function(a){this.x*=a;this.y*=a;return this},divide:function(a){this.x/=a.x;this.y/=a.y;return this},divideScalar:function(a){return this.multiplyScalar(1/a)},applyMatrix3:function(a){var b=this.x,c=this.y;a=a.elements;this.x=a[0]*b+a[3]*c+a[6];this.y=a[1]*b+a[4]*c+a[7];return this},min:function(a){this.x=Math.min(this.x,a.x);this.y=Math.min(this.y,a.y);return this},
max:function(a){this.x=Math.max(this.x,a.x);this.y=Math.max(this.y,a.y);return this},clamp:function(a,b){this.x=Math.max(a.x,Math.min(b.x,this.x));this.y=Math.max(a.y,Math.min(b.y,this.y));return this},clampScalar:function(){var a=new B,b=new B;return function(c,d){a.set(c,c);b.set(d,d);return this.clamp(a,b)}}(),clampLength:function(a,b){var c=this.length();return this.divideScalar(c||1).multiplyScalar(Math.max(a,Math.min(b,c)))},floor:function(){this.x=Math.floor(this.x);this.y=Math.floor(this.y);
return this},ceil:function(){this.x=Math.ceil(this.x);this.y=Math.ceil(this.y);return this},round:function(){this.x=Math.round(this.x);this.y=Math.round(this.y);return this},roundToZero:function(){this.x=0>this.x?Math.ceil(this.x):Math.floor(this.x);this.y=0>this.y?Math.ceil(this.y):Math.floor(this.y);return this},negate:function(){this.x=-this.x;this.y=-this.y;return this},dot:function(a){return this.x*a.x+this.y*a.y},lengthSq:function(){return this.x*this.x+this.y*this.y},length:function(){return Math.sqrt(this.x*
this.x+this.y*this.y)},manhattanLength:function(){return Math.abs(this.x)+Math.abs(this.y)},normalize:function(){return this.divideScalar(this.length()||1)},angle:function(){var a=Math.atan2(this.y,this.x);0>a&&(a+=2*Math.PI);return a},distanceTo:function(a){return Math.sqrt(this.distanceToSquared(a))},distanceToSquared:function(a){var b=this.x-a.x;a=this.y-a.y;return b*b+a*a},manhattanDistanceTo:function(a){return Math.abs(this.x-a.x)+Math.abs(this.y-a.y)},setLength:function(a){return this.normalize().multiplyScalar(a)},
lerp:function(a,b){this.x+=(a.x-this.x)*b;this.y+=(a.y-this.y)*b;return this},lerpVectors:function(a,b,c){return this.subVectors(b,a).multiplyScalar(c).add(a)},equals:function(a){return a.x===this.x&&a.y===this.y},fromArray:function(a,b){void 0===b&&(b=0);this.x=a[b];this.y=a[b+1];return this},toArray:function(a,b){void 0===a&&(a=[]);void 0===b&&(b=0);a[b]=this.x;a[b+1]=this.y;return a},fromBufferAttribute:function(a,b,c){void 0!==c&&console.warn("THREE.Vector2: offset has been removed from .fromBufferAttribute().");
this.x=a.getX(b);this.y=a.getY(b);return this},rotateAround:function(a,b){var c=Math.cos(b);b=Math.sin(b);var d=this.x-a.x,e=this.y-a.y;this.x=d*c-e*b+a.x;this.y=d*b+e*c+a.y;return this}});Object.assign(R.prototype,{isMatrix4:!0,set:function(a,b,c,d,e,f,g,h,l,m,k,n,t,q,r,p){var v=this.elements;v[0]=a;v[4]=b;v[8]=c;v[12]=d;v[1]=e;v[5]=f;v[9]=g;v[13]=h;v[2]=l;v[6]=m;v[10]=k;v[14]=n;v[3]=t;v[7]=q;v[11]=r;v[15]=p;return this},identity:function(){this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1);return this},
clone:function(){return(new R).fromArray(this.elements)},copy:function(a){var b=this.elements;a=a.elements;b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=a[12];b[13]=a[13];b[14]=a[14];b[15]=a[15];return this},copyPosition:function(a){var b=this.elements;a=a.elements;b[12]=a[12];b[13]=a[13];b[14]=a[14];return this},extractBasis:function(a,b,c){a.setFromMatrixColumn(this,0);b.setFromMatrixColumn(this,1);c.setFromMatrixColumn(this,
2);return this},makeBasis:function(a,b,c){this.set(a.x,b.x,c.x,0,a.y,b.y,c.y,0,a.z,b.z,c.z,0,0,0,0,1);return this},extractRotation:function(){var a=new p;return function(b){var c=this.elements,d=b.elements,e=1/a.setFromMatrixColumn(b,0).length(),f=1/a.setFromMatrixColumn(b,1).length();b=1/a.setFromMatrixColumn(b,2).length();c[0]=d[0]*e;c[1]=d[1]*e;c[2]=d[2]*e;c[3]=0;c[4]=d[4]*f;c[5]=d[5]*f;c[6]=d[6]*f;c[7]=0;c[8]=d[8]*b;c[9]=d[9]*b;c[10]=d[10]*b;c[11]=0;c[12]=0;c[13]=0;c[14]=0;c[15]=1;return this}}(),
makeRotationFromEuler:function(a){a&&a.isEuler||console.error("THREE.Matrix4: .makeRotationFromEuler() now expects a Euler rotation rather than a Vector3 and order.");var b=this.elements,c=a.x,d=a.y,e=a.z,f=Math.cos(c);c=Math.sin(c);var g=Math.cos(d);d=Math.sin(d);var h=Math.cos(e);e=Math.sin(e);if("XYZ"===a.order){a=f*h;var l=f*e,m=c*h,k=c*e;b[0]=g*h;b[4]=-g*e;b[8]=d;b[1]=l+m*d;b[5]=a-k*d;b[9]=-c*g;b[2]=k-a*d;b[6]=m+l*d;b[10]=f*g}else"YXZ"===a.order?(a=g*h,l=g*e,m=d*h,k=d*e,b[0]=a+k*c,b[4]=m*c-l,
b[8]=f*d,b[1]=f*e,b[5]=f*h,b[9]=-c,b[2]=l*c-m,b[6]=k+a*c,b[10]=f*g):"ZXY"===a.order?(a=g*h,l=g*e,m=d*h,k=d*e,b[0]=a-k*c,b[4]=-f*e,b[8]=m+l*c,b[1]=l+m*c,b[5]=f*h,b[9]=k-a*c,b[2]=-f*d,b[6]=c,b[10]=f*g):"ZYX"===a.order?(a=f*h,l=f*e,m=c*h,k=c*e,b[0]=g*h,b[4]=m*d-l,b[8]=a*d+k,b[1]=g*e,b[5]=k*d+a,b[9]=l*d-m,b[2]=-d,b[6]=c*g,b[10]=f*g):"YZX"===a.order?(a=f*g,l=f*d,m=c*g,k=c*d,b[0]=g*h,b[4]=k-a*e,b[8]=m*e+l,b[1]=e,b[5]=f*h,b[9]=-c*h,b[2]=-d*h,b[6]=l*e+m,b[10]=a-k*e):"XZY"===a.order&&(a=f*g,l=f*d,m=c*g,k=
c*d,b[0]=g*h,b[4]=-e,b[8]=d*h,b[1]=a*e+k,b[5]=f*h,b[9]=l*e-m,b[2]=m*e-l,b[6]=c*h,b[10]=k*e+a);b[3]=0;b[7]=0;b[11]=0;b[12]=0;b[13]=0;b[14]=0;b[15]=1;return this},makeRotationFromQuaternion:function(){var a=new p(0,0,0),b=new p(1,1,1);return function(c){return this.compose(a,c,b)}}(),lookAt:function(){var a=new p,b=new p,c=new p;return function(d,e,f){var g=this.elements;c.subVectors(d,e);0===c.lengthSq()&&(c.z=1);c.normalize();a.crossVectors(f,c);0===a.lengthSq()&&(1===Math.abs(f.z)?c.x+=1E-4:c.z+=
1E-4,c.normalize(),a.crossVectors(f,c));a.normalize();b.crossVectors(c,a);g[0]=a.x;g[4]=b.x;g[8]=c.x;g[1]=a.y;g[5]=b.y;g[9]=c.y;g[2]=a.z;g[6]=b.z;g[10]=c.z;return this}}(),multiply:function(a,b){return void 0!==b?(console.warn("THREE.Matrix4: .multiply() now only accepts one argument. Use .multiplyMatrices( a, b ) instead."),this.multiplyMatrices(a,b)):this.multiplyMatrices(this,a)},premultiply:function(a){return this.multiplyMatrices(a,this)},multiplyMatrices:function(a,b){var c=a.elements,d=b.elements;
b=this.elements;a=c[0];var e=c[4],f=c[8],g=c[12],h=c[1],l=c[5],m=c[9],k=c[13],n=c[2],t=c[6],q=c[10],r=c[14],p=c[3],y=c[7],w=c[11];c=c[15];var x=d[0],A=d[4],C=d[8],O=d[12],Q=d[1],z=d[5],B=d[9],H=d[13],G=d[2],D=d[6],E=d[10],J=d[14],L=d[3],I=d[7],K=d[11];d=d[15];b[0]=a*x+e*Q+f*G+g*L;b[4]=a*A+e*z+f*D+g*I;b[8]=a*C+e*B+f*E+g*K;b[12]=a*O+e*H+f*J+g*d;b[1]=h*x+l*Q+m*G+k*L;b[5]=h*A+l*z+m*D+k*I;b[9]=h*C+l*B+m*E+k*K;b[13]=h*O+l*H+m*J+k*d;b[2]=n*x+t*Q+q*G+r*L;b[6]=n*A+t*z+q*D+r*I;b[10]=n*C+t*B+q*E+r*K;b[14]=n*
O+t*H+q*J+r*d;b[3]=p*x+y*Q+w*G+c*L;b[7]=p*A+y*z+w*D+c*I;b[11]=p*C+y*B+w*E+c*K;b[15]=p*O+y*H+w*J+c*d;return this},multiplyScalar:function(a){var b=this.elements;b[0]*=a;b[4]*=a;b[8]*=a;b[12]*=a;b[1]*=a;b[5]*=a;b[9]*=a;b[13]*=a;b[2]*=a;b[6]*=a;b[10]*=a;b[14]*=a;b[3]*=a;b[7]*=a;b[11]*=a;b[15]*=a;return this},applyToBufferAttribute:function(){var a=new p;return function(b){for(var c=0,d=b.count;c<d;c++)a.x=b.getX(c),a.y=b.getY(c),a.z=b.getZ(c),a.applyMatrix4(this),b.setXYZ(c,a.x,a.y,a.z);return b}}(),
determinant:function(){var a=this.elements,b=a[0],c=a[4],d=a[8],e=a[12],f=a[1],g=a[5],h=a[9],l=a[13],m=a[2],k=a[6],n=a[10],t=a[14];return a[3]*(+e*h*k-d*l*k-e*g*n+c*l*n+d*g*t-c*h*t)+a[7]*(+b*h*t-b*l*n+e*f*n-d*f*t+d*l*m-e*h*m)+a[11]*(+b*l*k-b*g*t-e*f*k+c*f*t+e*g*m-c*l*m)+a[15]*(-d*g*m-b*h*k+b*g*n+d*f*k-c*f*n+c*h*m)},transpose:function(){var a=this.elements;var b=a[1];a[1]=a[4];a[4]=b;b=a[2];a[2]=a[8];a[8]=b;b=a[6];a[6]=a[9];a[9]=b;b=a[3];a[3]=a[12];a[12]=b;b=a[7];a[7]=a[13];a[13]=b;b=a[11];a[11]=a[14];
a[14]=b;return this},setPosition:function(a){var b=this.elements;b[12]=a.x;b[13]=a.y;b[14]=a.z;return this},getInverse:function(a,b){var c=this.elements,d=a.elements;a=d[0];var e=d[1],f=d[2],g=d[3],h=d[4],l=d[5],m=d[6],k=d[7],n=d[8],t=d[9],q=d[10],r=d[11],p=d[12],y=d[13],w=d[14];d=d[15];var x=t*w*k-y*q*k+y*m*r-l*w*r-t*m*d+l*q*d,A=p*q*k-n*w*k-p*m*r+h*w*r+n*m*d-h*q*d,C=n*y*k-p*t*k+p*l*r-h*y*r-n*l*d+h*t*d,O=p*t*m-n*y*m-p*l*q+h*y*q+n*l*w-h*t*w,Q=a*x+e*A+f*C+g*O;if(0===Q){if(!0===b)throw Error("THREE.Matrix4: .getInverse() can't invert matrix, determinant is 0");
console.warn("THREE.Matrix4: .getInverse() can't invert matrix, determinant is 0");return this.identity()}b=1/Q;c[0]=x*b;c[1]=(y*q*g-t*w*g-y*f*r+e*w*r+t*f*d-e*q*d)*b;c[2]=(l*w*g-y*m*g+y*f*k-e*w*k-l*f*d+e*m*d)*b;c[3]=(t*m*g-l*q*g-t*f*k+e*q*k+l*f*r-e*m*r)*b;c[4]=A*b;c[5]=(n*w*g-p*q*g+p*f*r-a*w*r-n*f*d+a*q*d)*b;c[6]=(p*m*g-h*w*g-p*f*k+a*w*k+h*f*d-a*m*d)*b;c[7]=(h*q*g-n*m*g+n*f*k-a*q*k-h*f*r+a*m*r)*b;c[8]=C*b;c[9]=(p*t*g-n*y*g-p*e*r+a*y*r+n*e*d-a*t*d)*b;c[10]=(h*y*g-p*l*g+p*e*k-a*y*k-h*e*d+a*l*d)*b;c[11]=
(n*l*g-h*t*g-n*e*k+a*t*k+h*e*r-a*l*r)*b;c[12]=O*b;c[13]=(n*y*f-p*t*f+p*e*q-a*y*q-n*e*w+a*t*w)*b;c[14]=(p*l*f-h*y*f-p*e*m+a*y*m+h*e*w-a*l*w)*b;c[15]=(h*t*f-n*l*f+n*e*m-a*t*m-h*e*q+a*l*q)*b;return this},scale:function(a){var b=this.elements,c=a.x,d=a.y;a=a.z;b[0]*=c;b[4]*=d;b[8]*=a;b[1]*=c;b[5]*=d;b[9]*=a;b[2]*=c;b[6]*=d;b[10]*=a;b[3]*=c;b[7]*=d;b[11]*=a;return this},getMaxScaleOnAxis:function(){var a=this.elements;return Math.sqrt(Math.max(a[0]*a[0]+a[1]*a[1]+a[2]*a[2],a[4]*a[4]+a[5]*a[5]+a[6]*a[6],
a[8]*a[8]+a[9]*a[9]+a[10]*a[10]))},makeTranslation:function(a,b,c){this.set(1,0,0,a,0,1,0,b,0,0,1,c,0,0,0,1);return this},makeRotationX:function(a){var b=Math.cos(a);a=Math.sin(a);this.set(1,0,0,0,0,b,-a,0,0,a,b,0,0,0,0,1);return this},makeRotationY:function(a){var b=Math.cos(a);a=Math.sin(a);this.set(b,0,a,0,0,1,0,0,-a,0,b,0,0,0,0,1);return this},makeRotationZ:function(a){var b=Math.cos(a);a=Math.sin(a);this.set(b,-a,0,0,a,b,0,0,0,0,1,0,0,0,0,1);return this},makeRotationAxis:function(a,b){var c=
Math.cos(b);b=Math.sin(b);var d=1-c,e=a.x,f=a.y;a=a.z;var g=d*e,h=d*f;this.set(g*e+c,g*f-b*a,g*a+b*f,0,g*f+b*a,h*f+c,h*a-b*e,0,g*a-b*f,h*a+b*e,d*a*a+c,0,0,0,0,1);return this},makeScale:function(a,b,c){this.set(a,0,0,0,0,b,0,0,0,0,c,0,0,0,0,1);return this},makeShear:function(a,b,c){this.set(1,b,c,0,a,1,c,0,a,b,1,0,0,0,0,1);return this},compose:function(a,b,c){var d=this.elements,e=b._x,f=b._y,g=b._z,h=b._w,l=e+e,m=f+f,k=g+g;b=e*l;var n=e*m;e*=k;var t=f*m;f*=k;g*=k;l*=h;m*=h;h*=k;k=c.x;var q=c.y;c=
c.z;d[0]=(1-(t+g))*k;d[1]=(n+h)*k;d[2]=(e-m)*k;d[3]=0;d[4]=(n-h)*q;d[5]=(1-(b+g))*q;d[6]=(f+l)*q;d[7]=0;d[8]=(e+m)*c;d[9]=(f-l)*c;d[10]=(1-(b+t))*c;d[11]=0;d[12]=a.x;d[13]=a.y;d[14]=a.z;d[15]=1;return this},decompose:function(){var a=new p,b=new R;return function(c,d,e){var f=this.elements,g=a.set(f[0],f[1],f[2]).length(),h=a.set(f[4],f[5],f[6]).length(),l=a.set(f[8],f[9],f[10]).length();0>this.determinant()&&(g=-g);c.x=f[12];c.y=f[13];c.z=f[14];b.copy(this);c=1/g;f=1/h;var m=1/l;b.elements[0]*=c;
b.elements[1]*=c;b.elements[2]*=c;b.elements[4]*=f;b.elements[5]*=f;b.elements[6]*=f;b.elements[8]*=m;b.elements[9]*=m;b.elements[10]*=m;d.setFromRotationMatrix(b);e.x=g;e.y=h;e.z=l;return this}}(),makePerspective:function(a,b,c,d,e,f){void 0===f&&console.warn("THREE.Matrix4: .makePerspective() has been redefined and has a new signature. Please check the docs.");var g=this.elements;g[0]=2*e/(b-a);g[4]=0;g[8]=(b+a)/(b-a);g[12]=0;g[1]=0;g[5]=2*e/(c-d);g[9]=(c+d)/(c-d);g[13]=0;g[2]=0;g[6]=0;g[10]=-(f+
e)/(f-e);g[14]=-2*f*e/(f-e);g[3]=0;g[7]=0;g[11]=-1;g[15]=0;return this},makeOrthographic:function(a,b,c,d,e,f){var g=this.elements,h=1/(b-a),l=1/(c-d),m=1/(f-e);g[0]=2*h;g[4]=0;g[8]=0;g[12]=-((b+a)*h);g[1]=0;g[5]=2*l;g[9]=0;g[13]=-((c+d)*l);g[2]=0;g[6]=0;g[10]=-2*m;g[14]=-((f+e)*m);g[3]=0;g[7]=0;g[11]=0;g[15]=1;return this},equals:function(a){var b=this.elements;a=a.elements;for(var c=0;16>c;c++)if(b[c]!==a[c])return!1;return!0},fromArray:function(a,b){void 0===b&&(b=0);for(var c=0;16>c;c++)this.elements[c]=
a[c+b];return this},toArray:function(a,b){void 0===a&&(a=[]);void 0===b&&(b=0);var c=this.elements;a[b]=c[0];a[b+1]=c[1];a[b+2]=c[2];a[b+3]=c[3];a[b+4]=c[4];a[b+5]=c[5];a[b+6]=c[6];a[b+7]=c[7];a[b+8]=c[8];a[b+9]=c[9];a[b+10]=c[10];a[b+11]=c[11];a[b+12]=c[12];a[b+13]=c[13];a[b+14]=c[14];a[b+15]=c[15];return a}});Object.assign(ca,{slerp:function(a,b,c,d){return c.copy(a).slerp(b,d)},slerpFlat:function(a,b,c,d,e,f,g){var h=c[d+0],l=c[d+1],m=c[d+2];c=c[d+3];d=e[f+0];var k=e[f+1],n=e[f+2];e=e[f+3];if(c!==
e||h!==d||l!==k||m!==n){f=1-g;var t=h*d+l*k+m*n+c*e,q=0<=t?1:-1,p=1-t*t;p>Number.EPSILON&&(p=Math.sqrt(p),t=Math.atan2(p,t*q),f=Math.sin(f*t)/p,g=Math.sin(g*t)/p);q*=g;h=h*f+d*q;l=l*f+k*q;m=m*f+n*q;c=c*f+e*q;f===1-g&&(g=1/Math.sqrt(h*h+l*l+m*m+c*c),h*=g,l*=g,m*=g,c*=g)}a[b]=h;a[b+1]=l;a[b+2]=m;a[b+3]=c}});Object.defineProperties(ca.prototype,{x:{get:function(){return this._x},set:function(a){this._x=a;this.onChangeCallback()}},y:{get:function(){return this._y},set:function(a){this._y=a;this.onChangeCallback()}},
z:{get:function(){return this._z},set:function(a){this._z=a;this.onChangeCallback()}},w:{get:function(){return this._w},set:function(a){this._w=a;this.onChangeCallback()}}});Object.assign(ca.prototype,{set:function(a,b,c,d){this._x=a;this._y=b;this._z=c;this._w=d;this.onChangeCallback();return this},clone:function(){return new this.constructor(this._x,this._y,this._z,this._w)},copy:function(a){this._x=a.x;this._y=a.y;this._z=a.z;this._w=a.w;this.onChangeCallback();return this},setFromEuler:function(a,
b){if(!a||!a.isEuler)throw Error("THREE.Quaternion: .setFromEuler() now expects an Euler rotation rather than a Vector3 and order.");var c=a._x,d=a._y,e=a._z;a=a.order;var f=Math.cos,g=Math.sin,h=f(c/2),l=f(d/2);f=f(e/2);c=g(c/2);d=g(d/2);e=g(e/2);"XYZ"===a?(this._x=c*l*f+h*d*e,this._y=h*d*f-c*l*e,this._z=h*l*e+c*d*f,this._w=h*l*f-c*d*e):"YXZ"===a?(this._x=c*l*f+h*d*e,this._y=h*d*f-c*l*e,this._z=h*l*e-c*d*f,this._w=h*l*f+c*d*e):"ZXY"===a?(this._x=c*l*f-h*d*e,this._y=h*d*f+c*l*e,this._z=h*l*e+c*d*
f,this._w=h*l*f-c*d*e):"ZYX"===a?(this._x=c*l*f-h*d*e,this._y=h*d*f+c*l*e,this._z=h*l*e-c*d*f,this._w=h*l*f+c*d*e):"YZX"===a?(this._x=c*l*f+h*d*e,this._y=h*d*f+c*l*e,this._z=h*l*e-c*d*f,this._w=h*l*f-c*d*e):"XZY"===a&&(this._x=c*l*f-h*d*e,this._y=h*d*f-c*l*e,this._z=h*l*e+c*d*f,this._w=h*l*f+c*d*e);if(!1!==b)this.onChangeCallback();return this},setFromAxisAngle:function(a,b){b/=2;var c=Math.sin(b);this._x=a.x*c;this._y=a.y*c;this._z=a.z*c;this._w=Math.cos(b);this.onChangeCallback();return this},setFromRotationMatrix:function(a){var b=
a.elements,c=b[0];a=b[4];var d=b[8],e=b[1],f=b[5],g=b[9],h=b[2],l=b[6];b=b[10];var m=c+f+b;0<m?(c=.5/Math.sqrt(m+1),this._w=.25/c,this._x=(l-g)*c,this._y=(d-h)*c,this._z=(e-a)*c):c>f&&c>b?(c=2*Math.sqrt(1+c-f-b),this._w=(l-g)/c,this._x=.25*c,this._y=(a+e)/c,this._z=(d+h)/c):f>b?(c=2*Math.sqrt(1+f-c-b),this._w=(d-h)/c,this._x=(a+e)/c,this._y=.25*c,this._z=(g+l)/c):(c=2*Math.sqrt(1+b-c-f),this._w=(e-a)/c,this._x=(d+h)/c,this._y=(g+l)/c,this._z=.25*c);this.onChangeCallback();return this},setFromUnitVectors:function(){var a=
new p,b;return function(c,d){void 0===a&&(a=new p);b=c.dot(d)+1;1E-6>b?(b=0,Math.abs(c.x)>Math.abs(c.z)?a.set(-c.y,c.x,0):a.set(0,-c.z,c.y)):a.crossVectors(c,d);this._x=a.x;this._y=a.y;this._z=a.z;this._w=b;return this.normalize()}}(),inverse:function(){return this.conjugate()},conjugate:function(){this._x*=-1;this._y*=-1;this._z*=-1;this.onChangeCallback();return this},dot:function(a){return this._x*a._x+this._y*a._y+this._z*a._z+this._w*a._w},lengthSq:function(){return this._x*this._x+this._y*this._y+
this._z*this._z+this._w*this._w},length:function(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)},normalize:function(){var a=this.length();0===a?(this._z=this._y=this._x=0,this._w=1):(a=1/a,this._x*=a,this._y*=a,this._z*=a,this._w*=a);this.onChangeCallback();return this},multiply:function(a,b){return void 0!==b?(console.warn("THREE.Quaternion: .multiply() now only accepts one argument. Use .multiplyQuaternions( a, b ) instead."),this.multiplyQuaternions(a,b)):this.multiplyQuaternions(this,
a)},premultiply:function(a){return this.multiplyQuaternions(a,this)},multiplyQuaternions:function(a,b){var c=a._x,d=a._y,e=a._z;a=a._w;var f=b._x,g=b._y,h=b._z;b=b._w;this._x=c*b+a*f+d*h-e*g;this._y=d*b+a*g+e*f-c*h;this._z=e*b+a*h+c*g-d*f;this._w=a*b-c*f-d*g-e*h;this.onChangeCallback();return this},slerp:function(a,b){if(0===b)return this;if(1===b)return this.copy(a);var c=this._x,d=this._y,e=this._z,f=this._w,g=f*a._w+c*a._x+d*a._y+e*a._z;0>g?(this._w=-a._w,this._x=-a._x,this._y=-a._y,this._z=-a._z,
g=-g):this.copy(a);if(1<=g)return this._w=f,this._x=c,this._y=d,this._z=e,this;a=1-g*g;if(a<=Number.EPSILON)return g=1-b,this._w=g*f+b*this._w,this._x=g*c+b*this._x,this._y=g*d+b*this._y,this._z=g*e+b*this._z,this.normalize();a=Math.sqrt(a);var h=Math.atan2(a,g);g=Math.sin((1-b)*h)/a;b=Math.sin(b*h)/a;this._w=f*g+this._w*b;this._x=c*g+this._x*b;this._y=d*g+this._y*b;this._z=e*g+this._z*b;this.onChangeCallback();return this},equals:function(a){return a._x===this._x&&a._y===this._y&&a._z===this._z&&
a._w===this._w},fromArray:function(a,b){void 0===b&&(b=0);this._x=a[b];this._y=a[b+1];this._z=a[b+2];this._w=a[b+3];this.onChangeCallback();return this},toArray:function(a,b){void 0===a&&(a=[]);void 0===b&&(b=0);a[b]=this._x;a[b+1]=this._y;a[b+2]=this._z;a[b+3]=this._w;return a},onChange:function(a){this.onChangeCallback=a;return this},onChangeCallback:function(){}});Object.assign(p.prototype,{isVector3:!0,set:function(a,b,c){this.x=a;this.y=b;this.z=c;return this},setScalar:function(a){this.z=this.y=
this.x=a;return this},setX:function(a){this.x=a;return this},setY:function(a){this.y=a;return this},setZ:function(a){this.z=a;return this},setComponent:function(a,b){switch(a){case 0:this.x=b;break;case 1:this.y=b;break;case 2:this.z=b;break;default:throw Error("index is out of range: "+a);}return this},getComponent:function(a){switch(a){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("index is out of range: "+a);}},clone:function(){return new this.constructor(this.x,
this.y,this.z)},copy:function(a){this.x=a.x;this.y=a.y;this.z=a.z;return this},add:function(a,b){if(void 0!==b)return console.warn("THREE.Vector3: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(a,b);this.x+=a.x;this.y+=a.y;this.z+=a.z;return this},addScalar:function(a){this.x+=a;this.y+=a;this.z+=a;return this},addVectors:function(a,b){this.x=a.x+b.x;this.y=a.y+b.y;this.z=a.z+b.z;return this},addScaledVector:function(a,b){this.x+=a.x*b;this.y+=a.y*b;this.z+=
a.z*b;return this},sub:function(a,b){if(void 0!==b)return console.warn("THREE.Vector3: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(a,b);this.x-=a.x;this.y-=a.y;this.z-=a.z;return this},subScalar:function(a){this.x-=a;this.y-=a;this.z-=a;return this},subVectors:function(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;return this},multiply:function(a,b){if(void 0!==b)return console.warn("THREE.Vector3: .multiply() now only accepts one argument. Use .multiplyVectors( a, b ) instead."),
this.multiplyVectors(a,b);this.x*=a.x;this.y*=a.y;this.z*=a.z;return this},multiplyScalar:function(a){this.x*=a;this.y*=a;this.z*=a;return this},multiplyVectors:function(a,b){this.x=a.x*b.x;this.y=a.y*b.y;this.z=a.z*b.z;return this},applyEuler:function(){var a=new ca;return function(b){b&&b.isEuler||console.error("THREE.Vector3: .applyEuler() now expects an Euler rotation rather than a Vector3 and order.");return this.applyQuaternion(a.setFromEuler(b))}}(),applyAxisAngle:function(){var a=new ca;return function(b,
c){return this.applyQuaternion(a.setFromAxisAngle(b,c))}}(),applyMatrix3:function(a){var b=this.x,c=this.y,d=this.z;a=a.elements;this.x=a[0]*b+a[3]*c+a[6]*d;this.y=a[1]*b+a[4]*c+a[7]*d;this.z=a[2]*b+a[5]*c+a[8]*d;return this},applyMatrix4:function(a){var b=this.x,c=this.y,d=this.z;a=a.elements;var e=1/(a[3]*b+a[7]*c+a[11]*d+a[15]);this.x=(a[0]*b+a[4]*c+a[8]*d+a[12])*e;this.y=(a[1]*b+a[5]*c+a[9]*d+a[13])*e;this.z=(a[2]*b+a[6]*c+a[10]*d+a[14])*e;return this},applyQuaternion:function(a){var b=this.x,
c=this.y,d=this.z,e=a.x,f=a.y,g=a.z;a=a.w;var h=a*b+f*d-g*c,l=a*c+g*b-e*d,m=a*d+e*c-f*b;b=-e*b-f*c-g*d;this.x=h*a+b*-e+l*-g-m*-f;this.y=l*a+b*-f+m*-e-h*-g;this.z=m*a+b*-g+h*-f-l*-e;return this},project:function(){var a=new R;return function(b){a.multiplyMatrices(b.projectionMatrix,a.getInverse(b.matrixWorld));return this.applyMatrix4(a)}}(),unproject:function(){var a=new R;return function(b){a.multiplyMatrices(b.matrixWorld,a.getInverse(b.projectionMatrix));return this.applyMatrix4(a)}}(),transformDirection:function(a){var b=
this.x,c=this.y,d=this.z;a=a.elements;this.x=a[0]*b+a[4]*c+a[8]*d;this.y=a[1]*b+a[5]*c+a[9]*d;this.z=a[2]*b+a[6]*c+a[10]*d;return this.normalize()},divide:function(a){this.x/=a.x;this.y/=a.y;this.z/=a.z;return this},divideScalar:function(a){return this.multiplyScalar(1/a)},min:function(a){this.x=Math.min(this.x,a.x);this.y=Math.min(this.y,a.y);this.z=Math.min(this.z,a.z);return this},max:function(a){this.x=Math.max(this.x,a.x);this.y=Math.max(this.y,a.y);this.z=Math.max(this.z,a.z);return this},clamp:function(a,
b){this.x=Math.max(a.x,Math.min(b.x,this.x));this.y=Math.max(a.y,Math.min(b.y,this.y));this.z=Math.max(a.z,Math.min(b.z,this.z));return this},clampScalar:function(){var a=new p,b=new p;return function(c,d){a.set(c,c,c);b.set(d,d,d);return this.clamp(a,b)}}(),clampLength:function(a,b){var c=this.length();return this.divideScalar(c||1).multiplyScalar(Math.max(a,Math.min(b,c)))},floor:function(){this.x=Math.floor(this.x);this.y=Math.floor(this.y);this.z=Math.floor(this.z);return this},ceil:function(){this.x=
Math.ceil(this.x);this.y=Math.ceil(this.y);this.z=Math.ceil(this.z);return this},round:function(){this.x=Math.round(this.x);this.y=Math.round(this.y);this.z=Math.round(this.z);return this},roundToZero:function(){this.x=0>this.x?Math.ceil(this.x):Math.floor(this.x);this.y=0>this.y?Math.ceil(this.y):Math.floor(this.y);this.z=0>this.z?Math.ceil(this.z):Math.floor(this.z);return this},negate:function(){this.x=-this.x;this.y=-this.y;this.z=-this.z;return this},dot:function(a){return this.x*a.x+this.y*
a.y+this.z*a.z},lengthSq:function(){return this.x*this.x+this.y*this.y+this.z*this.z},length:function(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)},manhattanLength:function(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)},normalize:function(){return this.divideScalar(this.length()||1)},setLength:function(a){return this.normalize().multiplyScalar(a)},lerp:function(a,b){this.x+=(a.x-this.x)*b;this.y+=(a.y-this.y)*b;this.z+=(a.z-this.z)*b;return this},lerpVectors:function(a,
b,c){return this.subVectors(b,a).multiplyScalar(c).add(a)},cross:function(a,b){return void 0!==b?(console.warn("THREE.Vector3: .cross() now only accepts one argument. Use .crossVectors( a, b ) instead."),this.crossVectors(a,b)):this.crossVectors(this,a)},crossVectors:function(a,b){var c=a.x,d=a.y;a=a.z;var e=b.x,f=b.y;b=b.z;this.x=d*b-a*f;this.y=a*e-c*b;this.z=c*f-d*e;return this},projectOnVector:function(a){var b=a.dot(this)/a.lengthSq();return this.copy(a).multiplyScalar(b)},projectOnPlane:function(){var a=
new p;return function(b){a.copy(this).projectOnVector(b);return this.sub(a)}}(),reflect:function(){var a=new p;return function(b){return this.sub(a.copy(b).multiplyScalar(2*this.dot(b)))}}(),angleTo:function(a){a=this.dot(a)/Math.sqrt(this.lengthSq()*a.lengthSq());return Math.acos(J.clamp(a,-1,1))},distanceTo:function(a){return Math.sqrt(this.distanceToSquared(a))},distanceToSquared:function(a){var b=this.x-a.x,c=this.y-a.y;a=this.z-a.z;return b*b+c*c+a*a},manhattanDistanceTo:function(a){return Math.abs(this.x-
a.x)+Math.abs(this.y-a.y)+Math.abs(this.z-a.z)},setFromSpherical:function(a){var b=Math.sin(a.phi)*a.radius;this.x=b*Math.sin(a.theta);this.y=Math.cos(a.phi)*a.radius;this.z=b*Math.cos(a.theta);return this},setFromCylindrical:function(a){this.x=a.radius*Math.sin(a.theta);this.y=a.y;this.z=a.radius*Math.cos(a.theta);return this},setFromMatrixPosition:function(a){a=a.elements;this.x=a[12];this.y=a[13];this.z=a[14];return this},setFromMatrixScale:function(a){var b=this.setFromMatrixColumn(a,0).length(),
c=this.setFromMatrixColumn(a,1).length();a=this.setFromMatrixColumn(a,2).length();this.x=b;this.y=c;this.z=a;return this},setFromMatrixColumn:function(a,b){return this.fromArray(a.elements,4*b)},equals:function(a){return a.x===this.x&&a.y===this.y&&a.z===this.z},fromArray:function(a,b){void 0===b&&(b=0);this.x=a[b];this.y=a[b+1];this.z=a[b+2];return this},toArray:function(a,b){void 0===a&&(a=[]);void 0===b&&(b=0);a[b]=this.x;a[b+1]=this.y;a[b+2]=this.z;return a},fromBufferAttribute:function(a,b,c){void 0!==
c&&console.warn("THREE.Vector3: offset has been removed from .fromBufferAttribute().");this.x=a.getX(b);this.y=a.getY(b);this.z=a.getZ(b);return this}});Object.assign(la.prototype,{isMatrix3:!0,set:function(a,b,c,d,e,f,g,h,l){var m=this.elements;m[0]=a;m[1]=d;m[2]=g;m[3]=b;m[4]=e;m[5]=h;m[6]=c;m[7]=f;m[8]=l;return this},identity:function(){this.set(1,0,0,0,1,0,0,0,1);return this},clone:function(){return(new this.constructor).fromArray(this.elements)},copy:function(a){var b=this.elements;a=a.elements;
b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];return this},setFromMatrix4:function(a){a=a.elements;this.set(a[0],a[4],a[8],a[1],a[5],a[9],a[2],a[6],a[10]);return this},applyToBufferAttribute:function(){var a=new p;return function(b){for(var c=0,d=b.count;c<d;c++)a.x=b.getX(c),a.y=b.getY(c),a.z=b.getZ(c),a.applyMatrix3(this),b.setXYZ(c,a.x,a.y,a.z);return b}}(),multiply:function(a){return this.multiplyMatrices(this,a)},premultiply:function(a){return this.multiplyMatrices(a,
this)},multiplyMatrices:function(a,b){var c=a.elements,d=b.elements;b=this.elements;a=c[0];var e=c[3],f=c[6],g=c[1],h=c[4],l=c[7],m=c[2],k=c[5];c=c[8];var n=d[0],t=d[3],q=d[6],p=d[1],u=d[4],y=d[7],w=d[2],x=d[5];d=d[8];b[0]=a*n+e*p+f*w;b[3]=a*t+e*u+f*x;b[6]=a*q+e*y+f*d;b[1]=g*n+h*p+l*w;b[4]=g*t+h*u+l*x;b[7]=g*q+h*y+l*d;b[2]=m*n+k*p+c*w;b[5]=m*t+k*u+c*x;b[8]=m*q+k*y+c*d;return this},multiplyScalar:function(a){var b=this.elements;b[0]*=a;b[3]*=a;b[6]*=a;b[1]*=a;b[4]*=a;b[7]*=a;b[2]*=a;b[5]*=a;b[8]*=
a;return this},determinant:function(){var a=this.elements,b=a[0],c=a[1],d=a[2],e=a[3],f=a[4],g=a[5],h=a[6],l=a[7];a=a[8];return b*f*a-b*g*l-c*e*a+c*g*h+d*e*l-d*f*h},getInverse:function(a,b){a&&a.isMatrix4&&console.error("THREE.Matrix3: .getInverse() no longer takes a Matrix4 argument.");var c=a.elements;a=this.elements;var d=c[0],e=c[1],f=c[2],g=c[3],h=c[4],l=c[5],m=c[6],k=c[7];c=c[8];var n=c*h-l*k,p=l*m-c*g,q=k*g-h*m,r=d*n+e*p+f*q;if(0===r){if(!0===b)throw Error("THREE.Matrix3: .getInverse() can't invert matrix, determinant is 0");
console.warn("THREE.Matrix3: .getInverse() can't invert matrix, determinant is 0");return this.identity()}b=1/r;a[0]=n*b;a[1]=(f*k-c*e)*b;a[2]=(l*e-f*h)*b;a[3]=p*b;a[4]=(c*d-f*m)*b;a[5]=(f*g-l*d)*b;a[6]=q*b;a[7]=(e*m-k*d)*b;a[8]=(h*d-e*g)*b;return this},transpose:function(){var a=this.elements;var b=a[1];a[1]=a[3];a[3]=b;b=a[2];a[2]=a[6];a[6]=b;b=a[5];a[5]=a[7];a[7]=b;return this},getNormalMatrix:function(a){return this.setFromMatrix4(a).getInverse(this).transpose()},transposeIntoArray:function(a){var b=
this.elements;a[0]=b[0];a[1]=b[3];a[2]=b[6];a[3]=b[1];a[4]=b[4];a[5]=b[7];a[6]=b[2];a[7]=b[5];a[8]=b[8];return this},setUvTransform:function(a,b,c,d,e,f,g){var h=Math.cos(e);e=Math.sin(e);this.set(c*h,c*e,-c*(h*f+e*g)+f+a,-d*e,d*h,-d*(-e*f+h*g)+g+b,0,0,1)},scale:function(a,b){var c=this.elements;c[0]*=a;c[3]*=a;c[6]*=a;c[1]*=b;c[4]*=b;c[7]*=b;return this},rotate:function(a){var b=Math.cos(a);a=Math.sin(a);var c=this.elements,d=c[0],e=c[3],f=c[6],g=c[1],h=c[4],l=c[7];c[0]=b*d+a*g;c[3]=b*e+a*h;c[6]=
b*f+a*l;c[1]=-a*d+b*g;c[4]=-a*e+b*h;c[7]=-a*f+b*l;return this},translate:function(a,b){var c=this.elements;c[0]+=a*c[2];c[3]+=a*c[5];c[6]+=a*c[8];c[1]+=b*c[2];c[4]+=b*c[5];c[7]+=b*c[8];return this},equals:function(a){var b=this.elements;a=a.elements;for(var c=0;9>c;c++)if(b[c]!==a[c])return!1;return!0},fromArray:function(a,b){void 0===b&&(b=0);for(var c=0;9>c;c++)this.elements[c]=a[c+b];return this},toArray:function(a,b){void 0===a&&(a=[]);void 0===b&&(b=0);var c=this.elements;a[b]=c[0];a[b+1]=c[1];
a[b+2]=c[2];a[b+3]=c[3];a[b+4]=c[4];a[b+5]=c[5];a[b+6]=c[6];a[b+7]=c[7];a[b+8]=c[8];return a}});var Ff=0;ea.DEFAULT_IMAGE=void 0;ea.DEFAULT_MAPPING=300;ea.prototype=Object.assign(Object.create(za.prototype),{constructor:ea,isTexture:!0,updateMatrix:function(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.name=a.name;this.image=a.image;this.mipmaps=
a.mipmaps.slice(0);this.mapping=a.mapping;this.wrapS=a.wrapS;this.wrapT=a.wrapT;this.magFilter=a.magFilter;this.minFilter=a.minFilter;this.anisotropy=a.anisotropy;this.format=a.format;this.type=a.type;this.offset.copy(a.offset);this.repeat.copy(a.repeat);this.center.copy(a.center);this.rotation=a.rotation;this.matrixAutoUpdate=a.matrixAutoUpdate;this.matrix.copy(a.matrix);this.generateMipmaps=a.generateMipmaps;this.premultiplyAlpha=a.premultiplyAlpha;this.flipY=a.flipY;this.unpackAlignment=a.unpackAlignment;
this.encoding=a.encoding;return this},toJSON:function(a){function b(a){if(a instanceof HTMLCanvasElement)var b=a;else{b=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");b.width=a.width;b.height=a.height;var c=b.getContext("2d");a instanceof ImageData?c.putImageData(a,0,0):c.drawImage(a,0,0,a.width,a.height)}return 2048<b.width||2048<b.height?b.toDataURL("image/jpeg",.6):b.toDataURL("image/png")}var c=void 0===a||"string"===typeof a;if(!c&&void 0!==a.textures[this.uuid])return a.textures[this.uuid];
var d={metadata:{version:4.5,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,mapping:this.mapping,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY};if(void 0!==this.image){var e=this.image;void 0===e.uuid&&(e.uuid=J.generateUUID());if(!c&&void 0===a.images[e.uuid]){if(Array.isArray(e)){var f=
[];for(var g=0,h=e.length;g<h;g++)f.push(b(e[g]))}else f=b(e);a.images[e.uuid]={uuid:e.uuid,url:f}}d.image=e.uuid}c||(a.textures[this.uuid]=d);return d},dispose:function(){this.dispatchEvent({type:"dispose"})},transformUv:function(a){if(300===this.mapping){a.applyMatrix3(this.matrix);if(0>a.x||1<a.x)switch(this.wrapS){case 1E3:a.x-=Math.floor(a.x);break;case 1001:a.x=0>a.x?0:1;break;case 1002:a.x=1===Math.abs(Math.floor(a.x)%2)?Math.ceil(a.x)-a.x:a.x-Math.floor(a.x)}if(0>a.y||1<a.y)switch(this.wrapT){case 1E3:a.y-=
Math.floor(a.y);break;case 1001:a.y=0>a.y?0:1;break;case 1002:a.y=1===Math.abs(Math.floor(a.y)%2)?Math.ceil(a.y)-a.y:a.y-Math.floor(a.y)}this.flipY&&(a.y=1-a.y)}}});Object.defineProperty(ea.prototype,"needsUpdate",{set:function(a){!0===a&&this.version++}});Object.assign(W.prototype,{isVector4:!0,set:function(a,b,c,d){this.x=a;this.y=b;this.z=c;this.w=d;return this},setScalar:function(a){this.w=this.z=this.y=this.x=a;return this},setX:function(a){this.x=a;return this},setY:function(a){this.y=a;return this},
setZ:function(a){this.z=a;return this},setW:function(a){this.w=a;return this},setComponent:function(a,b){switch(a){case 0:this.x=b;break;case 1:this.y=b;break;case 2:this.z=b;break;case 3:this.w=b;break;default:throw Error("index is out of range: "+a);}return this},getComponent:function(a){switch(a){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("index is out of range: "+a);}},clone:function(){return new this.constructor(this.x,this.y,this.z,
this.w)},copy:function(a){this.x=a.x;this.y=a.y;this.z=a.z;this.w=void 0!==a.w?a.w:1;return this},add:function(a,b){if(void 0!==b)return console.warn("THREE.Vector4: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(a,b);this.x+=a.x;this.y+=a.y;this.z+=a.z;this.w+=a.w;return this},addScalar:function(a){this.x+=a;this.y+=a;this.z+=a;this.w+=a;return this},addVectors:function(a,b){this.x=a.x+b.x;this.y=a.y+b.y;this.z=a.z+b.z;this.w=a.w+b.w;return this},addScaledVector:function(a,
b){this.x+=a.x*b;this.y+=a.y*b;this.z+=a.z*b;this.w+=a.w*b;return this},sub:function(a,b){if(void 0!==b)return console.warn("THREE.Vector4: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(a,b);this.x-=a.x;this.y-=a.y;this.z-=a.z;this.w-=a.w;return this},subScalar:function(a){this.x-=a;this.y-=a;this.z-=a;this.w-=a;return this},subVectors:function(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;this.w=a.w-b.w;return this},multiplyScalar:function(a){this.x*=
a;this.y*=a;this.z*=a;this.w*=a;return this},applyMatrix4:function(a){var b=this.x,c=this.y,d=this.z,e=this.w;a=a.elements;this.x=a[0]*b+a[4]*c+a[8]*d+a[12]*e;this.y=a[1]*b+a[5]*c+a[9]*d+a[13]*e;this.z=a[2]*b+a[6]*c+a[10]*d+a[14]*e;this.w=a[3]*b+a[7]*c+a[11]*d+a[15]*e;return this},divideScalar:function(a){return this.multiplyScalar(1/a)},setAxisAngleFromQuaternion:function(a){this.w=2*Math.acos(a.w);var b=Math.sqrt(1-a.w*a.w);1E-4>b?(this.x=1,this.z=this.y=0):(this.x=a.x/b,this.y=a.y/b,this.z=a.z/
b);return this},setAxisAngleFromRotationMatrix:function(a){a=a.elements;var b=a[0];var c=a[4];var d=a[8],e=a[1],f=a[5],g=a[9];var h=a[2];var l=a[6];var m=a[10];if(.01>Math.abs(c-e)&&.01>Math.abs(d-h)&&.01>Math.abs(g-l)){if(.1>Math.abs(c+e)&&.1>Math.abs(d+h)&&.1>Math.abs(g+l)&&.1>Math.abs(b+f+m-3))return this.set(1,0,0,0),this;a=Math.PI;b=(b+1)/2;f=(f+1)/2;m=(m+1)/2;c=(c+e)/4;d=(d+h)/4;g=(g+l)/4;b>f&&b>m?.01>b?(l=0,c=h=.707106781):(l=Math.sqrt(b),h=c/l,c=d/l):f>m?.01>f?(l=.707106781,h=0,c=.707106781):
(h=Math.sqrt(f),l=c/h,c=g/h):.01>m?(h=l=.707106781,c=0):(c=Math.sqrt(m),l=d/c,h=g/c);this.set(l,h,c,a);return this}a=Math.sqrt((l-g)*(l-g)+(d-h)*(d-h)+(e-c)*(e-c));.001>Math.abs(a)&&(a=1);this.x=(l-g)/a;this.y=(d-h)/a;this.z=(e-c)/a;this.w=Math.acos((b+f+m-1)/2);return this},min:function(a){this.x=Math.min(this.x,a.x);this.y=Math.min(this.y,a.y);this.z=Math.min(this.z,a.z);this.w=Math.min(this.w,a.w);return this},max:function(a){this.x=Math.max(this.x,a.x);this.y=Math.max(this.y,a.y);this.z=Math.max(this.z,
a.z);this.w=Math.max(this.w,a.w);return this},clamp:function(a,b){this.x=Math.max(a.x,Math.min(b.x,this.x));this.y=Math.max(a.y,Math.min(b.y,this.y));this.z=Math.max(a.z,Math.min(b.z,this.z));this.w=Math.max(a.w,Math.min(b.w,this.w));return this},clampScalar:function(){var a,b;return function(c,d){void 0===a&&(a=new W,b=new W);a.set(c,c,c,c);b.set(d,d,d,d);return this.clamp(a,b)}}(),clampLength:function(a,b){var c=this.length();return this.divideScalar(c||1).multiplyScalar(Math.max(a,Math.min(b,c)))},
floor:function(){this.x=Math.floor(this.x);this.y=Math.floor(this.y);this.z=Math.floor(this.z);this.w=Math.floor(this.w);return this},ceil:function(){this.x=Math.ceil(this.x);this.y=Math.ceil(this.y);this.z=Math.ceil(this.z);this.w=Math.ceil(this.w);return this},round:function(){this.x=Math.round(this.x);this.y=Math.round(this.y);this.z=Math.round(this.z);this.w=Math.round(this.w);return this},roundToZero:function(){this.x=0>this.x?Math.ceil(this.x):Math.floor(this.x);this.y=0>this.y?Math.ceil(this.y):
Math.floor(this.y);this.z=0>this.z?Math.ceil(this.z):Math.floor(this.z);this.w=0>this.w?Math.ceil(this.w):Math.floor(this.w);return this},negate:function(){this.x=-this.x;this.y=-this.y;this.z=-this.z;this.w=-this.w;return this},dot:function(a){return this.x*a.x+this.y*a.y+this.z*a.z+this.w*a.w},lengthSq:function(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w},length:function(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)},manhattanLength:function(){return Math.abs(this.x)+
Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)},normalize:function(){return this.divideScalar(this.length()||1)},setLength:function(a){return this.normalize().multiplyScalar(a)},lerp:function(a,b){this.x+=(a.x-this.x)*b;this.y+=(a.y-this.y)*b;this.z+=(a.z-this.z)*b;this.w+=(a.w-this.w)*b;return this},lerpVectors:function(a,b,c){return this.subVectors(b,a).multiplyScalar(c).add(a)},equals:function(a){return a.x===this.x&&a.y===this.y&&a.z===this.z&&a.w===this.w},fromArray:function(a,b){void 0===
b&&(b=0);this.x=a[b];this.y=a[b+1];this.z=a[b+2];this.w=a[b+3];return this},toArray:function(a,b){void 0===a&&(a=[]);void 0===b&&(b=0);a[b]=this.x;a[b+1]=this.y;a[b+2]=this.z;a[b+3]=this.w;return a},fromBufferAttribute:function(a,b,c){void 0!==c&&console.warn("THREE.Vector4: offset has been removed from .fromBufferAttribute().");this.x=a.getX(b);this.y=a.getY(b);this.z=a.getZ(b);this.w=a.getW(b);return this}});kb.prototype=Object.assign(Object.create(za.prototype),{constructor:kb,isWebGLRenderTarget:!0,
setSize:function(a,b){if(this.width!==a||this.height!==b)this.width=a,this.height=b,this.dispose();this.viewport.set(0,0,a,b);this.scissor.set(0,0,a,b)},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.width=a.width;this.height=a.height;this.viewport.copy(a.viewport);this.texture=a.texture.clone();this.depthBuffer=a.depthBuffer;this.stencilBuffer=a.stencilBuffer;this.depthTexture=a.depthTexture;return this},dispose:function(){this.dispatchEvent({type:"dispose"})}});
Lb.prototype=Object.create(kb.prototype);Lb.prototype.constructor=Lb;Lb.prototype.isWebGLRenderTargetCube=!0;lb.prototype=Object.create(ea.prototype);lb.prototype.constructor=lb;lb.prototype.isDataTexture=!0;Object.assign(Xa.prototype,{isBox3:!0,set:function(a,b){this.min.copy(a);this.max.copy(b);return this},setFromArray:function(a){for(var b=Infinity,c=Infinity,d=Infinity,e=-Infinity,f=-Infinity,g=-Infinity,h=0,l=a.length;h<l;h+=3){var m=a[h],k=a[h+1],n=a[h+2];m<b&&(b=m);k<c&&(c=k);n<d&&(d=n);m>
e&&(e=m);k>f&&(f=k);n>g&&(g=n)}this.min.set(b,c,d);this.max.set(e,f,g);return this},setFromBufferAttribute:function(a){for(var b=Infinity,c=Infinity,d=Infinity,e=-Infinity,f=-Infinity,g=-Infinity,h=0,l=a.count;h<l;h++){var m=a.getX(h),k=a.getY(h),n=a.getZ(h);m<b&&(b=m);k<c&&(c=k);n<d&&(d=n);m>e&&(e=m);k>f&&(f=k);n>g&&(g=n)}this.min.set(b,c,d);this.max.set(e,f,g);return this},setFromPoints:function(a){this.makeEmpty();for(var b=0,c=a.length;b<c;b++)this.expandByPoint(a[b]);return this},setFromCenterAndSize:function(){var a=
new p;return function(b,c){c=a.copy(c).multiplyScalar(.5);this.min.copy(b).sub(c);this.max.copy(b).add(c);return this}}(),setFromObject:function(a){this.makeEmpty();return this.expandByObject(a)},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.min.copy(a.min);this.max.copy(a.max);return this},makeEmpty:function(){this.min.x=this.min.y=this.min.z=Infinity;this.max.x=this.max.y=this.max.z=-Infinity;return this},isEmpty:function(){return this.max.x<this.min.x||this.max.y<
this.min.y||this.max.z<this.min.z},getCenter:function(a){void 0===a&&(console.warn("THREE.Box3: .getCenter() target is now required"),a=new p);return this.isEmpty()?a.set(0,0,0):a.addVectors(this.min,this.max).multiplyScalar(.5)},getSize:function(a){void 0===a&&(console.warn("THREE.Box3: .getSize() target is now required"),a=new p);return this.isEmpty()?a.set(0,0,0):a.subVectors(this.max,this.min)},expandByPoint:function(a){this.min.min(a);this.max.max(a);return this},expandByVector:function(a){this.min.sub(a);
this.max.add(a);return this},expandByScalar:function(a){this.min.addScalar(-a);this.max.addScalar(a);return this},expandByObject:function(){function a(a){var f=a.geometry;if(void 0!==f)if(f.isGeometry)for(f=f.vertices,c=0,d=f.length;c<d;c++)e.copy(f[c]),e.applyMatrix4(a.matrixWorld),b.expandByPoint(e);else if(f.isBufferGeometry&&(f=f.attributes.position,void 0!==f))for(c=0,d=f.count;c<d;c++)e.fromBufferAttribute(f,c).applyMatrix4(a.matrixWorld),b.expandByPoint(e)}var b,c,d,e=new p;return function(c){b=
this;c.updateMatrixWorld(!0);c.traverse(a);return this}}(),containsPoint:function(a){return a.x<this.min.x||a.x>this.max.x||a.y<this.min.y||a.y>this.max.y||a.z<this.min.z||a.z>this.max.z?!1:!0},containsBox:function(a){return this.min.x<=a.min.x&&a.max.x<=this.max.x&&this.min.y<=a.min.y&&a.max.y<=this.max.y&&this.min.z<=a.min.z&&a.max.z<=this.max.z},getParameter:function(a,b){void 0===b&&(console.warn("THREE.Box3: .getParameter() target is now required"),b=new p);return b.set((a.x-this.min.x)/(this.max.x-
this.min.x),(a.y-this.min.y)/(this.max.y-this.min.y),(a.z-this.min.z)/(this.max.z-this.min.z))},intersectsBox:function(a){return a.max.x<this.min.x||a.min.x>this.max.x||a.max.y<this.min.y||a.min.y>this.max.y||a.max.z<this.min.z||a.min.z>this.max.z?!1:!0},intersectsSphere:function(){var a=new p;return function(b){this.clampPoint(b.center,a);return a.distanceToSquared(b.center)<=b.radius*b.radius}}(),intersectsPlane:function(a){if(0<a.normal.x){var b=a.normal.x*this.min.x;var c=a.normal.x*this.max.x}else b=
a.normal.x*this.max.x,c=a.normal.x*this.min.x;0<a.normal.y?(b+=a.normal.y*this.min.y,c+=a.normal.y*this.max.y):(b+=a.normal.y*this.max.y,c+=a.normal.y*this.min.y);0<a.normal.z?(b+=a.normal.z*this.min.z,c+=a.normal.z*this.max.z):(b+=a.normal.z*this.max.z,c+=a.normal.z*this.min.z);return b<=a.constant&&c>=a.constant},intersectsTriangle:function(){function a(a){var e;var f=0;for(e=a.length-3;f<=e;f+=3){h.fromArray(a,f);var g=m.x*Math.abs(h.x)+m.y*Math.abs(h.y)+m.z*Math.abs(h.z),l=b.dot(h),k=c.dot(h),
n=d.dot(h);if(Math.max(-Math.max(l,k,n),Math.min(l,k,n))>g)return!1}return!0}var b=new p,c=new p,d=new p,e=new p,f=new p,g=new p,h=new p,l=new p,m=new p,k=new p;return function(h){if(this.isEmpty())return!1;this.getCenter(l);m.subVectors(this.max,l);b.subVectors(h.a,l);c.subVectors(h.b,l);d.subVectors(h.c,l);e.subVectors(c,b);f.subVectors(d,c);g.subVectors(b,d);h=[0,-e.z,e.y,0,-f.z,f.y,0,-g.z,g.y,e.z,0,-e.x,f.z,0,-f.x,g.z,0,-g.x,-e.y,e.x,0,-f.y,f.x,0,-g.y,g.x,0];if(!a(h))return!1;h=[1,0,0,0,1,0,0,
0,1];if(!a(h))return!1;k.crossVectors(e,f);h=[k.x,k.y,k.z];return a(h)}}(),clampPoint:function(a,b){void 0===b&&(console.warn("THREE.Box3: .clampPoint() target is now required"),b=new p);return b.copy(a).clamp(this.min,this.max)},distanceToPoint:function(){var a=new p;return function(b){return a.copy(b).clamp(this.min,this.max).sub(b).length()}}(),getBoundingSphere:function(){var a=new p;return function(b){void 0===b&&(console.warn("THREE.Box3: .getBoundingSphere() target is now required"),b=new Ha);
this.getCenter(b.center);b.radius=.5*this.getSize(a).length();return b}}(),intersect:function(a){this.min.max(a.min);this.max.min(a.max);this.isEmpty()&&this.makeEmpty();return this},union:function(a){this.min.min(a.min);this.max.max(a.max);return this},applyMatrix4:function(a){if(this.isEmpty())return this;a=a.elements;var b=a[0]*this.min.x,c=a[1]*this.min.x,d=a[2]*this.min.x,e=a[0]*this.max.x,f=a[1]*this.max.x,g=a[2]*this.max.x,h=a[4]*this.min.y,l=a[5]*this.min.y,m=a[6]*this.min.y,k=a[4]*this.max.y,
n=a[5]*this.max.y,p=a[6]*this.max.y,q=a[8]*this.min.z,r=a[9]*this.min.z,u=a[10]*this.min.z,y=a[8]*this.max.z,w=a[9]*this.max.z,x=a[10]*this.max.z;this.min.x=Math.min(b,e)+Math.min(h,k)+Math.min(q,y)+a[12];this.min.y=Math.min(c,f)+Math.min(l,n)+Math.min(r,w)+a[13];this.min.z=Math.min(d,g)+Math.min(m,p)+Math.min(u,x)+a[14];this.max.x=Math.max(b,e)+Math.max(h,k)+Math.max(q,y)+a[12];this.max.y=Math.max(c,f)+Math.max(l,n)+Math.max(r,w)+a[13];this.max.z=Math.max(d,g)+Math.max(m,p)+Math.max(u,x)+a[14];return this},
translate:function(a){this.min.add(a);this.max.add(a);return this},equals:function(a){return a.min.equals(this.min)&&a.max.equals(this.max)}});Object.assign(Ha.prototype,{set:function(a,b){this.center.copy(a);this.radius=b;return this},setFromPoints:function(){var a=new Xa;return function(b,c){var d=this.center;void 0!==c?d.copy(c):a.setFromPoints(b).getCenter(d);for(var e=c=0,f=b.length;e<f;e++)c=Math.max(c,d.distanceToSquared(b[e]));this.radius=Math.sqrt(c);return this}}(),clone:function(){return(new this.constructor).copy(this)},
copy:function(a){this.center.copy(a.center);this.radius=a.radius;return this},empty:function(){return 0>=this.radius},containsPoint:function(a){return a.distanceToSquared(this.center)<=this.radius*this.radius},distanceToPoint:function(a){return a.distanceTo(this.center)-this.radius},intersectsSphere:function(a){var b=this.radius+a.radius;return a.center.distanceToSquared(this.center)<=b*b},intersectsBox:function(a){return a.intersectsSphere(this)},intersectsPlane:function(a){return Math.abs(a.distanceToPoint(this.center))<=
this.radius},clampPoint:function(a,b){var c=this.center.distanceToSquared(a);void 0===b&&(console.warn("THREE.Sphere: .clampPoint() target is now required"),b=new p);b.copy(a);c>this.radius*this.radius&&(b.sub(this.center).normalize(),b.multiplyScalar(this.radius).add(this.center));return b},getBoundingBox:function(a){void 0===a&&(console.warn("THREE.Sphere: .getBoundingBox() target is now required"),a=new Xa);a.set(this.center,this.center);a.expandByScalar(this.radius);return a},applyMatrix4:function(a){this.center.applyMatrix4(a);
this.radius*=a.getMaxScaleOnAxis();return this},translate:function(a){this.center.add(a);return this},equals:function(a){return a.center.equals(this.center)&&a.radius===this.radius}});Object.assign(Ia.prototype,{set:function(a,b){this.normal.copy(a);this.constant=b;return this},setComponents:function(a,b,c,d){this.normal.set(a,b,c);this.constant=d;return this},setFromNormalAndCoplanarPoint:function(a,b){this.normal.copy(a);this.constant=-b.dot(this.normal);return this},setFromCoplanarPoints:function(){var a=
new p,b=new p;return function(c,d,e){d=a.subVectors(e,d).cross(b.subVectors(c,d)).normalize();this.setFromNormalAndCoplanarPoint(d,c);return this}}(),clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.normal.copy(a.normal);this.constant=a.constant;return this},normalize:function(){var a=1/this.normal.length();this.normal.multiplyScalar(a);this.constant*=a;return this},negate:function(){this.constant*=-1;this.normal.negate();return this},distanceToPoint:function(a){return this.normal.dot(a)+
this.constant},distanceToSphere:function(a){return this.distanceToPoint(a.center)-a.radius},projectPoint:function(a,b){void 0===b&&(console.warn("THREE.Plane: .projectPoint() target is now required"),b=new p);return b.copy(this.normal).multiplyScalar(-this.distanceToPoint(a)).add(a)},intersectLine:function(){var a=new p;return function(b,c){void 0===c&&(console.warn("THREE.Plane: .intersectLine() target is now required"),c=new p);var d=b.delta(a),e=this.normal.dot(d);if(0===e){if(0===this.distanceToPoint(b.start))return c.copy(b.start)}else if(e=
-(b.start.dot(this.normal)+this.constant)/e,!(0>e||1<e))return c.copy(d).multiplyScalar(e).add(b.start)}}(),intersectsLine:function(a){var b=this.distanceToPoint(a.start);a=this.distanceToPoint(a.end);return 0>b&&0<a||0>a&&0<b},intersectsBox:function(a){return a.intersectsPlane(this)},intersectsSphere:function(a){return a.intersectsPlane(this)},coplanarPoint:function(a){void 0===a&&(console.warn("THREE.Plane: .coplanarPoint() target is now required"),a=new p);return a.copy(this.normal).multiplyScalar(-this.constant)},
applyMatrix4:function(){var a=new p,b=new la;return function(c,d){d=d||b.getNormalMatrix(c);c=this.coplanarPoint(a).applyMatrix4(c);d=this.normal.applyMatrix3(d).normalize();this.constant=-c.dot(d);return this}}(),translate:function(a){this.constant-=a.dot(this.normal);return this},equals:function(a){return a.normal.equals(this.normal)&&a.constant===this.constant}});Object.assign(td.prototype,{set:function(a,b,c,d,e,f){var g=this.planes;g[0].copy(a);g[1].copy(b);g[2].copy(c);g[3].copy(d);g[4].copy(e);
g[5].copy(f);return this},clone:function(){return(new this.constructor).copy(this)},copy:function(a){for(var b=this.planes,c=0;6>c;c++)b[c].copy(a.planes[c]);return this},setFromMatrix:function(a){var b=this.planes,c=a.elements;a=c[0];var d=c[1],e=c[2],f=c[3],g=c[4],h=c[5],l=c[6],m=c[7],k=c[8],n=c[9],p=c[10],q=c[11],r=c[12],u=c[13],y=c[14];c=c[15];b[0].setComponents(f-a,m-g,q-k,c-r).normalize();b[1].setComponents(f+a,m+g,q+k,c+r).normalize();b[2].setComponents(f+d,m+h,q+n,c+u).normalize();b[3].setComponents(f-
d,m-h,q-n,c-u).normalize();b[4].setComponents(f-e,m-l,q-p,c-y).normalize();b[5].setComponents(f+e,m+l,q+p,c+y).normalize();return this},intersectsObject:function(){var a=new Ha;return function(b){var c=b.geometry;null===c.boundingSphere&&c.computeBoundingSphere();a.copy(c.boundingSphere).applyMatrix4(b.matrixWorld);return this.intersectsSphere(a)}}(),intersectsSprite:function(){var a=new Ha;return function(b){a.center.set(0,0,0);a.radius=.7071067811865476;a.applyMatrix4(b.matrixWorld);return this.intersectsSphere(a)}}(),
intersectsSphere:function(a){var b=this.planes,c=a.center;a=-a.radius;for(var d=0;6>d;d++)if(b[d].distanceToPoint(c)<a)return!1;return!0},intersectsBox:function(){var a=new p,b=new p;return function(c){for(var d=this.planes,e=0;6>e;e++){var f=d[e];a.x=0<f.normal.x?c.min.x:c.max.x;b.x=0<f.normal.x?c.max.x:c.min.x;a.y=0<f.normal.y?c.min.y:c.max.y;b.y=0<f.normal.y?c.max.y:c.min.y;a.z=0<f.normal.z?c.min.z:c.max.z;b.z=0<f.normal.z?c.max.z:c.min.z;var g=f.distanceToPoint(a);f=f.distanceToPoint(b);if(0>
g&&0>f)return!1}return!0}}(),containsPoint:function(a){for(var b=this.planes,c=0;6>c;c++)if(0>b[c].distanceToPoint(a))return!1;return!0}});var S={alphamap_fragment:"#ifdef USE_ALPHAMAP\n\tdiffuseColor.a *= texture2D( alphaMap, vUv ).g;\n#endif\n",alphamap_pars_fragment:"#ifdef USE_ALPHAMAP\n\tuniform sampler2D alphaMap;\n#endif\n",alphatest_fragment:"#ifdef ALPHATEST\n\tif ( diffuseColor.a < ALPHATEST ) discard;\n#endif\n",aomap_fragment:"#ifdef USE_AOMAP\n\tfloat ambientOcclusion = ( texture2D( aoMap, vUv2 ).r - 1.0 ) * aoMapIntensity + 1.0;\n\treflectedLight.indirectDiffuse *= ambientOcclusion;\n\t#if defined( USE_ENVMAP ) && defined( PHYSICAL )\n\t\tfloat dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );\n\t\treflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.specularRoughness );\n\t#endif\n#endif\n",
aomap_pars_fragment:"#ifdef USE_AOMAP\n\tuniform sampler2D aoMap;\n\tuniform float aoMapIntensity;\n#endif",begin_vertex:"\nvec3 transformed = vec3( position );\n",beginnormal_vertex:"\nvec3 objectNormal = vec3( normal );\n",bsdfs:"float punctualLightIntensityToIrradianceFactor( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n\tif( decayExponent > 0.0 ) {\n#if defined ( PHYSICALLY_CORRECT_LIGHTS )\n\t\tfloat distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );\n\t\tfloat maxDistanceCutoffFactor = pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );\n\t\treturn distanceFalloff * maxDistanceCutoffFactor;\n#else\n\t\treturn pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );\n#endif\n\t}\n\treturn 1.0;\n}\nvec3 BRDF_Diffuse_Lambert( const in vec3 diffuseColor ) {\n\treturn RECIPROCAL_PI * diffuseColor;\n}\nvec3 F_Schlick( const in vec3 specularColor, const in float dotLH ) {\n\tfloat fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );\n\treturn ( 1.0 - specularColor ) * fresnel + specularColor;\n}\nfloat G_GGX_Smith( const in float alpha, const in float dotNL, const in float dotNV ) {\n\tfloat a2 = pow2( alpha );\n\tfloat gl = dotNL + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );\n\tfloat gv = dotNV + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );\n\treturn 1.0 / ( gl * gv );\n}\nfloat G_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {\n\tfloat a2 = pow2( alpha );\n\tfloat gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );\n\tfloat gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );\n\treturn 0.5 / max( gv + gl, EPSILON );\n}\nfloat D_GGX( const in float alpha, const in float dotNH ) {\n\tfloat a2 = pow2( alpha );\n\tfloat denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;\n\treturn RECIPROCAL_PI * a2 / pow2( denom );\n}\nvec3 BRDF_Specular_GGX( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float roughness ) {\n\tfloat alpha = pow2( roughness );\n\tvec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );\n\tfloat dotNL = saturate( dot( geometry.normal, incidentLight.direction ) );\n\tfloat dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );\n\tfloat dotNH = saturate( dot( geometry.normal, halfDir ) );\n\tfloat dotLH = saturate( dot( incidentLight.direction, halfDir ) );\n\tvec3 F = F_Schlick( specularColor, dotLH );\n\tfloat G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n\tfloat D = D_GGX( alpha, dotNH );\n\treturn F * ( G * D );\n}\nvec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {\n\tconst float LUT_SIZE  = 64.0;\n\tconst float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;\n\tconst float LUT_BIAS  = 0.5 / LUT_SIZE;\n\tfloat dotNV = saturate( dot( N, V ) );\n\tvec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );\n\tuv = uv * LUT_SCALE + LUT_BIAS;\n\treturn uv;\n}\nfloat LTC_ClippedSphereFormFactor( const in vec3 f ) {\n\tfloat l = length( f );\n\treturn max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );\n}\nvec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {\n\tfloat x = dot( v1, v2 );\n\tfloat y = abs( x );\n\tfloat a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;\n\tfloat b = 3.4175940 + ( 4.1616724 + y ) * y;\n\tfloat v = a / b;\n\tfloat theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;\n\treturn cross( v1, v2 ) * theta_sintheta;\n}\nvec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {\n\tvec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];\n\tvec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];\n\tvec3 lightNormal = cross( v1, v2 );\n\tif( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );\n\tvec3 T1, T2;\n\tT1 = normalize( V - N * dot( V, N ) );\n\tT2 = - cross( N, T1 );\n\tmat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );\n\tvec3 coords[ 4 ];\n\tcoords[ 0 ] = mat * ( rectCoords[ 0 ] - P );\n\tcoords[ 1 ] = mat * ( rectCoords[ 1 ] - P );\n\tcoords[ 2 ] = mat * ( rectCoords[ 2 ] - P );\n\tcoords[ 3 ] = mat * ( rectCoords[ 3 ] - P );\n\tcoords[ 0 ] = normalize( coords[ 0 ] );\n\tcoords[ 1 ] = normalize( coords[ 1 ] );\n\tcoords[ 2 ] = normalize( coords[ 2 ] );\n\tcoords[ 3 ] = normalize( coords[ 3 ] );\n\tvec3 vectorFormFactor = vec3( 0.0 );\n\tvectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );\n\tvectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );\n\tvectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );\n\tvectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );\n\tfloat result = LTC_ClippedSphereFormFactor( vectorFormFactor );\n\treturn vec3( result );\n}\nvec3 BRDF_Specular_GGX_Environment( const in GeometricContext geometry, const in vec3 specularColor, const in float roughness ) {\n\tfloat dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );\n\tconst vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );\n\tconst vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );\n\tvec4 r = roughness * c0 + c1;\n\tfloat a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;\n\tvec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;\n\treturn specularColor * AB.x + AB.y;\n}\nfloat G_BlinnPhong_Implicit( ) {\n\treturn 0.25;\n}\nfloat D_BlinnPhong( const in float shininess, const in float dotNH ) {\n\treturn RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );\n}\nvec3 BRDF_Specular_BlinnPhong( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float shininess ) {\n\tvec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );\n\tfloat dotNH = saturate( dot( geometry.normal, halfDir ) );\n\tfloat dotLH = saturate( dot( incidentLight.direction, halfDir ) );\n\tvec3 F = F_Schlick( specularColor, dotLH );\n\tfloat G = G_BlinnPhong_Implicit( );\n\tfloat D = D_BlinnPhong( shininess, dotNH );\n\treturn F * ( G * D );\n}\nfloat GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {\n\treturn ( 2.0 / pow2( ggxRoughness + 0.0001 ) - 2.0 );\n}\nfloat BlinnExponentToGGXRoughness( const in float blinnExponent ) {\n\treturn sqrt( 2.0 / ( blinnExponent + 2.0 ) );\n}\n",
bumpmap_pars_fragment:"#ifdef USE_BUMPMAP\n\tuniform sampler2D bumpMap;\n\tuniform float bumpScale;\n\tvec2 dHdxy_fwd() {\n\t\tvec2 dSTdx = dFdx( vUv );\n\t\tvec2 dSTdy = dFdy( vUv );\n\t\tfloat Hll = bumpScale * texture2D( bumpMap, vUv ).x;\n\t\tfloat dBx = bumpScale * texture2D( bumpMap, vUv + dSTdx ).x - Hll;\n\t\tfloat dBy = bumpScale * texture2D( bumpMap, vUv + dSTdy ).x - Hll;\n\t\treturn vec2( dBx, dBy );\n\t}\n\tvec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy ) {\n\t\tvec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );\n\t\tvec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );\n\t\tvec3 vN = surf_norm;\n\t\tvec3 R1 = cross( vSigmaY, vN );\n\t\tvec3 R2 = cross( vN, vSigmaX );\n\t\tfloat fDet = dot( vSigmaX, R1 );\n\t\tfDet *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );\n\t\tvec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );\n\t\treturn normalize( abs( fDet ) * surf_norm - vGrad );\n\t}\n#endif\n",
clipping_planes_fragment:"#if NUM_CLIPPING_PLANES > 0\n\tvec4 plane;\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n\t\tplane = clippingPlanes[ i ];\n\t\tif ( dot( vViewPosition, plane.xyz ) > plane.w ) discard;\n\t}\n\t#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n\t\tbool clipped = true;\n\t\t#pragma unroll_loop\n\t\tfor ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n\t\t\tplane = clippingPlanes[ i ];\n\t\t\tclipped = ( dot( vViewPosition, plane.xyz ) > plane.w ) && clipped;\n\t\t}\n\t\tif ( clipped ) discard;\n\t#endif\n#endif\n",
clipping_planes_pars_fragment:"#if NUM_CLIPPING_PLANES > 0\n\t#if ! defined( PHYSICAL ) && ! defined( PHONG )\n\t\tvarying vec3 vViewPosition;\n\t#endif\n\tuniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];\n#endif\n",clipping_planes_pars_vertex:"#if NUM_CLIPPING_PLANES > 0 && ! defined( PHYSICAL ) && ! defined( PHONG )\n\tvarying vec3 vViewPosition;\n#endif\n",clipping_planes_vertex:"#if NUM_CLIPPING_PLANES > 0 && ! defined( PHYSICAL ) && ! defined( PHONG )\n\tvViewPosition = - mvPosition.xyz;\n#endif\n",
color_fragment:"#ifdef USE_COLOR\n\tdiffuseColor.rgb *= vColor;\n#endif",color_pars_fragment:"#ifdef USE_COLOR\n\tvarying vec3 vColor;\n#endif\n",color_pars_vertex:"#ifdef USE_COLOR\n\tvarying vec3 vColor;\n#endif",color_vertex:"#ifdef USE_COLOR\n\tvColor.xyz = color.xyz;\n#endif",common:"#define PI 3.14159265359\n#define PI2 6.28318530718\n#define PI_HALF 1.5707963267949\n#define RECIPROCAL_PI 0.31830988618\n#define RECIPROCAL_PI2 0.15915494\n#define LOG2 1.442695\n#define EPSILON 1e-6\n#define saturate(a) clamp( a, 0.0, 1.0 )\n#define whiteCompliment(a) ( 1.0 - saturate( a ) )\nfloat pow2( const in float x ) { return x*x; }\nfloat pow3( const in float x ) { return x*x*x; }\nfloat pow4( const in float x ) { float x2 = x*x; return x2*x2; }\nfloat average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }\nhighp float rand( const in vec2 uv ) {\n\tconst highp float a = 12.9898, b = 78.233, c = 43758.5453;\n\thighp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );\n\treturn fract(sin(sn) * c);\n}\nstruct IncidentLight {\n\tvec3 color;\n\tvec3 direction;\n\tbool visible;\n};\nstruct ReflectedLight {\n\tvec3 directDiffuse;\n\tvec3 directSpecular;\n\tvec3 indirectDiffuse;\n\tvec3 indirectSpecular;\n};\nstruct GeometricContext {\n\tvec3 position;\n\tvec3 normal;\n\tvec3 viewDir;\n};\nvec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n\treturn normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n}\nvec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {\n\treturn normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );\n}\nvec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {\n\tfloat distance = dot( planeNormal, point - pointOnPlane );\n\treturn - distance * planeNormal + point;\n}\nfloat sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {\n\treturn sign( dot( point - pointOnPlane, planeNormal ) );\n}\nvec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {\n\treturn lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;\n}\nmat3 transposeMat3( const in mat3 m ) {\n\tmat3 tmp;\n\ttmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );\n\ttmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );\n\ttmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );\n\treturn tmp;\n}\nfloat linearToRelativeLuminance( const in vec3 color ) {\n\tvec3 weights = vec3( 0.2126, 0.7152, 0.0722 );\n\treturn dot( weights, color.rgb );\n}\n",
cube_uv_reflection_fragment:"#ifdef ENVMAP_TYPE_CUBE_UV\n#define cubeUV_textureSize (1024.0)\nint getFaceFromDirection(vec3 direction) {\n\tvec3 absDirection = abs(direction);\n\tint face = -1;\n\tif( absDirection.x > absDirection.z ) {\n\t\tif(absDirection.x > absDirection.y )\n\t\t\tface = direction.x > 0.0 ? 0 : 3;\n\t\telse\n\t\t\tface = direction.y > 0.0 ? 1 : 4;\n\t}\n\telse {\n\t\tif(absDirection.z > absDirection.y )\n\t\t\tface = direction.z > 0.0 ? 2 : 5;\n\t\telse\n\t\t\tface = direction.y > 0.0 ? 1 : 4;\n\t}\n\treturn face;\n}\n#define cubeUV_maxLods1  (log2(cubeUV_textureSize*0.25) - 1.0)\n#define cubeUV_rangeClamp (exp2((6.0 - 1.0) * 2.0))\nvec2 MipLevelInfo( vec3 vec, float roughnessLevel, float roughness ) {\n\tfloat scale = exp2(cubeUV_maxLods1 - roughnessLevel);\n\tfloat dxRoughness = dFdx(roughness);\n\tfloat dyRoughness = dFdy(roughness);\n\tvec3 dx = dFdx( vec * scale * dxRoughness );\n\tvec3 dy = dFdy( vec * scale * dyRoughness );\n\tfloat d = max( dot( dx, dx ), dot( dy, dy ) );\n\td = clamp(d, 1.0, cubeUV_rangeClamp);\n\tfloat mipLevel = 0.5 * log2(d);\n\treturn vec2(floor(mipLevel), fract(mipLevel));\n}\n#define cubeUV_maxLods2 (log2(cubeUV_textureSize*0.25) - 2.0)\n#define cubeUV_rcpTextureSize (1.0 / cubeUV_textureSize)\nvec2 getCubeUV(vec3 direction, float roughnessLevel, float mipLevel) {\n\tmipLevel = roughnessLevel > cubeUV_maxLods2 - 3.0 ? 0.0 : mipLevel;\n\tfloat a = 16.0 * cubeUV_rcpTextureSize;\n\tvec2 exp2_packed = exp2( vec2( roughnessLevel, mipLevel ) );\n\tvec2 rcp_exp2_packed = vec2( 1.0 ) / exp2_packed;\n\tfloat powScale = exp2_packed.x * exp2_packed.y;\n\tfloat scale = rcp_exp2_packed.x * rcp_exp2_packed.y * 0.25;\n\tfloat mipOffset = 0.75*(1.0 - rcp_exp2_packed.y) * rcp_exp2_packed.x;\n\tbool bRes = mipLevel == 0.0;\n\tscale =  bRes && (scale < a) ? a : scale;\n\tvec3 r;\n\tvec2 offset;\n\tint face = getFaceFromDirection(direction);\n\tfloat rcpPowScale = 1.0 / powScale;\n\tif( face == 0) {\n\t\tr = vec3(direction.x, -direction.z, direction.y);\n\t\toffset = vec2(0.0+mipOffset,0.75 * rcpPowScale);\n\t\toffset.y = bRes && (offset.y < 2.0*a) ? a : offset.y;\n\t}\n\telse if( face == 1) {\n\t\tr = vec3(direction.y, direction.x, direction.z);\n\t\toffset = vec2(scale+mipOffset, 0.75 * rcpPowScale);\n\t\toffset.y = bRes && (offset.y < 2.0*a) ? a : offset.y;\n\t}\n\telse if( face == 2) {\n\t\tr = vec3(direction.z, direction.x, direction.y);\n\t\toffset = vec2(2.0*scale+mipOffset, 0.75 * rcpPowScale);\n\t\toffset.y = bRes && (offset.y < 2.0*a) ? a : offset.y;\n\t}\n\telse if( face == 3) {\n\t\tr = vec3(direction.x, direction.z, direction.y);\n\t\toffset = vec2(0.0+mipOffset,0.5 * rcpPowScale);\n\t\toffset.y = bRes && (offset.y < 2.0*a) ? 0.0 : offset.y;\n\t}\n\telse if( face == 4) {\n\t\tr = vec3(direction.y, direction.x, -direction.z);\n\t\toffset = vec2(scale+mipOffset, 0.5 * rcpPowScale);\n\t\toffset.y = bRes && (offset.y < 2.0*a) ? 0.0 : offset.y;\n\t}\n\telse {\n\t\tr = vec3(direction.z, -direction.x, direction.y);\n\t\toffset = vec2(2.0*scale+mipOffset, 0.5 * rcpPowScale);\n\t\toffset.y = bRes && (offset.y < 2.0*a) ? 0.0 : offset.y;\n\t}\n\tr = normalize(r);\n\tfloat texelOffset = 0.5 * cubeUV_rcpTextureSize;\n\tvec2 s = ( r.yz / abs( r.x ) + vec2( 1.0 ) ) * 0.5;\n\tvec2 base = offset + vec2( texelOffset );\n\treturn base + s * ( scale - 2.0 * texelOffset );\n}\n#define cubeUV_maxLods3 (log2(cubeUV_textureSize*0.25) - 3.0)\nvec4 textureCubeUV(vec3 reflectedDirection, float roughness ) {\n\tfloat roughnessVal = roughness* cubeUV_maxLods3;\n\tfloat r1 = floor(roughnessVal);\n\tfloat r2 = r1 + 1.0;\n\tfloat t = fract(roughnessVal);\n\tvec2 mipInfo = MipLevelInfo(reflectedDirection, r1, roughness);\n\tfloat s = mipInfo.y;\n\tfloat level0 = mipInfo.x;\n\tfloat level1 = level0 + 1.0;\n\tlevel1 = level1 > 5.0 ? 5.0 : level1;\n\tlevel0 += min( floor( s + 0.5 ), 5.0 );\n\tvec2 uv_10 = getCubeUV(reflectedDirection, r1, level0);\n\tvec4 color10 = envMapTexelToLinear(texture2D(envMap, uv_10));\n\tvec2 uv_20 = getCubeUV(reflectedDirection, r2, level0);\n\tvec4 color20 = envMapTexelToLinear(texture2D(envMap, uv_20));\n\tvec4 result = mix(color10, color20, t);\n\treturn vec4(result.rgb, 1.0);\n}\n#endif\n",
defaultnormal_vertex:"vec3 transformedNormal = normalMatrix * objectNormal;\n#ifdef FLIP_SIDED\n\ttransformedNormal = - transformedNormal;\n#endif\n",displacementmap_pars_vertex:"#ifdef USE_DISPLACEMENTMAP\n\tuniform sampler2D displacementMap;\n\tuniform float displacementScale;\n\tuniform float displacementBias;\n#endif\n",displacementmap_vertex:"#ifdef USE_DISPLACEMENTMAP\n\ttransformed += normalize( objectNormal ) * ( texture2D( displacementMap, uv ).x * displacementScale + displacementBias );\n#endif\n",
emissivemap_fragment:"#ifdef USE_EMISSIVEMAP\n\tvec4 emissiveColor = texture2D( emissiveMap, vUv );\n\temissiveColor.rgb = emissiveMapTexelToLinear( emissiveColor ).rgb;\n\ttotalEmissiveRadiance *= emissiveColor.rgb;\n#endif\n",emissivemap_pars_fragment:"#ifdef USE_EMISSIVEMAP\n\tuniform sampler2D emissiveMap;\n#endif\n",encodings_fragment:"  gl_FragColor = linearToOutputTexel( gl_FragColor );\n",encodings_pars_fragment:"\nvec4 LinearToLinear( in vec4 value ) {\n\treturn value;\n}\nvec4 GammaToLinear( in vec4 value, in float gammaFactor ) {\n\treturn vec4( pow( value.xyz, vec3( gammaFactor ) ), value.w );\n}\nvec4 LinearToGamma( in vec4 value, in float gammaFactor ) {\n\treturn vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );\n}\nvec4 sRGBToLinear( in vec4 value ) {\n\treturn vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.w );\n}\nvec4 LinearTosRGB( in vec4 value ) {\n\treturn vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.w );\n}\nvec4 RGBEToLinear( in vec4 value ) {\n\treturn vec4( value.rgb * exp2( value.a * 255.0 - 128.0 ), 1.0 );\n}\nvec4 LinearToRGBE( in vec4 value ) {\n\tfloat maxComponent = max( max( value.r, value.g ), value.b );\n\tfloat fExp = clamp( ceil( log2( maxComponent ) ), -128.0, 127.0 );\n\treturn vec4( value.rgb / exp2( fExp ), ( fExp + 128.0 ) / 255.0 );\n}\nvec4 RGBMToLinear( in vec4 value, in float maxRange ) {\n\treturn vec4( value.xyz * value.w * maxRange, 1.0 );\n}\nvec4 LinearToRGBM( in vec4 value, in float maxRange ) {\n\tfloat maxRGB = max( value.x, max( value.g, value.b ) );\n\tfloat M      = clamp( maxRGB / maxRange, 0.0, 1.0 );\n\tM            = ceil( M * 255.0 ) / 255.0;\n\treturn vec4( value.rgb / ( M * maxRange ), M );\n}\nvec4 RGBDToLinear( in vec4 value, in float maxRange ) {\n\treturn vec4( value.rgb * ( ( maxRange / 255.0 ) / value.a ), 1.0 );\n}\nvec4 LinearToRGBD( in vec4 value, in float maxRange ) {\n\tfloat maxRGB = max( value.x, max( value.g, value.b ) );\n\tfloat D      = max( maxRange / maxRGB, 1.0 );\n\tD            = min( floor( D ) / 255.0, 1.0 );\n\treturn vec4( value.rgb * ( D * ( 255.0 / maxRange ) ), D );\n}\nconst mat3 cLogLuvM = mat3( 0.2209, 0.3390, 0.4184, 0.1138, 0.6780, 0.7319, 0.0102, 0.1130, 0.2969 );\nvec4 LinearToLogLuv( in vec4 value )  {\n\tvec3 Xp_Y_XYZp = value.rgb * cLogLuvM;\n\tXp_Y_XYZp = max(Xp_Y_XYZp, vec3(1e-6, 1e-6, 1e-6));\n\tvec4 vResult;\n\tvResult.xy = Xp_Y_XYZp.xy / Xp_Y_XYZp.z;\n\tfloat Le = 2.0 * log2(Xp_Y_XYZp.y) + 127.0;\n\tvResult.w = fract(Le);\n\tvResult.z = (Le - (floor(vResult.w*255.0))/255.0)/255.0;\n\treturn vResult;\n}\nconst mat3 cLogLuvInverseM = mat3( 6.0014, -2.7008, -1.7996, -1.3320, 3.1029, -5.7721, 0.3008, -1.0882, 5.6268 );\nvec4 LogLuvToLinear( in vec4 value ) {\n\tfloat Le = value.z * 255.0 + value.w;\n\tvec3 Xp_Y_XYZp;\n\tXp_Y_XYZp.y = exp2((Le - 127.0) / 2.0);\n\tXp_Y_XYZp.z = Xp_Y_XYZp.y / value.y;\n\tXp_Y_XYZp.x = value.x * Xp_Y_XYZp.z;\n\tvec3 vRGB = Xp_Y_XYZp.rgb * cLogLuvInverseM;\n\treturn vec4( max(vRGB, 0.0), 1.0 );\n}\n",
envmap_fragment:"#ifdef USE_ENVMAP\n\t#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )\n\t\tvec3 cameraToVertex = normalize( vWorldPosition - cameraPosition );\n\t\tvec3 worldNormal = inverseTransformDirection( normal, viewMatrix );\n\t\t#ifdef ENVMAP_MODE_REFLECTION\n\t\t\tvec3 reflectVec = reflect( cameraToVertex, worldNormal );\n\t\t#else\n\t\t\tvec3 reflectVec = refract( cameraToVertex, worldNormal, refractionRatio );\n\t\t#endif\n\t#else\n\t\tvec3 reflectVec = vReflect;\n\t#endif\n\t#ifdef ENVMAP_TYPE_CUBE\n\t\tvec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );\n\t#elif defined( ENVMAP_TYPE_EQUIREC )\n\t\tvec2 sampleUV;\n\t\treflectVec = normalize( reflectVec );\n\t\tsampleUV.y = asin( clamp( reflectVec.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;\n\t\tsampleUV.x = atan( reflectVec.z, reflectVec.x ) * RECIPROCAL_PI2 + 0.5;\n\t\tvec4 envColor = texture2D( envMap, sampleUV );\n\t#elif defined( ENVMAP_TYPE_SPHERE )\n\t\treflectVec = normalize( reflectVec );\n\t\tvec3 reflectView = normalize( ( viewMatrix * vec4( reflectVec, 0.0 ) ).xyz + vec3( 0.0, 0.0, 1.0 ) );\n\t\tvec4 envColor = texture2D( envMap, reflectView.xy * 0.5 + 0.5 );\n\t#else\n\t\tvec4 envColor = vec4( 0.0 );\n\t#endif\n\tenvColor = envMapTexelToLinear( envColor );\n\t#ifdef ENVMAP_BLENDING_MULTIPLY\n\t\toutgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );\n\t#elif defined( ENVMAP_BLENDING_MIX )\n\t\toutgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );\n\t#elif defined( ENVMAP_BLENDING_ADD )\n\t\toutgoingLight += envColor.xyz * specularStrength * reflectivity;\n\t#endif\n#endif\n",
envmap_pars_fragment:"#if defined( USE_ENVMAP ) || defined( PHYSICAL )\n\tuniform float reflectivity;\n\tuniform float envMapIntensity;\n#endif\n#ifdef USE_ENVMAP\n\t#if ! defined( PHYSICAL ) && ( defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) )\n\t\tvarying vec3 vWorldPosition;\n\t#endif\n\t#ifdef ENVMAP_TYPE_CUBE\n\t\tuniform samplerCube envMap;\n\t#else\n\t\tuniform sampler2D envMap;\n\t#endif\n\tuniform float flipEnvMap;\n\tuniform int maxMipLevel;\n\t#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( PHYSICAL )\n\t\tuniform float refractionRatio;\n\t#else\n\t\tvarying vec3 vReflect;\n\t#endif\n#endif\n",
envmap_pars_vertex:"#ifdef USE_ENVMAP\n\t#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )\n\t\tvarying vec3 vWorldPosition;\n\t#else\n\t\tvarying vec3 vReflect;\n\t\tuniform float refractionRatio;\n\t#endif\n#endif\n",envmap_vertex:"#ifdef USE_ENVMAP\n\t#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )\n\t\tvWorldPosition = worldPosition.xyz;\n\t#else\n\t\tvec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );\n\t\tvec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );\n\t\t#ifdef ENVMAP_MODE_REFLECTION\n\t\t\tvReflect = reflect( cameraToVertex, worldNormal );\n\t\t#else\n\t\t\tvReflect = refract( cameraToVertex, worldNormal, refractionRatio );\n\t\t#endif\n\t#endif\n#endif\n",
fog_vertex:"\n#ifdef USE_FOG\nfogDepth = -mvPosition.z;\n#endif",fog_pars_vertex:"#ifdef USE_FOG\n  varying float fogDepth;\n#endif\n",fog_fragment:"#ifdef USE_FOG\n\t#ifdef FOG_EXP2\n\t\tfloat fogFactor = whiteCompliment( exp2( - fogDensity * fogDensity * fogDepth * fogDepth * LOG2 ) );\n\t#else\n\t\tfloat fogFactor = smoothstep( fogNear, fogFar, fogDepth );\n\t#endif\n\tgl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif\n",fog_pars_fragment:"#ifdef USE_FOG\n\tuniform vec3 fogColor;\n\tvarying float fogDepth;\n\t#ifdef FOG_EXP2\n\t\tuniform float fogDensity;\n\t#else\n\t\tuniform float fogNear;\n\t\tuniform float fogFar;\n\t#endif\n#endif\n",
gradientmap_pars_fragment:"#ifdef TOON\n\tuniform sampler2D gradientMap;\n\tvec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {\n\t\tfloat dotNL = dot( normal, lightDirection );\n\t\tvec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );\n\t\t#ifdef USE_GRADIENTMAP\n\t\t\treturn texture2D( gradientMap, coord ).rgb;\n\t\t#else\n\t\t\treturn ( coord.x < 0.7 ) ? vec3( 0.7 ) : vec3( 1.0 );\n\t\t#endif\n\t}\n#endif\n",lightmap_fragment:"#ifdef USE_LIGHTMAP\n\treflectedLight.indirectDiffuse += PI * texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;\n#endif\n",
lightmap_pars_fragment:"#ifdef USE_LIGHTMAP\n\tuniform sampler2D lightMap;\n\tuniform float lightMapIntensity;\n#endif",lights_lambert_vertex:"vec3 diffuse = vec3( 1.0 );\nGeometricContext geometry;\ngeometry.position = mvPosition.xyz;\ngeometry.normal = normalize( transformedNormal );\ngeometry.viewDir = normalize( -mvPosition.xyz );\nGeometricContext backGeometry;\nbackGeometry.position = geometry.position;\nbackGeometry.normal = -geometry.normal;\nbackGeometry.viewDir = geometry.viewDir;\nvLightFront = vec3( 0.0 );\n#ifdef DOUBLE_SIDED\n\tvLightBack = vec3( 0.0 );\n#endif\nIncidentLight directLight;\nfloat dotNL;\nvec3 directLightColor_Diffuse;\n#if NUM_POINT_LIGHTS > 0\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n\t\tgetPointDirectLightIrradiance( pointLights[ i ], geometry, directLight );\n\t\tdotNL = dot( geometry.normal, directLight.direction );\n\t\tdirectLightColor_Diffuse = PI * directLight.color;\n\t\tvLightFront += saturate( dotNL ) * directLightColor_Diffuse;\n\t\t#ifdef DOUBLE_SIDED\n\t\t\tvLightBack += saturate( -dotNL ) * directLightColor_Diffuse;\n\t\t#endif\n\t}\n#endif\n#if NUM_SPOT_LIGHTS > 0\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n\t\tgetSpotDirectLightIrradiance( spotLights[ i ], geometry, directLight );\n\t\tdotNL = dot( geometry.normal, directLight.direction );\n\t\tdirectLightColor_Diffuse = PI * directLight.color;\n\t\tvLightFront += saturate( dotNL ) * directLightColor_Diffuse;\n\t\t#ifdef DOUBLE_SIDED\n\t\t\tvLightBack += saturate( -dotNL ) * directLightColor_Diffuse;\n\t\t#endif\n\t}\n#endif\n#if NUM_DIR_LIGHTS > 0\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n\t\tgetDirectionalDirectLightIrradiance( directionalLights[ i ], geometry, directLight );\n\t\tdotNL = dot( geometry.normal, directLight.direction );\n\t\tdirectLightColor_Diffuse = PI * directLight.color;\n\t\tvLightFront += saturate( dotNL ) * directLightColor_Diffuse;\n\t\t#ifdef DOUBLE_SIDED\n\t\t\tvLightBack += saturate( -dotNL ) * directLightColor_Diffuse;\n\t\t#endif\n\t}\n#endif\n#if NUM_HEMI_LIGHTS > 0\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {\n\t\tvLightFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );\n\t\t#ifdef DOUBLE_SIDED\n\t\t\tvLightBack += getHemisphereLightIrradiance( hemisphereLights[ i ], backGeometry );\n\t\t#endif\n\t}\n#endif\n",
lights_pars_begin:"uniform vec3 ambientLightColor;\nvec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {\n\tvec3 irradiance = ambientLightColor;\n\t#ifndef PHYSICALLY_CORRECT_LIGHTS\n\t\tirradiance *= PI;\n\t#endif\n\treturn irradiance;\n}\n#if NUM_DIR_LIGHTS > 0\n\tstruct DirectionalLight {\n\t\tvec3 direction;\n\t\tvec3 color;\n\t\tint shadow;\n\t\tfloat shadowBias;\n\t\tfloat shadowRadius;\n\t\tvec2 shadowMapSize;\n\t};\n\tuniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];\n\tvoid getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {\n\t\tdirectLight.color = directionalLight.color;\n\t\tdirectLight.direction = directionalLight.direction;\n\t\tdirectLight.visible = true;\n\t}\n#endif\n#if NUM_POINT_LIGHTS > 0\n\tstruct PointLight {\n\t\tvec3 position;\n\t\tvec3 color;\n\t\tfloat distance;\n\t\tfloat decay;\n\t\tint shadow;\n\t\tfloat shadowBias;\n\t\tfloat shadowRadius;\n\t\tvec2 shadowMapSize;\n\t\tfloat shadowCameraNear;\n\t\tfloat shadowCameraFar;\n\t};\n\tuniform PointLight pointLights[ NUM_POINT_LIGHTS ];\n\tvoid getPointDirectLightIrradiance( const in PointLight pointLight, const in GeometricContext geometry, out IncidentLight directLight ) {\n\t\tvec3 lVector = pointLight.position - geometry.position;\n\t\tdirectLight.direction = normalize( lVector );\n\t\tfloat lightDistance = length( lVector );\n\t\tdirectLight.color = pointLight.color;\n\t\tdirectLight.color *= punctualLightIntensityToIrradianceFactor( lightDistance, pointLight.distance, pointLight.decay );\n\t\tdirectLight.visible = ( directLight.color != vec3( 0.0 ) );\n\t}\n#endif\n#if NUM_SPOT_LIGHTS > 0\n\tstruct SpotLight {\n\t\tvec3 position;\n\t\tvec3 direction;\n\t\tvec3 color;\n\t\tfloat distance;\n\t\tfloat decay;\n\t\tfloat coneCos;\n\t\tfloat penumbraCos;\n\t\tint shadow;\n\t\tfloat shadowBias;\n\t\tfloat shadowRadius;\n\t\tvec2 shadowMapSize;\n\t};\n\tuniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];\n\tvoid getSpotDirectLightIrradiance( const in SpotLight spotLight, const in GeometricContext geometry, out IncidentLight directLight  ) {\n\t\tvec3 lVector = spotLight.position - geometry.position;\n\t\tdirectLight.direction = normalize( lVector );\n\t\tfloat lightDistance = length( lVector );\n\t\tfloat angleCos = dot( directLight.direction, spotLight.direction );\n\t\tif ( angleCos > spotLight.coneCos ) {\n\t\t\tfloat spotEffect = smoothstep( spotLight.coneCos, spotLight.penumbraCos, angleCos );\n\t\t\tdirectLight.color = spotLight.color;\n\t\t\tdirectLight.color *= spotEffect * punctualLightIntensityToIrradianceFactor( lightDistance, spotLight.distance, spotLight.decay );\n\t\t\tdirectLight.visible = true;\n\t\t} else {\n\t\t\tdirectLight.color = vec3( 0.0 );\n\t\t\tdirectLight.visible = false;\n\t\t}\n\t}\n#endif\n#if NUM_RECT_AREA_LIGHTS > 0\n\tstruct RectAreaLight {\n\t\tvec3 color;\n\t\tvec3 position;\n\t\tvec3 halfWidth;\n\t\tvec3 halfHeight;\n\t};\n\tuniform sampler2D ltc_1;\tuniform sampler2D ltc_2;\n\tuniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];\n#endif\n#if NUM_HEMI_LIGHTS > 0\n\tstruct HemisphereLight {\n\t\tvec3 direction;\n\t\tvec3 skyColor;\n\t\tvec3 groundColor;\n\t};\n\tuniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];\n\tvec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in GeometricContext geometry ) {\n\t\tfloat dotNL = dot( geometry.normal, hemiLight.direction );\n\t\tfloat hemiDiffuseWeight = 0.5 * dotNL + 0.5;\n\t\tvec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );\n\t\t#ifndef PHYSICALLY_CORRECT_LIGHTS\n\t\t\tirradiance *= PI;\n\t\t#endif\n\t\treturn irradiance;\n\t}\n#endif\n",
lights_pars_maps:"#if defined( USE_ENVMAP ) && defined( PHYSICAL )\n\tvec3 getLightProbeIndirectIrradiance( const in GeometricContext geometry, const in int maxMIPLevel ) {\n\t\tvec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );\n\t\t#ifdef ENVMAP_TYPE_CUBE\n\t\t\tvec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );\n\t\t\t#ifdef TEXTURE_LOD_EXT\n\t\t\t\tvec4 envMapColor = textureCubeLodEXT( envMap, queryVec, float( maxMIPLevel ) );\n\t\t\t#else\n\t\t\t\tvec4 envMapColor = textureCube( envMap, queryVec, float( maxMIPLevel ) );\n\t\t\t#endif\n\t\t\tenvMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;\n\t\t#elif defined( ENVMAP_TYPE_CUBE_UV )\n\t\t\tvec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );\n\t\t\tvec4 envMapColor = textureCubeUV( queryVec, 1.0 );\n\t\t#else\n\t\t\tvec4 envMapColor = vec4( 0.0 );\n\t\t#endif\n\t\treturn PI * envMapColor.rgb * envMapIntensity;\n\t}\n\tfloat getSpecularMIPLevel( const in float blinnShininessExponent, const in int maxMIPLevel ) {\n\t\tfloat maxMIPLevelScalar = float( maxMIPLevel );\n\t\tfloat desiredMIPLevel = maxMIPLevelScalar + 0.79248 - 0.5 * log2( pow2( blinnShininessExponent ) + 1.0 );\n\t\treturn clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );\n\t}\n\tvec3 getLightProbeIndirectRadiance( const in GeometricContext geometry, const in float blinnShininessExponent, const in int maxMIPLevel ) {\n\t\t#ifdef ENVMAP_MODE_REFLECTION\n\t\t\tvec3 reflectVec = reflect( -geometry.viewDir, geometry.normal );\n\t\t#else\n\t\t\tvec3 reflectVec = refract( -geometry.viewDir, geometry.normal, refractionRatio );\n\t\t#endif\n\t\treflectVec = inverseTransformDirection( reflectVec, viewMatrix );\n\t\tfloat specularMIPLevel = getSpecularMIPLevel( blinnShininessExponent, maxMIPLevel );\n\t\t#ifdef ENVMAP_TYPE_CUBE\n\t\t\tvec3 queryReflectVec = vec3( flipEnvMap * reflectVec.x, reflectVec.yz );\n\t\t\t#ifdef TEXTURE_LOD_EXT\n\t\t\t\tvec4 envMapColor = textureCubeLodEXT( envMap, queryReflectVec, specularMIPLevel );\n\t\t\t#else\n\t\t\t\tvec4 envMapColor = textureCube( envMap, queryReflectVec, specularMIPLevel );\n\t\t\t#endif\n\t\t\tenvMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;\n\t\t#elif defined( ENVMAP_TYPE_CUBE_UV )\n\t\t\tvec3 queryReflectVec = vec3( flipEnvMap * reflectVec.x, reflectVec.yz );\n\t\t\tvec4 envMapColor = textureCubeUV(queryReflectVec, BlinnExponentToGGXRoughness(blinnShininessExponent));\n\t\t#elif defined( ENVMAP_TYPE_EQUIREC )\n\t\t\tvec2 sampleUV;\n\t\t\tsampleUV.y = asin( clamp( reflectVec.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;\n\t\t\tsampleUV.x = atan( reflectVec.z, reflectVec.x ) * RECIPROCAL_PI2 + 0.5;\n\t\t\t#ifdef TEXTURE_LOD_EXT\n\t\t\t\tvec4 envMapColor = texture2DLodEXT( envMap, sampleUV, specularMIPLevel );\n\t\t\t#else\n\t\t\t\tvec4 envMapColor = texture2D( envMap, sampleUV, specularMIPLevel );\n\t\t\t#endif\n\t\t\tenvMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;\n\t\t#elif defined( ENVMAP_TYPE_SPHERE )\n\t\t\tvec3 reflectView = normalize( ( viewMatrix * vec4( reflectVec, 0.0 ) ).xyz + vec3( 0.0,0.0,1.0 ) );\n\t\t\t#ifdef TEXTURE_LOD_EXT\n\t\t\t\tvec4 envMapColor = texture2DLodEXT( envMap, reflectView.xy * 0.5 + 0.5, specularMIPLevel );\n\t\t\t#else\n\t\t\t\tvec4 envMapColor = texture2D( envMap, reflectView.xy * 0.5 + 0.5, specularMIPLevel );\n\t\t\t#endif\n\t\t\tenvMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;\n\t\t#endif\n\t\treturn envMapColor.rgb * envMapIntensity;\n\t}\n#endif\n",
lights_phong_fragment:"BlinnPhongMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularColor = specular;\nmaterial.specularShininess = shininess;\nmaterial.specularStrength = specularStrength;\n",lights_phong_pars_fragment:"varying vec3 vViewPosition;\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n#endif\nstruct BlinnPhongMaterial {\n\tvec3\tdiffuseColor;\n\tvec3\tspecularColor;\n\tfloat\tspecularShininess;\n\tfloat\tspecularStrength;\n};\nvoid RE_Direct_BlinnPhong( const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n\t#ifdef TOON\n\t\tvec3 irradiance = getGradientIrradiance( geometry.normal, directLight.direction ) * directLight.color;\n\t#else\n\t\tfloat dotNL = saturate( dot( geometry.normal, directLight.direction ) );\n\t\tvec3 irradiance = dotNL * directLight.color;\n\t#endif\n\t#ifndef PHYSICALLY_CORRECT_LIGHTS\n\t\tirradiance *= PI;\n\t#endif\n\treflectedLight.directDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );\n\treflectedLight.directSpecular += irradiance * BRDF_Specular_BlinnPhong( directLight, geometry, material.specularColor, material.specularShininess ) * material.specularStrength;\n}\nvoid RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n\treflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );\n}\n#define RE_Direct\t\t\t\tRE_Direct_BlinnPhong\n#define RE_IndirectDiffuse\t\tRE_IndirectDiffuse_BlinnPhong\n#define Material_LightProbeLOD( material )\t(0)\n",
lights_physical_fragment:"PhysicalMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );\nmaterial.specularRoughness = clamp( roughnessFactor, 0.04, 1.0 );\n#ifdef STANDARD\n\tmaterial.specularColor = mix( vec3( DEFAULT_SPECULAR_COEFFICIENT ), diffuseColor.rgb, metalnessFactor );\n#else\n\tmaterial.specularColor = mix( vec3( MAXIMUM_SPECULAR_COEFFICIENT * pow2( reflectivity ) ), diffuseColor.rgb, metalnessFactor );\n\tmaterial.clearCoat = saturate( clearCoat );\tmaterial.clearCoatRoughness = clamp( clearCoatRoughness, 0.04, 1.0 );\n#endif\n",
lights_physical_pars_fragment:"struct PhysicalMaterial {\n\tvec3\tdiffuseColor;\n\tfloat\tspecularRoughness;\n\tvec3\tspecularColor;\n\t#ifndef STANDARD\n\t\tfloat clearCoat;\n\t\tfloat clearCoatRoughness;\n\t#endif\n};\n#define MAXIMUM_SPECULAR_COEFFICIENT 0.16\n#define DEFAULT_SPECULAR_COEFFICIENT 0.04\nfloat clearCoatDHRApprox( const in float roughness, const in float dotNL ) {\n\treturn DEFAULT_SPECULAR_COEFFICIENT + ( 1.0 - DEFAULT_SPECULAR_COEFFICIENT ) * ( pow( 1.0 - dotNL, 5.0 ) * pow( 1.0 - roughness, 2.0 ) );\n}\n#if NUM_RECT_AREA_LIGHTS > 0\n\tvoid RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n\t\tvec3 normal = geometry.normal;\n\t\tvec3 viewDir = geometry.viewDir;\n\t\tvec3 position = geometry.position;\n\t\tvec3 lightPos = rectAreaLight.position;\n\t\tvec3 halfWidth = rectAreaLight.halfWidth;\n\t\tvec3 halfHeight = rectAreaLight.halfHeight;\n\t\tvec3 lightColor = rectAreaLight.color;\n\t\tfloat roughness = material.specularRoughness;\n\t\tvec3 rectCoords[ 4 ];\n\t\trectCoords[ 0 ] = lightPos - halfWidth - halfHeight;\t\trectCoords[ 1 ] = lightPos + halfWidth - halfHeight;\n\t\trectCoords[ 2 ] = lightPos + halfWidth + halfHeight;\n\t\trectCoords[ 3 ] = lightPos - halfWidth + halfHeight;\n\t\tvec2 uv = LTC_Uv( normal, viewDir, roughness );\n\t\tvec4 t1 = texture2D( ltc_1, uv );\n\t\tvec4 t2 = texture2D( ltc_2, uv );\n\t\tmat3 mInv = mat3(\n\t\t\tvec3( t1.x, 0, t1.y ),\n\t\t\tvec3(    0, 1,    0 ),\n\t\t\tvec3( t1.z, 0, t1.w )\n\t\t);\n\t\tvec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );\n\t\treflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );\n\t\treflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );\n\t}\n#endif\nvoid RE_Direct_Physical( const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n\tfloat dotNL = saturate( dot( geometry.normal, directLight.direction ) );\n\tvec3 irradiance = dotNL * directLight.color;\n\t#ifndef PHYSICALLY_CORRECT_LIGHTS\n\t\tirradiance *= PI;\n\t#endif\n\t#ifndef STANDARD\n\t\tfloat clearCoatDHR = material.clearCoat * clearCoatDHRApprox( material.clearCoatRoughness, dotNL );\n\t#else\n\t\tfloat clearCoatDHR = 0.0;\n\t#endif\n\treflectedLight.directSpecular += ( 1.0 - clearCoatDHR ) * irradiance * BRDF_Specular_GGX( directLight, geometry, material.specularColor, material.specularRoughness );\n\treflectedLight.directDiffuse += ( 1.0 - clearCoatDHR ) * irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );\n\t#ifndef STANDARD\n\t\treflectedLight.directSpecular += irradiance * material.clearCoat * BRDF_Specular_GGX( directLight, geometry, vec3( DEFAULT_SPECULAR_COEFFICIENT ), material.clearCoatRoughness );\n\t#endif\n}\nvoid RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n\treflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 clearCoatRadiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n\t#ifndef STANDARD\n\t\tfloat dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );\n\t\tfloat dotNL = dotNV;\n\t\tfloat clearCoatDHR = material.clearCoat * clearCoatDHRApprox( material.clearCoatRoughness, dotNL );\n\t#else\n\t\tfloat clearCoatDHR = 0.0;\n\t#endif\n\treflectedLight.indirectSpecular += ( 1.0 - clearCoatDHR ) * radiance * BRDF_Specular_GGX_Environment( geometry, material.specularColor, material.specularRoughness );\n\t#ifndef STANDARD\n\t\treflectedLight.indirectSpecular += clearCoatRadiance * material.clearCoat * BRDF_Specular_GGX_Environment( geometry, vec3( DEFAULT_SPECULAR_COEFFICIENT ), material.clearCoatRoughness );\n\t#endif\n}\n#define RE_Direct\t\t\t\tRE_Direct_Physical\n#define RE_Direct_RectArea\t\tRE_Direct_RectArea_Physical\n#define RE_IndirectDiffuse\t\tRE_IndirectDiffuse_Physical\n#define RE_IndirectSpecular\t\tRE_IndirectSpecular_Physical\n#define Material_BlinnShininessExponent( material )   GGXRoughnessToBlinnExponent( material.specularRoughness )\n#define Material_ClearCoat_BlinnShininessExponent( material )   GGXRoughnessToBlinnExponent( material.clearCoatRoughness )\nfloat computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {\n\treturn saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );\n}\n",
lights_fragment_begin:"\nGeometricContext geometry;\ngeometry.position = - vViewPosition;\ngeometry.normal = normal;\ngeometry.viewDir = normalize( vViewPosition );\nIncidentLight directLight;\n#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )\n\tPointLight pointLight;\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n\t\tpointLight = pointLights[ i ];\n\t\tgetPointDirectLightIrradiance( pointLight, geometry, directLight );\n\t\t#ifdef USE_SHADOWMAP\n\t\tdirectLight.color *= all( bvec2( pointLight.shadow, directLight.visible ) ) ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;\n\t\t#endif\n\t\tRE_Direct( directLight, geometry, material, reflectedLight );\n\t}\n#endif\n#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )\n\tSpotLight spotLight;\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n\t\tspotLight = spotLights[ i ];\n\t\tgetSpotDirectLightIrradiance( spotLight, geometry, directLight );\n\t\t#ifdef USE_SHADOWMAP\n\t\tdirectLight.color *= all( bvec2( spotLight.shadow, directLight.visible ) ) ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;\n\t\t#endif\n\t\tRE_Direct( directLight, geometry, material, reflectedLight );\n\t}\n#endif\n#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )\n\tDirectionalLight directionalLight;\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n\t\tdirectionalLight = directionalLights[ i ];\n\t\tgetDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );\n\t\t#ifdef USE_SHADOWMAP\n\t\tdirectLight.color *= all( bvec2( directionalLight.shadow, directLight.visible ) ) ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\t#endif\n\t\tRE_Direct( directLight, geometry, material, reflectedLight );\n\t}\n#endif\n#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )\n\tRectAreaLight rectAreaLight;\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {\n\t\trectAreaLight = rectAreaLights[ i ];\n\t\tRE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );\n\t}\n#endif\n#if defined( RE_IndirectDiffuse )\n\tvec3 irradiance = getAmbientLightIrradiance( ambientLightColor );\n\t#if ( NUM_HEMI_LIGHTS > 0 )\n\t\t#pragma unroll_loop\n\t\tfor ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {\n\t\t\tirradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );\n\t\t}\n\t#endif\n#endif\n#if defined( RE_IndirectSpecular )\n\tvec3 radiance = vec3( 0.0 );\n\tvec3 clearCoatRadiance = vec3( 0.0 );\n#endif\n",
lights_fragment_maps:"#if defined( RE_IndirectDiffuse )\n\t#ifdef USE_LIGHTMAP\n\t\tvec3 lightMapIrradiance = texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;\n\t\t#ifndef PHYSICALLY_CORRECT_LIGHTS\n\t\t\tlightMapIrradiance *= PI;\n\t\t#endif\n\t\tirradiance += lightMapIrradiance;\n\t#endif\n\t#if defined( USE_ENVMAP ) && defined( PHYSICAL ) && defined( ENVMAP_TYPE_CUBE_UV )\n\t\tirradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel );\n\t#endif\n#endif\n#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )\n\tradiance += getLightProbeIndirectRadiance( geometry, Material_BlinnShininessExponent( material ), maxMipLevel );\n\t#ifndef STANDARD\n\t\tclearCoatRadiance += getLightProbeIndirectRadiance( geometry, Material_ClearCoat_BlinnShininessExponent( material ), maxMipLevel );\n\t#endif\n#endif\n",
lights_fragment_end:"#if defined( RE_IndirectDiffuse )\n\tRE_IndirectDiffuse( irradiance, geometry, material, reflectedLight );\n#endif\n#if defined( RE_IndirectSpecular )\n\tRE_IndirectSpecular( radiance, clearCoatRadiance, geometry, material, reflectedLight );\n#endif\n",logdepthbuf_fragment:"#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )\n\tgl_FragDepthEXT = log2( vFragDepth ) * logDepthBufFC * 0.5;\n#endif",logdepthbuf_pars_fragment:"#ifdef USE_LOGDEPTHBUF\n\tuniform float logDepthBufFC;\n\t#ifdef USE_LOGDEPTHBUF_EXT\n\t\tvarying float vFragDepth;\n\t#endif\n#endif\n",
logdepthbuf_pars_vertex:"#ifdef USE_LOGDEPTHBUF\n\t#ifdef USE_LOGDEPTHBUF_EXT\n\t\tvarying float vFragDepth;\n\t#endif\n\tuniform float logDepthBufFC;\n#endif",logdepthbuf_vertex:"#ifdef USE_LOGDEPTHBUF\n\t#ifdef USE_LOGDEPTHBUF_EXT\n\t\tvFragDepth = 1.0 + gl_Position.w;\n\t#else\n\t\tgl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;\n\t\tgl_Position.z *= gl_Position.w;\n\t#endif\n#endif\n",map_fragment:"#ifdef USE_MAP\n\tvec4 texelColor = texture2D( map, vUv );\n\ttexelColor = mapTexelToLinear( texelColor );\n\tdiffuseColor *= texelColor;\n#endif\n",
map_pars_fragment:"#ifdef USE_MAP\n\tuniform sampler2D map;\n#endif\n",map_particle_fragment:"#ifdef USE_MAP\n\tvec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;\n\tvec4 mapTexel = texture2D( map, uv );\n\tdiffuseColor *= mapTexelToLinear( mapTexel );\n#endif\n",map_particle_pars_fragment:"#ifdef USE_MAP\n\tuniform mat3 uvTransform;\n\tuniform sampler2D map;\n#endif\n",metalnessmap_fragment:"float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n\tvec4 texelMetalness = texture2D( metalnessMap, vUv );\n\tmetalnessFactor *= texelMetalness.b;\n#endif\n",
metalnessmap_pars_fragment:"#ifdef USE_METALNESSMAP\n\tuniform sampler2D metalnessMap;\n#endif",morphnormal_vertex:"#ifdef USE_MORPHNORMALS\n\tobjectNormal += ( morphNormal0 - normal ) * morphTargetInfluences[ 0 ];\n\tobjectNormal += ( morphNormal1 - normal ) * morphTargetInfluences[ 1 ];\n\tobjectNormal += ( morphNormal2 - normal ) * morphTargetInfluences[ 2 ];\n\tobjectNormal += ( morphNormal3 - normal ) * morphTargetInfluences[ 3 ];\n#endif\n",morphtarget_pars_vertex:"#ifdef USE_MORPHTARGETS\n\t#ifndef USE_MORPHNORMALS\n\tuniform float morphTargetInfluences[ 8 ];\n\t#else\n\tuniform float morphTargetInfluences[ 4 ];\n\t#endif\n#endif",
morphtarget_vertex:"#ifdef USE_MORPHTARGETS\n\ttransformed += ( morphTarget0 - position ) * morphTargetInfluences[ 0 ];\n\ttransformed += ( morphTarget1 - position ) * morphTargetInfluences[ 1 ];\n\ttransformed += ( morphTarget2 - position ) * morphTargetInfluences[ 2 ];\n\ttransformed += ( morphTarget3 - position ) * morphTargetInfluences[ 3 ];\n\t#ifndef USE_MORPHNORMALS\n\ttransformed += ( morphTarget4 - position ) * morphTargetInfluences[ 4 ];\n\ttransformed += ( morphTarget5 - position ) * morphTargetInfluences[ 5 ];\n\ttransformed += ( morphTarget6 - position ) * morphTargetInfluences[ 6 ];\n\ttransformed += ( morphTarget7 - position ) * morphTargetInfluences[ 7 ];\n\t#endif\n#endif\n",
normal_fragment_begin:"#ifdef FLAT_SHADED\n\tvec3 fdx = vec3( dFdx( vViewPosition.x ), dFdx( vViewPosition.y ), dFdx( vViewPosition.z ) );\n\tvec3 fdy = vec3( dFdy( vViewPosition.x ), dFdy( vViewPosition.y ), dFdy( vViewPosition.z ) );\n\tvec3 normal = normalize( cross( fdx, fdy ) );\n#else\n\tvec3 normal = normalize( vNormal );\n\t#ifdef DOUBLE_SIDED\n\t\tnormal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );\n\t#endif\n#endif\n",normal_fragment_maps:"#ifdef USE_NORMALMAP\n\t#ifdef OBJECTSPACE_NORMALMAP\n\t\tnormal = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;\n\t\t#ifdef FLIP_SIDED\n\t\t\tnormal = - normal;\n\t\t#endif\n\t\t#ifdef DOUBLE_SIDED\n\t\t\tnormal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );\n\t\t#endif\n\t\tnormal = normalize( normalMatrix * normal );\n\t#else\n\t\tnormal = perturbNormal2Arb( -vViewPosition, normal );\n\t#endif\n#elif defined( USE_BUMPMAP )\n\tnormal = perturbNormalArb( -vViewPosition, normal, dHdxy_fwd() );\n#endif\n",
normalmap_pars_fragment:"#ifdef USE_NORMALMAP\n\tuniform sampler2D normalMap;\n\tuniform vec2 normalScale;\n\t#ifdef OBJECTSPACE_NORMALMAP\n\t\tuniform mat3 normalMatrix;\n\t#else\n\t\tvec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {\n\t\t\tvec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );\n\t\t\tvec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );\n\t\t\tvec2 st0 = dFdx( vUv.st );\n\t\t\tvec2 st1 = dFdy( vUv.st );\n\t\t\tfloat scale = sign( st1.t * st0.s - st0.t * st1.s );\n\t\t\tvec3 S = normalize( ( q0 * st1.t - q1 * st0.t ) * scale );\n\t\t\tvec3 T = normalize( ( - q0 * st1.s + q1 * st0.s ) * scale );\n\t\t\tvec3 N = normalize( surf_norm );\n\t\t\tmat3 tsn = mat3( S, T, N );\n\t\t\tvec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;\n\t\t\tmapN.xy *= normalScale;\n\t\t\tmapN.xy *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );\n\t\t\treturn normalize( tsn * mapN );\n\t\t}\n\t#endif\n#endif\n",
packing:"vec3 packNormalToRGB( const in vec3 normal ) {\n\treturn normalize( normal ) * 0.5 + 0.5;\n}\nvec3 unpackRGBToNormal( const in vec3 rgb ) {\n\treturn 2.0 * rgb.xyz - 1.0;\n}\nconst float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;\nconst vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );\nconst vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );\nconst float ShiftRight8 = 1. / 256.;\nvec4 packDepthToRGBA( const in float v ) {\n\tvec4 r = vec4( fract( v * PackFactors ), v );\n\tr.yzw -= r.xyz * ShiftRight8;\treturn r * PackUpscale;\n}\nfloat unpackRGBAToDepth( const in vec4 v ) {\n\treturn dot( v, UnpackFactors );\n}\nfloat viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {\n\treturn ( viewZ + near ) / ( near - far );\n}\nfloat orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {\n\treturn linearClipZ * ( near - far ) - near;\n}\nfloat viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {\n\treturn (( near + viewZ ) * far ) / (( far - near ) * viewZ );\n}\nfloat perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {\n\treturn ( near * far ) / ( ( far - near ) * invClipZ - far );\n}\n",
premultiplied_alpha_fragment:"#ifdef PREMULTIPLIED_ALPHA\n\tgl_FragColor.rgb *= gl_FragColor.a;\n#endif\n",project_vertex:"vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );\ngl_Position = projectionMatrix * mvPosition;\n",dithering_fragment:"#if defined( DITHERING )\n  gl_FragColor.rgb = dithering( gl_FragColor.rgb );\n#endif\n",dithering_pars_fragment:"#if defined( DITHERING )\n\tvec3 dithering( vec3 color ) {\n\t\tfloat grid_position = rand( gl_FragCoord.xy );\n\t\tvec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );\n\t\tdither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );\n\t\treturn color + dither_shift_RGB;\n\t}\n#endif\n",
roughnessmap_fragment:"float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n\tvec4 texelRoughness = texture2D( roughnessMap, vUv );\n\troughnessFactor *= texelRoughness.g;\n#endif\n",roughnessmap_pars_fragment:"#ifdef USE_ROUGHNESSMAP\n\tuniform sampler2D roughnessMap;\n#endif",shadowmap_pars_fragment:"#ifdef USE_SHADOWMAP\n\t#if NUM_DIR_LIGHTS > 0\n\t\tuniform sampler2D directionalShadowMap[ NUM_DIR_LIGHTS ];\n\t\tvarying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];\n\t#endif\n\t#if NUM_SPOT_LIGHTS > 0\n\t\tuniform sampler2D spotShadowMap[ NUM_SPOT_LIGHTS ];\n\t\tvarying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHTS ];\n\t#endif\n\t#if NUM_POINT_LIGHTS > 0\n\t\tuniform sampler2D pointShadowMap[ NUM_POINT_LIGHTS ];\n\t\tvarying vec4 vPointShadowCoord[ NUM_POINT_LIGHTS ];\n\t#endif\n\tfloat texture2DCompare( sampler2D depths, vec2 uv, float compare ) {\n\t\treturn step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );\n\t}\n\tfloat texture2DShadowLerp( sampler2D depths, vec2 size, vec2 uv, float compare ) {\n\t\tconst vec2 offset = vec2( 0.0, 1.0 );\n\t\tvec2 texelSize = vec2( 1.0 ) / size;\n\t\tvec2 centroidUV = floor( uv * size + 0.5 ) / size;\n\t\tfloat lb = texture2DCompare( depths, centroidUV + texelSize * offset.xx, compare );\n\t\tfloat lt = texture2DCompare( depths, centroidUV + texelSize * offset.xy, compare );\n\t\tfloat rb = texture2DCompare( depths, centroidUV + texelSize * offset.yx, compare );\n\t\tfloat rt = texture2DCompare( depths, centroidUV + texelSize * offset.yy, compare );\n\t\tvec2 f = fract( uv * size + 0.5 );\n\t\tfloat a = mix( lb, lt, f.y );\n\t\tfloat b = mix( rb, rt, f.y );\n\t\tfloat c = mix( a, b, f.x );\n\t\treturn c;\n\t}\n\tfloat getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n\t\tfloat shadow = 1.0;\n\t\tshadowCoord.xyz /= shadowCoord.w;\n\t\tshadowCoord.z += shadowBias;\n\t\tbvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );\n\t\tbool inFrustum = all( inFrustumVec );\n\t\tbvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );\n\t\tbool frustumTest = all( frustumTestVec );\n\t\tif ( frustumTest ) {\n\t\t#if defined( SHADOWMAP_TYPE_PCF )\n\t\t\tvec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n\t\t\tfloat dx0 = - texelSize.x * shadowRadius;\n\t\t\tfloat dy0 = - texelSize.y * shadowRadius;\n\t\t\tfloat dx1 = + texelSize.x * shadowRadius;\n\t\t\tfloat dy1 = + texelSize.y * shadowRadius;\n\t\t\tshadow = (\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +\n\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )\n\t\t\t) * ( 1.0 / 9.0 );\n\t\t#elif defined( SHADOWMAP_TYPE_PCF_SOFT )\n\t\t\tvec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n\t\t\tfloat dx0 = - texelSize.x * shadowRadius;\n\t\t\tfloat dy0 = - texelSize.y * shadowRadius;\n\t\t\tfloat dx1 = + texelSize.x * shadowRadius;\n\t\t\tfloat dy1 = + texelSize.y * shadowRadius;\n\t\t\tshadow = (\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy, shadowCoord.z ) +\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +\n\t\t\t\ttexture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )\n\t\t\t) * ( 1.0 / 9.0 );\n\t\t#else\n\t\t\tshadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );\n\t\t#endif\n\t\t}\n\t\treturn shadow;\n\t}\n\tvec2 cubeToUV( vec3 v, float texelSizeY ) {\n\t\tvec3 absV = abs( v );\n\t\tfloat scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );\n\t\tabsV *= scaleToCube;\n\t\tv *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );\n\t\tvec2 planar = v.xy;\n\t\tfloat almostATexel = 1.5 * texelSizeY;\n\t\tfloat almostOne = 1.0 - almostATexel;\n\t\tif ( absV.z >= almostOne ) {\n\t\t\tif ( v.z > 0.0 )\n\t\t\t\tplanar.x = 4.0 - v.x;\n\t\t} else if ( absV.x >= almostOne ) {\n\t\t\tfloat signX = sign( v.x );\n\t\t\tplanar.x = v.z * signX + 2.0 * signX;\n\t\t} else if ( absV.y >= almostOne ) {\n\t\t\tfloat signY = sign( v.y );\n\t\t\tplanar.x = v.x + 2.0 * signY + 2.0;\n\t\t\tplanar.y = v.z * signY - 2.0;\n\t\t}\n\t\treturn vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );\n\t}\n\tfloat getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n\t\tvec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );\n\t\tvec3 lightToPosition = shadowCoord.xyz;\n\t\tfloat dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );\t\tdp += shadowBias;\n\t\tvec3 bd3D = normalize( lightToPosition );\n\t\t#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT )\n\t\t\tvec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;\n\t\t\treturn (\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )\n\t\t\t) * ( 1.0 / 9.0 );\n\t\t#else\n\t\t\treturn texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );\n\t\t#endif\n\t}\n#endif\n",
shadowmap_pars_vertex:"#ifdef USE_SHADOWMAP\n\t#if NUM_DIR_LIGHTS > 0\n\t\tuniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHTS ];\n\t\tvarying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];\n\t#endif\n\t#if NUM_SPOT_LIGHTS > 0\n\t\tuniform mat4 spotShadowMatrix[ NUM_SPOT_LIGHTS ];\n\t\tvarying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHTS ];\n\t#endif\n\t#if NUM_POINT_LIGHTS > 0\n\t\tuniform mat4 pointShadowMatrix[ NUM_POINT_LIGHTS ];\n\t\tvarying vec4 vPointShadowCoord[ NUM_POINT_LIGHTS ];\n\t#endif\n#endif\n",
shadowmap_vertex:"#ifdef USE_SHADOWMAP\n\t#if NUM_DIR_LIGHTS > 0\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n\t\tvDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * worldPosition;\n\t}\n\t#endif\n\t#if NUM_SPOT_LIGHTS > 0\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n\t\tvSpotShadowCoord[ i ] = spotShadowMatrix[ i ] * worldPosition;\n\t}\n\t#endif\n\t#if NUM_POINT_LIGHTS > 0\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n\t\tvPointShadowCoord[ i ] = pointShadowMatrix[ i ] * worldPosition;\n\t}\n\t#endif\n#endif\n",
shadowmask_pars_fragment:"float getShadowMask() {\n\tfloat shadow = 1.0;\n\t#ifdef USE_SHADOWMAP\n\t#if NUM_DIR_LIGHTS > 0\n\tDirectionalLight directionalLight;\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n\t\tdirectionalLight = directionalLights[ i ];\n\t\tshadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n\t}\n\t#endif\n\t#if NUM_SPOT_LIGHTS > 0\n\tSpotLight spotLight;\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n\t\tspotLight = spotLights[ i ];\n\t\tshadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;\n\t}\n\t#endif\n\t#if NUM_POINT_LIGHTS > 0\n\tPointLight pointLight;\n\t#pragma unroll_loop\n\tfor ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n\t\tpointLight = pointLights[ i ];\n\t\tshadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;\n\t}\n\t#endif\n\t#endif\n\treturn shadow;\n}\n",
skinbase_vertex:"#ifdef USE_SKINNING\n\tmat4 boneMatX = getBoneMatrix( skinIndex.x );\n\tmat4 boneMatY = getBoneMatrix( skinIndex.y );\n\tmat4 boneMatZ = getBoneMatrix( skinIndex.z );\n\tmat4 boneMatW = getBoneMatrix( skinIndex.w );\n#endif",skinning_pars_vertex:"#ifdef USE_SKINNING\n\tuniform mat4 bindMatrix;\n\tuniform mat4 bindMatrixInverse;\n\t#ifdef BONE_TEXTURE\n\t\tuniform sampler2D boneTexture;\n\t\tuniform int boneTextureSize;\n\t\tmat4 getBoneMatrix( const in float i ) {\n\t\t\tfloat j = i * 4.0;\n\t\t\tfloat x = mod( j, float( boneTextureSize ) );\n\t\t\tfloat y = floor( j / float( boneTextureSize ) );\n\t\t\tfloat dx = 1.0 / float( boneTextureSize );\n\t\t\tfloat dy = 1.0 / float( boneTextureSize );\n\t\t\ty = dy * ( y + 0.5 );\n\t\t\tvec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );\n\t\t\tvec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );\n\t\t\tvec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );\n\t\t\tvec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );\n\t\t\tmat4 bone = mat4( v1, v2, v3, v4 );\n\t\t\treturn bone;\n\t\t}\n\t#else\n\t\tuniform mat4 boneMatrices[ MAX_BONES ];\n\t\tmat4 getBoneMatrix( const in float i ) {\n\t\t\tmat4 bone = boneMatrices[ int(i) ];\n\t\t\treturn bone;\n\t\t}\n\t#endif\n#endif\n",
skinning_vertex:"#ifdef USE_SKINNING\n\tvec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );\n\tvec4 skinned = vec4( 0.0 );\n\tskinned += boneMatX * skinVertex * skinWeight.x;\n\tskinned += boneMatY * skinVertex * skinWeight.y;\n\tskinned += boneMatZ * skinVertex * skinWeight.z;\n\tskinned += boneMatW * skinVertex * skinWeight.w;\n\ttransformed = ( bindMatrixInverse * skinned ).xyz;\n#endif\n",skinnormal_vertex:"#ifdef USE_SKINNING\n\tmat4 skinMatrix = mat4( 0.0 );\n\tskinMatrix += skinWeight.x * boneMatX;\n\tskinMatrix += skinWeight.y * boneMatY;\n\tskinMatrix += skinWeight.z * boneMatZ;\n\tskinMatrix += skinWeight.w * boneMatW;\n\tskinMatrix  = bindMatrixInverse * skinMatrix * bindMatrix;\n\tobjectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;\n#endif\n",
specularmap_fragment:"float specularStrength;\n#ifdef USE_SPECULARMAP\n\tvec4 texelSpecular = texture2D( specularMap, vUv );\n\tspecularStrength = texelSpecular.r;\n#else\n\tspecularStrength = 1.0;\n#endif",specularmap_pars_fragment:"#ifdef USE_SPECULARMAP\n\tuniform sampler2D specularMap;\n#endif",tonemapping_fragment:"#if defined( TONE_MAPPING )\n  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );\n#endif\n",tonemapping_pars_fragment:"#ifndef saturate\n\t#define saturate(a) clamp( a, 0.0, 1.0 )\n#endif\nuniform float toneMappingExposure;\nuniform float toneMappingWhitePoint;\nvec3 LinearToneMapping( vec3 color ) {\n\treturn toneMappingExposure * color;\n}\nvec3 ReinhardToneMapping( vec3 color ) {\n\tcolor *= toneMappingExposure;\n\treturn saturate( color / ( vec3( 1.0 ) + color ) );\n}\n#define Uncharted2Helper( x ) max( ( ( x * ( 0.15 * x + 0.10 * 0.50 ) + 0.20 * 0.02 ) / ( x * ( 0.15 * x + 0.50 ) + 0.20 * 0.30 ) ) - 0.02 / 0.30, vec3( 0.0 ) )\nvec3 Uncharted2ToneMapping( vec3 color ) {\n\tcolor *= toneMappingExposure;\n\treturn saturate( Uncharted2Helper( color ) / Uncharted2Helper( vec3( toneMappingWhitePoint ) ) );\n}\nvec3 OptimizedCineonToneMapping( vec3 color ) {\n\tcolor *= toneMappingExposure;\n\tcolor = max( vec3( 0.0 ), color - 0.004 );\n\treturn pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );\n}\n",
uv_pars_fragment:"#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )\n\tvarying vec2 vUv;\n#endif",uv_pars_vertex:"#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )\n\tvarying vec2 vUv;\n\tuniform mat3 uvTransform;\n#endif\n",
uv_vertex:"#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )\n\tvUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n#endif",uv2_pars_fragment:"#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n\tvarying vec2 vUv2;\n#endif",uv2_pars_vertex:"#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n\tattribute vec2 uv2;\n\tvarying vec2 vUv2;\n#endif",
uv2_vertex:"#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n\tvUv2 = uv2;\n#endif",worldpos_vertex:"#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )\n\tvec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );\n#endif\n",cube_frag:"uniform samplerCube tCube;\nuniform float tFlip;\nuniform float opacity;\nvarying vec3 vWorldPosition;\nvoid main() {\n\tgl_FragColor = textureCube( tCube, vec3( tFlip * vWorldPosition.x, vWorldPosition.yz ) );\n\tgl_FragColor.a *= opacity;\n}\n",
cube_vert:"varying vec3 vWorldPosition;\n#include <common>\nvoid main() {\n\tvWorldPosition = transformDirection( position, modelMatrix );\n\t#include <begin_vertex>\n\t#include <project_vertex>\n\tgl_Position.z = gl_Position.w;\n}\n",depth_frag:"#if DEPTH_PACKING == 3200\n\tuniform float opacity;\n#endif\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n\t#include <clipping_planes_fragment>\n\tvec4 diffuseColor = vec4( 1.0 );\n\t#if DEPTH_PACKING == 3200\n\t\tdiffuseColor.a = opacity;\n\t#endif\n\t#include <map_fragment>\n\t#include <alphamap_fragment>\n\t#include <alphatest_fragment>\n\t#include <logdepthbuf_fragment>\n\t#if DEPTH_PACKING == 3200\n\t\tgl_FragColor = vec4( vec3( 1.0 - gl_FragCoord.z ), opacity );\n\t#elif DEPTH_PACKING == 3201\n\t\tgl_FragColor = packDepthToRGBA( gl_FragCoord.z );\n\t#endif\n}\n",
depth_vert:"#include <common>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n\t#include <uv_vertex>\n\t#include <skinbase_vertex>\n\t#ifdef USE_DISPLACEMENTMAP\n\t\t#include <beginnormal_vertex>\n\t\t#include <morphnormal_vertex>\n\t\t#include <skinnormal_vertex>\n\t#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <displacementmap_vertex>\n\t#include <project_vertex>\n\t#include <logdepthbuf_vertex>\n\t#include <clipping_planes_vertex>\n}\n",
distanceRGBA_frag:"#define DISTANCE\nuniform vec3 referencePosition;\nuniform float nearDistance;\nuniform float farDistance;\nvarying vec3 vWorldPosition;\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main () {\n\t#include <clipping_planes_fragment>\n\tvec4 diffuseColor = vec4( 1.0 );\n\t#include <map_fragment>\n\t#include <alphamap_fragment>\n\t#include <alphatest_fragment>\n\tfloat dist = length( vWorldPosition - referencePosition );\n\tdist = ( dist - nearDistance ) / ( farDistance - nearDistance );\n\tdist = saturate( dist );\n\tgl_FragColor = packDepthToRGBA( dist );\n}\n",
distanceRGBA_vert:"#define DISTANCE\nvarying vec3 vWorldPosition;\n#include <common>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n\t#include <uv_vertex>\n\t#include <skinbase_vertex>\n\t#ifdef USE_DISPLACEMENTMAP\n\t\t#include <beginnormal_vertex>\n\t\t#include <morphnormal_vertex>\n\t\t#include <skinnormal_vertex>\n\t#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <displacementmap_vertex>\n\t#include <project_vertex>\n\t#include <worldpos_vertex>\n\t#include <clipping_planes_vertex>\n\tvWorldPosition = worldPosition.xyz;\n}\n",
equirect_frag:"uniform sampler2D tEquirect;\nvarying vec3 vWorldPosition;\n#include <common>\nvoid main() {\n\tvec3 direction = normalize( vWorldPosition );\n\tvec2 sampleUV;\n\tsampleUV.y = asin( clamp( direction.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;\n\tsampleUV.x = atan( direction.z, direction.x ) * RECIPROCAL_PI2 + 0.5;\n\tgl_FragColor = texture2D( tEquirect, sampleUV );\n}\n",equirect_vert:"varying vec3 vWorldPosition;\n#include <common>\nvoid main() {\n\tvWorldPosition = transformDirection( position, modelMatrix );\n\t#include <begin_vertex>\n\t#include <project_vertex>\n}\n",
linedashed_frag:"uniform vec3 diffuse;\nuniform float opacity;\nuniform float dashSize;\nuniform float totalSize;\nvarying float vLineDistance;\n#include <common>\n#include <color_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n\t#include <clipping_planes_fragment>\n\tif ( mod( vLineDistance, totalSize ) > dashSize ) {\n\t\tdiscard;\n\t}\n\tvec3 outgoingLight = vec3( 0.0 );\n\tvec4 diffuseColor = vec4( diffuse, opacity );\n\t#include <logdepthbuf_fragment>\n\t#include <color_fragment>\n\toutgoingLight = diffuseColor.rgb;\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );\n\t#include <premultiplied_alpha_fragment>\n\t#include <tonemapping_fragment>\n\t#include <encodings_fragment>\n\t#include <fog_fragment>\n}\n",
linedashed_vert:"uniform float scale;\nattribute float lineDistance;\nvarying float vLineDistance;\n#include <common>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n\t#include <color_vertex>\n\tvLineDistance = scale * lineDistance;\n\tvec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n\tgl_Position = projectionMatrix * mvPosition;\n\t#include <logdepthbuf_vertex>\n\t#include <clipping_planes_vertex>\n\t#include <fog_vertex>\n}\n",
meshbasic_frag:"uniform vec3 diffuse;\nuniform float opacity;\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n#endif\n#include <common>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <uv2_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n\t#include <clipping_planes_fragment>\n\tvec4 diffuseColor = vec4( diffuse, opacity );\n\t#include <logdepthbuf_fragment>\n\t#include <map_fragment>\n\t#include <color_fragment>\n\t#include <alphamap_fragment>\n\t#include <alphatest_fragment>\n\t#include <specularmap_fragment>\n\tReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n\t#ifdef USE_LIGHTMAP\n\t\treflectedLight.indirectDiffuse += texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;\n\t#else\n\t\treflectedLight.indirectDiffuse += vec3( 1.0 );\n\t#endif\n\t#include <aomap_fragment>\n\treflectedLight.indirectDiffuse *= diffuseColor.rgb;\n\tvec3 outgoingLight = reflectedLight.indirectDiffuse;\n\t#include <envmap_fragment>\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );\n\t#include <premultiplied_alpha_fragment>\n\t#include <tonemapping_fragment>\n\t#include <encodings_fragment>\n\t#include <fog_fragment>\n}\n",
meshbasic_vert:"#include <common>\n#include <uv_pars_vertex>\n#include <uv2_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n\t#include <uv_vertex>\n\t#include <uv2_vertex>\n\t#include <color_vertex>\n\t#include <skinbase_vertex>\n\t#ifdef USE_ENVMAP\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n\t#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <project_vertex>\n\t#include <logdepthbuf_vertex>\n\t#include <worldpos_vertex>\n\t#include <clipping_planes_vertex>\n\t#include <envmap_vertex>\n\t#include <fog_vertex>\n}\n",
meshlambert_frag:"uniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\nvarying vec3 vLightFront;\n#ifdef DOUBLE_SIDED\n\tvarying vec3 vLightBack;\n#endif\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <uv2_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <envmap_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <fog_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n\t#include <clipping_planes_fragment>\n\tvec4 diffuseColor = vec4( diffuse, opacity );\n\tReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n\tvec3 totalEmissiveRadiance = emissive;\n\t#include <logdepthbuf_fragment>\n\t#include <map_fragment>\n\t#include <color_fragment>\n\t#include <alphamap_fragment>\n\t#include <alphatest_fragment>\n\t#include <specularmap_fragment>\n\t#include <emissivemap_fragment>\n\treflectedLight.indirectDiffuse = getAmbientLightIrradiance( ambientLightColor );\n\t#include <lightmap_fragment>\n\treflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );\n\t#ifdef DOUBLE_SIDED\n\t\treflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;\n\t#else\n\t\treflectedLight.directDiffuse = vLightFront;\n\t#endif\n\treflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();\n\t#include <aomap_fragment>\n\tvec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n\t#include <envmap_fragment>\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );\n\t#include <tonemapping_fragment>\n\t#include <encodings_fragment>\n\t#include <fog_fragment>\n\t#include <premultiplied_alpha_fragment>\n\t#include <dithering_fragment>\n}\n",
meshlambert_vert:"#define LAMBERT\nvarying vec3 vLightFront;\n#ifdef DOUBLE_SIDED\n\tvarying vec3 vLightBack;\n#endif\n#include <common>\n#include <uv_pars_vertex>\n#include <uv2_pars_vertex>\n#include <envmap_pars_vertex>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n\t#include <uv_vertex>\n\t#include <uv2_vertex>\n\t#include <color_vertex>\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinbase_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <project_vertex>\n\t#include <logdepthbuf_vertex>\n\t#include <clipping_planes_vertex>\n\t#include <worldpos_vertex>\n\t#include <envmap_vertex>\n\t#include <lights_lambert_vertex>\n\t#include <shadowmap_vertex>\n\t#include <fog_vertex>\n}\n",
meshphong_frag:"#define PHONG\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform vec3 specular;\nuniform float shininess;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <uv2_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <envmap_pars_fragment>\n#include <gradientmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <lights_phong_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n\t#include <clipping_planes_fragment>\n\tvec4 diffuseColor = vec4( diffuse, opacity );\n\tReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n\tvec3 totalEmissiveRadiance = emissive;\n\t#include <logdepthbuf_fragment>\n\t#include <map_fragment>\n\t#include <color_fragment>\n\t#include <alphamap_fragment>\n\t#include <alphatest_fragment>\n\t#include <specularmap_fragment>\n\t#include <normal_fragment_begin>\n\t#include <normal_fragment_maps>\n\t#include <emissivemap_fragment>\n\t#include <lights_phong_fragment>\n\t#include <lights_fragment_begin>\n\t#include <lights_fragment_maps>\n\t#include <lights_fragment_end>\n\t#include <aomap_fragment>\n\tvec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;\n\t#include <envmap_fragment>\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );\n\t#include <tonemapping_fragment>\n\t#include <encodings_fragment>\n\t#include <fog_fragment>\n\t#include <premultiplied_alpha_fragment>\n\t#include <dithering_fragment>\n}\n",
meshphong_vert:"#define PHONG\nvarying vec3 vViewPosition;\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n#endif\n#include <common>\n#include <uv_pars_vertex>\n#include <uv2_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n\t#include <uv_vertex>\n\t#include <uv2_vertex>\n\t#include <color_vertex>\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinbase_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n#ifndef FLAT_SHADED\n\tvNormal = normalize( transformedNormal );\n#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <displacementmap_vertex>\n\t#include <project_vertex>\n\t#include <logdepthbuf_vertex>\n\t#include <clipping_planes_vertex>\n\tvViewPosition = - mvPosition.xyz;\n\t#include <worldpos_vertex>\n\t#include <envmap_vertex>\n\t#include <shadowmap_vertex>\n\t#include <fog_vertex>\n}\n",
meshphysical_frag:"#define PHYSICAL\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float roughness;\nuniform float metalness;\nuniform float opacity;\n#ifndef STANDARD\n\tuniform float clearCoat;\n\tuniform float clearCoatRoughness;\n#endif\nvarying vec3 vViewPosition;\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n#endif\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <uv2_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <cube_uv_reflection_fragment>\n#include <lights_pars_begin>\n#include <lights_pars_maps>\n#include <lights_physical_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <roughnessmap_pars_fragment>\n#include <metalnessmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n\t#include <clipping_planes_fragment>\n\tvec4 diffuseColor = vec4( diffuse, opacity );\n\tReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n\tvec3 totalEmissiveRadiance = emissive;\n\t#include <logdepthbuf_fragment>\n\t#include <map_fragment>\n\t#include <color_fragment>\n\t#include <alphamap_fragment>\n\t#include <alphatest_fragment>\n\t#include <roughnessmap_fragment>\n\t#include <metalnessmap_fragment>\n\t#include <normal_fragment_begin>\n\t#include <normal_fragment_maps>\n\t#include <emissivemap_fragment>\n\t#include <lights_physical_fragment>\n\t#include <lights_fragment_begin>\n\t#include <lights_fragment_maps>\n\t#include <lights_fragment_end>\n\t#include <aomap_fragment>\n\tvec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );\n\t#include <tonemapping_fragment>\n\t#include <encodings_fragment>\n\t#include <fog_fragment>\n\t#include <premultiplied_alpha_fragment>\n\t#include <dithering_fragment>\n}\n",
meshphysical_vert:"#define PHYSICAL\nvarying vec3 vViewPosition;\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n#endif\n#include <common>\n#include <uv_pars_vertex>\n#include <uv2_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n\t#include <uv_vertex>\n\t#include <uv2_vertex>\n\t#include <color_vertex>\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinbase_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n#ifndef FLAT_SHADED\n\tvNormal = normalize( transformedNormal );\n#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <displacementmap_vertex>\n\t#include <project_vertex>\n\t#include <logdepthbuf_vertex>\n\t#include <clipping_planes_vertex>\n\tvViewPosition = - mvPosition.xyz;\n\t#include <worldpos_vertex>\n\t#include <shadowmap_vertex>\n\t#include <fog_vertex>\n}\n",
normal_frag:"#define NORMAL\nuniform float opacity;\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || ( defined( USE_NORMALMAP ) && ! defined( OBJECTSPACE_NORMALMAP ) )\n\tvarying vec3 vViewPosition;\n#endif\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n#endif\n#include <packing>\n#include <uv_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\nvoid main() {\n\t#include <logdepthbuf_fragment>\n\t#include <normal_fragment_begin>\n\t#include <normal_fragment_maps>\n\tgl_FragColor = vec4( packNormalToRGB( normal ), opacity );\n}\n",
normal_vert:"#define NORMAL\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || ( defined( USE_NORMALMAP ) && ! defined( OBJECTSPACE_NORMALMAP ) )\n\tvarying vec3 vViewPosition;\n#endif\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n#endif\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\nvoid main() {\n\t#include <uv_vertex>\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinbase_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n#ifndef FLAT_SHADED\n\tvNormal = normalize( transformedNormal );\n#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <displacementmap_vertex>\n\t#include <project_vertex>\n\t#include <logdepthbuf_vertex>\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || ( defined( USE_NORMALMAP ) && ! defined( OBJECTSPACE_NORMALMAP ) )\n\tvViewPosition = - mvPosition.xyz;\n#endif\n}\n",
points_frag:"uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <color_pars_fragment>\n#include <map_particle_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n\t#include <clipping_planes_fragment>\n\tvec3 outgoingLight = vec3( 0.0 );\n\tvec4 diffuseColor = vec4( diffuse, opacity );\n\t#include <logdepthbuf_fragment>\n\t#include <map_particle_fragment>\n\t#include <color_fragment>\n\t#include <alphatest_fragment>\n\toutgoingLight = diffuseColor.rgb;\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );\n\t#include <premultiplied_alpha_fragment>\n\t#include <tonemapping_fragment>\n\t#include <encodings_fragment>\n\t#include <fog_fragment>\n}\n",
points_vert:"uniform float size;\nuniform float scale;\n#include <common>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n\t#include <color_vertex>\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <project_vertex>\n\t#ifdef USE_SIZEATTENUATION\n\t\tgl_PointSize = size * ( scale / - mvPosition.z );\n\t#else\n\t\tgl_PointSize = size;\n\t#endif\n\t#include <logdepthbuf_vertex>\n\t#include <clipping_planes_vertex>\n\t#include <worldpos_vertex>\n\t#include <fog_vertex>\n}\n",
shadow_frag:"uniform vec3 color;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>\nvoid main() {\n\tgl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );\n\t#include <fog_fragment>\n}\n",shadow_vert:"#include <fog_pars_vertex>\n#include <shadowmap_pars_vertex>\nvoid main() {\n\t#include <begin_vertex>\n\t#include <project_vertex>\n\t#include <worldpos_vertex>\n\t#include <shadowmap_vertex>\n\t#include <fog_vertex>\n}\n"},
Ba={merge:function(a){for(var b={},c=0;c<a.length;c++){var d=this.clone(a[c]),e;for(e in d)b[e]=d[e]}return b},clone:function(a){var b={},c;for(c in a){b[c]={};for(var d in a[c]){var e=a[c][d];e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture)?b[c][d]=e.clone():Array.isArray(e)?b[c][d]=e.slice():b[c][d]=e}}return b}},Tg={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,
blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,
darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,
lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,
mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,
rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};Object.assign(G.prototype,
{isColor:!0,r:1,g:1,b:1,set:function(a){a&&a.isColor?this.copy(a):"number"===typeof a?this.setHex(a):"string"===typeof a&&this.setStyle(a);return this},setScalar:function(a){this.b=this.g=this.r=a;return this},setHex:function(a){a=Math.floor(a);this.r=(a>>16&255)/255;this.g=(a>>8&255)/255;this.b=(a&255)/255;return this},setRGB:function(a,b,c){this.r=a;this.g=b;this.b=c;return this},setHSL:function(){function a(a,c,d){0>d&&(d+=1);1<d&&--d;return d<1/6?a+6*(c-a)*d:.5>d?c:d<2/3?a+6*(c-a)*(2/3-d):a}return function(b,
c,d){b=J.euclideanModulo(b,1);c=J.clamp(c,0,1);d=J.clamp(d,0,1);0===c?this.r=this.g=this.b=d:(c=.5>=d?d*(1+c):d+c-d*c,d=2*d-c,this.r=a(d,c,b+1/3),this.g=a(d,c,b),this.b=a(d,c,b-1/3));return this}}(),setStyle:function(a){function b(b){void 0!==b&&1>parseFloat(b)&&console.warn("THREE.Color: Alpha component of "+a+" will be ignored.")}var c;if(c=/^((?:rgb|hsl)a?)\(\s*([^\)]*)\)/.exec(a)){var d=c[2];switch(c[1]){case "rgb":case "rgba":if(c=/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(d))return this.r=
Math.min(255,parseInt(c[1],10))/255,this.g=Math.min(255,parseInt(c[2],10))/255,this.b=Math.min(255,parseInt(c[3],10))/255,b(c[5]),this;if(c=/^(\d+)%\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(d))return this.r=Math.min(100,parseInt(c[1],10))/100,this.g=Math.min(100,parseInt(c[2],10))/100,this.b=Math.min(100,parseInt(c[3],10))/100,b(c[5]),this;break;case "hsl":case "hsla":if(c=/^([0-9]*\.?[0-9]+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(d)){d=parseFloat(c[1])/
360;var e=parseInt(c[2],10)/100,f=parseInt(c[3],10)/100;b(c[5]);return this.setHSL(d,e,f)}}}else if(c=/^#([A-Fa-f0-9]+)$/.exec(a)){c=c[1];d=c.length;if(3===d)return this.r=parseInt(c.charAt(0)+c.charAt(0),16)/255,this.g=parseInt(c.charAt(1)+c.charAt(1),16)/255,this.b=parseInt(c.charAt(2)+c.charAt(2),16)/255,this;if(6===d)return this.r=parseInt(c.charAt(0)+c.charAt(1),16)/255,this.g=parseInt(c.charAt(2)+c.charAt(3),16)/255,this.b=parseInt(c.charAt(4)+c.charAt(5),16)/255,this}a&&0<a.length&&(c=Tg[a],
void 0!==c?this.setHex(c):console.warn("THREE.Color: Unknown color "+a));return this},clone:function(){return new this.constructor(this.r,this.g,this.b)},copy:function(a){this.r=a.r;this.g=a.g;this.b=a.b;return this},copyGammaToLinear:function(a,b){void 0===b&&(b=2);this.r=Math.pow(a.r,b);this.g=Math.pow(a.g,b);this.b=Math.pow(a.b,b);return this},copyLinearToGamma:function(a,b){void 0===b&&(b=2);b=0<b?1/b:1;this.r=Math.pow(a.r,b);this.g=Math.pow(a.g,b);this.b=Math.pow(a.b,b);return this},convertGammaToLinear:function(a){this.copyGammaToLinear(this,
a);return this},convertLinearToGamma:function(a){this.copyLinearToGamma(this,a);return this},copySRGBToLinear:function(){function a(a){return.04045>a?.0773993808*a:Math.pow(.9478672986*a+.0521327014,2.4)}return function(b){this.r=a(b.r);this.g=a(b.g);this.b=a(b.b);return this}}(),copyLinearToSRGB:function(){function a(a){return.0031308>a?12.92*a:1.055*Math.pow(a,.41666)-.055}return function(b){this.r=a(b.r);this.g=a(b.g);this.b=a(b.b);return this}}(),convertSRGBToLinear:function(){this.copySRGBToLinear(this);
return this},convertLinearToSRGB:function(){this.copyLinearToSRGB(this);return this},getHex:function(){return 255*this.r<<16^255*this.g<<8^255*this.b<<0},getHexString:function(){return("000000"+this.getHex().toString(16)).slice(-6)},getHSL:function(a){void 0===a&&(console.warn("THREE.Color: .getHSL() target is now required"),a={h:0,s:0,l:0});var b=this.r,c=this.g,d=this.b,e=Math.max(b,c,d),f=Math.min(b,c,d),g,h=(f+e)/2;if(f===e)f=g=0;else{var l=e-f;f=.5>=h?l/(e+f):l/(2-e-f);switch(e){case b:g=(c-
d)/l+(c<d?6:0);break;case c:g=(d-b)/l+2;break;case d:g=(b-c)/l+4}g/=6}a.h=g;a.s=f;a.l=h;return a},getStyle:function(){return"rgb("+(255*this.r|0)+","+(255*this.g|0)+","+(255*this.b|0)+")"},offsetHSL:function(){var a={};return function(b,c,d){this.getHSL(a);a.h+=b;a.s+=c;a.l+=d;this.setHSL(a.h,a.s,a.l);return this}}(),add:function(a){this.r+=a.r;this.g+=a.g;this.b+=a.b;return this},addColors:function(a,b){this.r=a.r+b.r;this.g=a.g+b.g;this.b=a.b+b.b;return this},addScalar:function(a){this.r+=a;this.g+=
a;this.b+=a;return this},sub:function(a){this.r=Math.max(0,this.r-a.r);this.g=Math.max(0,this.g-a.g);this.b=Math.max(0,this.b-a.b);return this},multiply:function(a){this.r*=a.r;this.g*=a.g;this.b*=a.b;return this},multiplyScalar:function(a){this.r*=a;this.g*=a;this.b*=a;return this},lerp:function(a,b){this.r+=(a.r-this.r)*b;this.g+=(a.g-this.g)*b;this.b+=(a.b-this.b)*b;return this},equals:function(a){return a.r===this.r&&a.g===this.g&&a.b===this.b},fromArray:function(a,b){void 0===b&&(b=0);this.r=
a[b];this.g=a[b+1];this.b=a[b+2];return this},toArray:function(a,b){void 0===a&&(a=[]);void 0===b&&(b=0);a[b]=this.r;a[b+1]=this.g;a[b+2]=this.b;return a},toJSON:function(){return this.getHex()}});var K={common:{diffuse:{value:new G(15658734)},opacity:{value:1},map:{value:null},uvTransform:{value:new la},alphaMap:{value:null}},specularmap:{specularMap:{value:null}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},refractionRatio:{value:.98},maxMipLevel:{value:0}},aomap:{aoMap:{value:null},
aoMapIntensity:{value:1}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1}},emissivemap:{emissiveMap:{value:null}},bumpmap:{bumpMap:{value:null},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalScale:{value:new B(1,1)}},displacementmap:{displacementMap:{value:null},displacementScale:{value:1},displacementBias:{value:0}},roughnessmap:{roughnessMap:{value:null}},metalnessmap:{metalnessMap:{value:null}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:2.5E-4},fogNear:{value:1},
fogFar:{value:2E3},fogColor:{value:new G(16777215)}},lights:{ambientLightColor:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{},shadow:{},shadowBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{},shadow:{},shadowBias:{},shadowRadius:{},shadowMapSize:{}}},spotShadowMap:{value:[]},spotShadowMatrix:{value:[]},
pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{},shadow:{},shadowBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}}},points:{diffuse:{value:new G(15658734)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},uvTransform:{value:new la}}},
tb={basic:{uniforms:Ba.merge([K.common,K.specularmap,K.envmap,K.aomap,K.lightmap,K.fog]),vertexShader:S.meshbasic_vert,fragmentShader:S.meshbasic_frag},lambert:{uniforms:Ba.merge([K.common,K.specularmap,K.envmap,K.aomap,K.lightmap,K.emissivemap,K.fog,K.lights,{emissive:{value:new G(0)}}]),vertexShader:S.meshlambert_vert,fragmentShader:S.meshlambert_frag},phong:{uniforms:Ba.merge([K.common,K.specularmap,K.envmap,K.aomap,K.lightmap,K.emissivemap,K.bumpmap,K.normalmap,K.displacementmap,K.gradientmap,
K.fog,K.lights,{emissive:{value:new G(0)},specular:{value:new G(1118481)},shininess:{value:30}}]),vertexShader:S.meshphong_vert,fragmentShader:S.meshphong_frag},standard:{uniforms:Ba.merge([K.common,K.envmap,K.aomap,K.lightmap,K.emissivemap,K.bumpmap,K.normalmap,K.displacementmap,K.roughnessmap,K.metalnessmap,K.fog,K.lights,{emissive:{value:new G(0)},roughness:{value:.5},metalness:{value:.5},envMapIntensity:{value:1}}]),vertexShader:S.meshphysical_vert,fragmentShader:S.meshphysical_frag},points:{uniforms:Ba.merge([K.points,
K.fog]),vertexShader:S.points_vert,fragmentShader:S.points_frag},dashed:{uniforms:Ba.merge([K.common,K.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:S.linedashed_vert,fragmentShader:S.linedashed_frag},depth:{uniforms:Ba.merge([K.common,K.displacementmap]),vertexShader:S.depth_vert,fragmentShader:S.depth_frag},normal:{uniforms:Ba.merge([K.common,K.bumpmap,K.normalmap,K.displacementmap,{opacity:{value:1}}]),vertexShader:S.normal_vert,fragmentShader:S.normal_frag},cube:{uniforms:{tCube:{value:null},
tFlip:{value:-1},opacity:{value:1}},vertexShader:S.cube_vert,fragmentShader:S.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:S.equirect_vert,fragmentShader:S.equirect_frag},distanceRGBA:{uniforms:Ba.merge([K.common,K.displacementmap,{referencePosition:{value:new p},nearDistance:{value:1},farDistance:{value:1E3}}]),vertexShader:S.distanceRGBA_vert,fragmentShader:S.distanceRGBA_frag},shadow:{uniforms:Ba.merge([K.lights,K.fog,{color:{value:new G(0)},opacity:{value:1}}]),vertexShader:S.shadow_vert,
fragmentShader:S.shadow_frag}};tb.physical={uniforms:Ba.merge([tb.standard.uniforms,{clearCoat:{value:0},clearCoatRoughness:{value:0}}]),vertexShader:S.meshphysical_vert,fragmentShader:S.meshphysical_frag};mb.RotationOrders="XYZ YZX ZXY XZY YXZ ZYX".split(" ");mb.DefaultOrder="XYZ";Object.defineProperties(mb.prototype,{x:{get:function(){return this._x},set:function(a){this._x=a;this.onChangeCallback()}},y:{get:function(){return this._y},set:function(a){this._y=a;this.onChangeCallback()}},z:{get:function(){return this._z},
set:function(a){this._z=a;this.onChangeCallback()}},order:{get:function(){return this._order},set:function(a){this._order=a;this.onChangeCallback()}}});Object.assign(mb.prototype,{isEuler:!0,set:function(a,b,c,d){this._x=a;this._y=b;this._z=c;this._order=d||this._order;this.onChangeCallback();return this},clone:function(){return new this.constructor(this._x,this._y,this._z,this._order)},copy:function(a){this._x=a._x;this._y=a._y;this._z=a._z;this._order=a._order;this.onChangeCallback();return this},
setFromRotationMatrix:function(a,b,c){var d=J.clamp,e=a.elements;a=e[0];var f=e[4],g=e[8],h=e[1],l=e[5],m=e[9],k=e[2],n=e[6];e=e[10];b=b||this._order;"XYZ"===b?(this._y=Math.asin(d(g,-1,1)),.99999>Math.abs(g)?(this._x=Math.atan2(-m,e),this._z=Math.atan2(-f,a)):(this._x=Math.atan2(n,l),this._z=0)):"YXZ"===b?(this._x=Math.asin(-d(m,-1,1)),.99999>Math.abs(m)?(this._y=Math.atan2(g,e),this._z=Math.atan2(h,l)):(this._y=Math.atan2(-k,a),this._z=0)):"ZXY"===b?(this._x=Math.asin(d(n,-1,1)),.99999>Math.abs(n)?
(this._y=Math.atan2(-k,e),this._z=Math.atan2(-f,l)):(this._y=0,this._z=Math.atan2(h,a))):"ZYX"===b?(this._y=Math.asin(-d(k,-1,1)),.99999>Math.abs(k)?(this._x=Math.atan2(n,e),this._z=Math.atan2(h,a)):(this._x=0,this._z=Math.atan2(-f,l))):"YZX"===b?(this._z=Math.asin(d(h,-1,1)),.99999>Math.abs(h)?(this._x=Math.atan2(-m,l),this._y=Math.atan2(-k,a)):(this._x=0,this._y=Math.atan2(g,e))):"XZY"===b?(this._z=Math.asin(-d(f,-1,1)),.99999>Math.abs(f)?(this._x=Math.atan2(n,l),this._y=Math.atan2(g,a)):(this._x=
Math.atan2(-m,e),this._y=0)):console.warn("THREE.Euler: .setFromRotationMatrix() given unsupported order: "+b);this._order=b;if(!1!==c)this.onChangeCallback();return this},setFromQuaternion:function(){var a=new R;return function(b,c,d){a.makeRotationFromQuaternion(b);return this.setFromRotationMatrix(a,c,d)}}(),setFromVector3:function(a,b){return this.set(a.x,a.y,a.z,b||this._order)},reorder:function(){var a=new ca;return function(b){a.setFromEuler(this);return this.setFromQuaternion(a,b)}}(),equals:function(a){return a._x===
this._x&&a._y===this._y&&a._z===this._z&&a._order===this._order},fromArray:function(a){this._x=a[0];this._y=a[1];this._z=a[2];void 0!==a[3]&&(this._order=a[3]);this.onChangeCallback();return this},toArray:function(a,b){void 0===a&&(a=[]);void 0===b&&(b=0);a[b]=this._x;a[b+1]=this._y;a[b+2]=this._z;a[b+3]=this._order;return a},toVector3:function(a){return a?a.set(this._x,this._y,this._z):new p(this._x,this._y,this._z)},onChange:function(a){this.onChangeCallback=a;return this},onChangeCallback:function(){}});
Object.assign(Wd.prototype,{set:function(a){this.mask=1<<a|0},enable:function(a){this.mask=this.mask|1<<a|0},toggle:function(a){this.mask^=1<<a|0},disable:function(a){this.mask&=~(1<<a|0)},test:function(a){return 0!==(this.mask&a.mask)}});var Hf=0;H.DefaultUp=new p(0,1,0);H.DefaultMatrixAutoUpdate=!0;H.prototype=Object.assign(Object.create(za.prototype),{constructor:H,isObject3D:!0,onBeforeRender:function(){},onAfterRender:function(){},applyMatrix:function(a){this.matrix.multiplyMatrices(a,this.matrix);
this.matrix.decompose(this.position,this.quaternion,this.scale)},applyQuaternion:function(a){this.quaternion.premultiply(a);return this},setRotationFromAxisAngle:function(a,b){this.quaternion.setFromAxisAngle(a,b)},setRotationFromEuler:function(a){this.quaternion.setFromEuler(a,!0)},setRotationFromMatrix:function(a){this.quaternion.setFromRotationMatrix(a)},setRotationFromQuaternion:function(a){this.quaternion.copy(a)},rotateOnAxis:function(){var a=new ca;return function(b,c){a.setFromAxisAngle(b,
c);this.quaternion.multiply(a);return this}}(),rotateOnWorldAxis:function(){var a=new ca;return function(b,c){a.setFromAxisAngle(b,c);this.quaternion.premultiply(a);return this}}(),rotateX:function(){var a=new p(1,0,0);return function(b){return this.rotateOnAxis(a,b)}}(),rotateY:function(){var a=new p(0,1,0);return function(b){return this.rotateOnAxis(a,b)}}(),rotateZ:function(){var a=new p(0,0,1);return function(b){return this.rotateOnAxis(a,b)}}(),translateOnAxis:function(){var a=new p;return function(b,
c){a.copy(b).applyQuaternion(this.quaternion);this.position.add(a.multiplyScalar(c));return this}}(),translateX:function(){var a=new p(1,0,0);return function(b){return this.translateOnAxis(a,b)}}(),translateY:function(){var a=new p(0,1,0);return function(b){return this.translateOnAxis(a,b)}}(),translateZ:function(){var a=new p(0,0,1);return function(b){return this.translateOnAxis(a,b)}}(),localToWorld:function(a){return a.applyMatrix4(this.matrixWorld)},worldToLocal:function(){var a=new R;return function(b){return b.applyMatrix4(a.getInverse(this.matrixWorld))}}(),
lookAt:function(){var a=new R,b=new p;return function(c,d,e){c.isVector3?b.copy(c):b.set(c,d,e);this.isCamera?a.lookAt(this.position,b,this.up):a.lookAt(b,this.position,this.up);this.quaternion.setFromRotationMatrix(a)}}(),add:function(a){if(1<arguments.length){for(var b=0;b<arguments.length;b++)this.add(arguments[b]);return this}if(a===this)return console.error("THREE.Object3D.add: object can't be added as a child of itself.",a),this;a&&a.isObject3D?(null!==a.parent&&a.parent.remove(a),a.parent=
this,a.dispatchEvent({type:"added"}),this.children.push(a)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",a);return this},remove:function(a){if(1<arguments.length){for(var b=0;b<arguments.length;b++)this.remove(arguments[b]);return this}b=this.children.indexOf(a);-1!==b&&(a.parent=null,a.dispatchEvent({type:"removed"}),this.children.splice(b,1));return this},getObjectById:function(a){return this.getObjectByProperty("id",a)},getObjectByName:function(a){return this.getObjectByProperty("name",
a)},getObjectByProperty:function(a,b){if(this[a]===b)return this;for(var c=0,d=this.children.length;c<d;c++){var e=this.children[c].getObjectByProperty(a,b);if(void 0!==e)return e}},getWorldPosition:function(a){void 0===a&&(console.warn("THREE.Object3D: .getWorldPosition() target is now required"),a=new p);this.updateMatrixWorld(!0);return a.setFromMatrixPosition(this.matrixWorld)},getWorldQuaternion:function(){var a=new p,b=new p;return function(c){void 0===c&&(console.warn("THREE.Object3D: .getWorldQuaternion() target is now required"),
c=new ca);this.updateMatrixWorld(!0);this.matrixWorld.decompose(a,c,b);return c}}(),getWorldScale:function(){var a=new p,b=new ca;return function(c){void 0===c&&(console.warn("THREE.Object3D: .getWorldScale() target is now required"),c=new p);this.updateMatrixWorld(!0);this.matrixWorld.decompose(a,b,c);return c}}(),getWorldDirection:function(){var a=new ca;return function(b){void 0===b&&(console.warn("THREE.Object3D: .getWorldDirection() target is now required"),b=new p);this.getWorldQuaternion(a);
return b.set(0,0,1).applyQuaternion(a)}}(),raycast:function(){},traverse:function(a){a(this);for(var b=this.children,c=0,d=b.length;c<d;c++)b[c].traverse(a)},traverseVisible:function(a){if(!1!==this.visible){a(this);for(var b=this.children,c=0,d=b.length;c<d;c++)b[c].traverseVisible(a)}},traverseAncestors:function(a){var b=this.parent;null!==b&&(a(b),b.traverseAncestors(a))},updateMatrix:function(){this.matrix.compose(this.position,this.quaternion,this.scale);this.matrixWorldNeedsUpdate=!0},updateMatrixWorld:function(a){this.matrixAutoUpdate&&
this.updateMatrix();if(this.matrixWorldNeedsUpdate||a)null===this.parent?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,a=!0;for(var b=this.children,c=0,d=b.length;c<d;c++)b[c].updateMatrixWorld(a)},toJSON:function(a){function b(b,c){void 0===b[c.uuid]&&(b[c.uuid]=c.toJSON(a));return c.uuid}function c(a){var b=[],c;for(c in a){var d=a[c];delete d.metadata;b.push(d)}return b}var d=void 0===a||"string"===typeof a,
e={};d&&(a={geometries:{},materials:{},textures:{},images:{},shapes:{}},e.metadata={version:4.5,type:"Object",generator:"Object3D.toJSON"});var f={};f.uuid=this.uuid;f.type=this.type;""!==this.name&&(f.name=this.name);!0===this.castShadow&&(f.castShadow=!0);!0===this.receiveShadow&&(f.receiveShadow=!0);!1===this.visible&&(f.visible=!1);!1===this.frustumCulled&&(f.frustumCulled=!1);0!==this.renderOrder&&(f.renderOrder=this.renderOrder);"{}"!==JSON.stringify(this.userData)&&(f.userData=this.userData);
f.layers=this.layers.mask;f.matrix=this.matrix.toArray();!1===this.matrixAutoUpdate&&(f.matrixAutoUpdate=!1);if(void 0!==this.geometry){f.geometry=b(a.geometries,this.geometry);var g=this.geometry.parameters;if(void 0!==g&&void 0!==g.shapes)if(g=g.shapes,Array.isArray(g))for(var h=0,l=g.length;h<l;h++)b(a.shapes,g[h]);else b(a.shapes,g)}if(void 0!==this.material)if(Array.isArray(this.material)){g=[];h=0;for(l=this.material.length;h<l;h++)g.push(b(a.materials,this.material[h]));f.material=g}else f.material=
b(a.materials,this.material);if(0<this.children.length)for(f.children=[],h=0;h<this.children.length;h++)f.children.push(this.children[h].toJSON(a).object);if(d){d=c(a.geometries);h=c(a.materials);l=c(a.textures);var m=c(a.images);g=c(a.shapes);0<d.length&&(e.geometries=d);0<h.length&&(e.materials=h);0<l.length&&(e.textures=l);0<m.length&&(e.images=m);0<g.length&&(e.shapes=g)}e.object=f;return e},clone:function(a){return(new this.constructor).copy(this,a)},copy:function(a,b){void 0===b&&(b=!0);this.name=
a.name;this.up.copy(a.up);this.position.copy(a.position);this.quaternion.copy(a.quaternion);this.scale.copy(a.scale);this.matrix.copy(a.matrix);this.matrixWorld.copy(a.matrixWorld);this.matrixAutoUpdate=a.matrixAutoUpdate;this.matrixWorldNeedsUpdate=a.matrixWorldNeedsUpdate;this.layers.mask=a.layers.mask;this.visible=a.visible;this.castShadow=a.castShadow;this.receiveShadow=a.receiveShadow;this.frustumCulled=a.frustumCulled;this.renderOrder=a.renderOrder;this.userData=JSON.parse(JSON.stringify(a.userData));
if(!0===b)for(b=0;b<a.children.length;b++)this.add(a.children[b].clone());return this}});Ra.prototype=Object.assign(Object.create(H.prototype),{constructor:Ra,isCamera:!0,copy:function(a,b){H.prototype.copy.call(this,a,b);this.matrixWorldInverse.copy(a.matrixWorldInverse);this.projectionMatrix.copy(a.projectionMatrix);return this},getWorldDirection:function(){var a=new ca;return function(b){void 0===b&&(console.warn("THREE.Camera: .getWorldDirection() target is now required"),b=new p);this.getWorldQuaternion(a);
return b.set(0,0,-1).applyQuaternion(a)}}(),updateMatrixWorld:function(a){H.prototype.updateMatrixWorld.call(this,a);this.matrixWorldInverse.getInverse(this.matrixWorld)},clone:function(){return(new this.constructor).copy(this)}});Mb.prototype=Object.assign(Object.create(Ra.prototype),{constructor:Mb,isOrthographicCamera:!0,copy:function(a,b){Ra.prototype.copy.call(this,a,b);this.left=a.left;this.right=a.right;this.top=a.top;this.bottom=a.bottom;this.near=a.near;this.far=a.far;this.zoom=a.zoom;this.view=
null===a.view?null:Object.assign({},a.view);return this},setViewOffset:function(a,b,c,d,e,f){null===this.view&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1});this.view.enabled=!0;this.view.fullWidth=a;this.view.fullHeight=b;this.view.offsetX=c;this.view.offsetY=d;this.view.width=e;this.view.height=f;this.updateProjectionMatrix()},clearViewOffset:function(){null!==this.view&&(this.view.enabled=!1);this.updateProjectionMatrix()},updateProjectionMatrix:function(){var a=
(this.right-this.left)/(2*this.zoom),b=(this.top-this.bottom)/(2*this.zoom),c=(this.right+this.left)/2,d=(this.top+this.bottom)/2,e=c-a;c+=a;a=d+b;b=d-b;if(null!==this.view&&this.view.enabled){c=this.zoom/(this.view.width/this.view.fullWidth);b=this.zoom/(this.view.height/this.view.fullHeight);var f=(this.right-this.left)/this.view.width;d=(this.top-this.bottom)/this.view.height;e+=this.view.offsetX/c*f;c=e+this.view.width/c*f;a-=this.view.offsetY/b*d;b=a-this.view.height/b*d}this.projectionMatrix.makeOrthographic(e,
c,a,b,this.near,this.far)},toJSON:function(a){a=H.prototype.toJSON.call(this,a);a.object.zoom=this.zoom;a.object.left=this.left;a.object.right=this.right;a.object.top=this.top;a.object.bottom=this.bottom;a.object.near=this.near;a.object.far=this.far;null!==this.view&&(a.object.view=Object.assign({},this.view));return a}});Object.assign(Ya.prototype,{clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.a=a.a;this.b=a.b;this.c=a.c;this.normal.copy(a.normal);this.color.copy(a.color);
this.materialIndex=a.materialIndex;for(var b=0,c=a.vertexNormals.length;b<c;b++)this.vertexNormals[b]=a.vertexNormals[b].clone();b=0;for(c=a.vertexColors.length;b<c;b++)this.vertexColors[b]=a.vertexColors[b].clone();return this}});var If=0;P.prototype=Object.assign(Object.create(za.prototype),{constructor:P,isGeometry:!0,applyMatrix:function(a){for(var b=(new la).getNormalMatrix(a),c=0,d=this.vertices.length;c<d;c++)this.vertices[c].applyMatrix4(a);c=0;for(d=this.faces.length;c<d;c++){a=this.faces[c];
a.normal.applyMatrix3(b).normalize();for(var e=0,f=a.vertexNormals.length;e<f;e++)a.vertexNormals[e].applyMatrix3(b).normalize()}null!==this.boundingBox&&this.computeBoundingBox();null!==this.boundingSphere&&this.computeBoundingSphere();this.normalsNeedUpdate=this.verticesNeedUpdate=!0;return this},rotateX:function(){var a=new R;return function(b){a.makeRotationX(b);this.applyMatrix(a);return this}}(),rotateY:function(){var a=new R;return function(b){a.makeRotationY(b);this.applyMatrix(a);return this}}(),
rotateZ:function(){var a=new R;return function(b){a.makeRotationZ(b);this.applyMatrix(a);return this}}(),translate:function(){var a=new R;return function(b,c,d){a.makeTranslation(b,c,d);this.applyMatrix(a);return this}}(),scale:function(){var a=new R;return function(b,c,d){a.makeScale(b,c,d);this.applyMatrix(a);return this}}(),lookAt:function(){var a=new H;return function(b){a.lookAt(b);a.updateMatrix();this.applyMatrix(a.matrix)}}(),fromBufferGeometry:function(a){function b(a,b,d,e){var f=void 0!==
g?[k[a].clone(),k[b].clone(),k[d].clone()]:[],q=void 0!==h?[c.colors[a].clone(),c.colors[b].clone(),c.colors[d].clone()]:[];e=new Ya(a,b,d,f,q,e);c.faces.push(e);void 0!==l&&c.faceVertexUvs[0].push([n[a].clone(),n[b].clone(),n[d].clone()]);void 0!==m&&c.faceVertexUvs[1].push([t[a].clone(),t[b].clone(),t[d].clone()])}var c=this,d=null!==a.index?a.index.array:void 0,e=a.attributes,f=e.position.array,g=void 0!==e.normal?e.normal.array:void 0,h=void 0!==e.color?e.color.array:void 0,l=void 0!==e.uv?e.uv.array:
void 0,m=void 0!==e.uv2?e.uv2.array:void 0;void 0!==m&&(this.faceVertexUvs[1]=[]);for(var k=[],n=[],t=[],q=e=0;e<f.length;e+=3,q+=2)c.vertices.push(new p(f[e],f[e+1],f[e+2])),void 0!==g&&k.push(new p(g[e],g[e+1],g[e+2])),void 0!==h&&c.colors.push(new G(h[e],h[e+1],h[e+2])),void 0!==l&&n.push(new B(l[q],l[q+1])),void 0!==m&&t.push(new B(m[q],m[q+1]));var r=a.groups;if(0<r.length)for(e=0;e<r.length;e++){f=r[e];var u=f.start,y=f.count;q=u;for(u+=y;q<u;q+=3)void 0!==d?b(d[q],d[q+1],d[q+2],f.materialIndex):
b(q,q+1,q+2,f.materialIndex)}else if(void 0!==d)for(e=0;e<d.length;e+=3)b(d[e],d[e+1],d[e+2]);else for(e=0;e<f.length/3;e+=3)b(e,e+1,e+2);this.computeFaceNormals();null!==a.boundingBox&&(this.boundingBox=a.boundingBox.clone());null!==a.boundingSphere&&(this.boundingSphere=a.boundingSphere.clone());return this},center:function(){var a=new p;return function(){this.computeBoundingBox();this.boundingBox.getCenter(a).negate();this.translate(a.x,a.y,a.z);return this}}(),normalize:function(){this.computeBoundingSphere();
var a=this.boundingSphere.center,b=this.boundingSphere.radius;b=0===b?1:1/b;var c=new R;c.set(b,0,0,-b*a.x,0,b,0,-b*a.y,0,0,b,-b*a.z,0,0,0,1);this.applyMatrix(c);return this},computeFaceNormals:function(){for(var a=new p,b=new p,c=0,d=this.faces.length;c<d;c++){var e=this.faces[c],f=this.vertices[e.a],g=this.vertices[e.b];a.subVectors(this.vertices[e.c],g);b.subVectors(f,g);a.cross(b);a.normalize();e.normal.copy(a)}},computeVertexNormals:function(a){void 0===a&&(a=!0);var b;var c=Array(this.vertices.length);
var d=0;for(b=this.vertices.length;d<b;d++)c[d]=new p;if(a){var e=new p,f=new p;a=0;for(d=this.faces.length;a<d;a++){b=this.faces[a];var g=this.vertices[b.a];var h=this.vertices[b.b];var l=this.vertices[b.c];e.subVectors(l,h);f.subVectors(g,h);e.cross(f);c[b.a].add(e);c[b.b].add(e);c[b.c].add(e)}}else for(this.computeFaceNormals(),a=0,d=this.faces.length;a<d;a++)b=this.faces[a],c[b.a].add(b.normal),c[b.b].add(b.normal),c[b.c].add(b.normal);d=0;for(b=this.vertices.length;d<b;d++)c[d].normalize();a=
0;for(d=this.faces.length;a<d;a++)b=this.faces[a],g=b.vertexNormals,3===g.length?(g[0].copy(c[b.a]),g[1].copy(c[b.b]),g[2].copy(c[b.c])):(g[0]=c[b.a].clone(),g[1]=c[b.b].clone(),g[2]=c[b.c].clone());0<this.faces.length&&(this.normalsNeedUpdate=!0)},computeFlatVertexNormals:function(){var a;this.computeFaceNormals();var b=0;for(a=this.faces.length;b<a;b++){var c=this.faces[b];var d=c.vertexNormals;3===d.length?(d[0].copy(c.normal),d[1].copy(c.normal),d[2].copy(c.normal)):(d[0]=c.normal.clone(),d[1]=
c.normal.clone(),d[2]=c.normal.clone())}0<this.faces.length&&(this.normalsNeedUpdate=!0)},computeMorphNormals:function(){var a,b;var c=0;for(b=this.faces.length;c<b;c++){var d=this.faces[c];d.__originalFaceNormal?d.__originalFaceNormal.copy(d.normal):d.__originalFaceNormal=d.normal.clone();d.__originalVertexNormals||(d.__originalVertexNormals=[]);var e=0;for(a=d.vertexNormals.length;e<a;e++)d.__originalVertexNormals[e]?d.__originalVertexNormals[e].copy(d.vertexNormals[e]):d.__originalVertexNormals[e]=
d.vertexNormals[e].clone()}var f=new P;f.faces=this.faces;e=0;for(a=this.morphTargets.length;e<a;e++){if(!this.morphNormals[e]){this.morphNormals[e]={};this.morphNormals[e].faceNormals=[];this.morphNormals[e].vertexNormals=[];d=this.morphNormals[e].faceNormals;var g=this.morphNormals[e].vertexNormals;c=0;for(b=this.faces.length;c<b;c++){var h=new p;var l={a:new p,b:new p,c:new p};d.push(h);g.push(l)}}g=this.morphNormals[e];f.vertices=this.morphTargets[e].vertices;f.computeFaceNormals();f.computeVertexNormals();
c=0;for(b=this.faces.length;c<b;c++)d=this.faces[c],h=g.faceNormals[c],l=g.vertexNormals[c],h.copy(d.normal),l.a.copy(d.vertexNormals[0]),l.b.copy(d.vertexNormals[1]),l.c.copy(d.vertexNormals[2])}c=0;for(b=this.faces.length;c<b;c++)d=this.faces[c],d.normal=d.__originalFaceNormal,d.vertexNormals=d.__originalVertexNormals},computeBoundingBox:function(){null===this.boundingBox&&(this.boundingBox=new Xa);this.boundingBox.setFromPoints(this.vertices)},computeBoundingSphere:function(){null===this.boundingSphere&&
(this.boundingSphere=new Ha);this.boundingSphere.setFromPoints(this.vertices)},merge:function(a,b,c){if(a&&a.isGeometry){var d,e=this.vertices.length,f=this.vertices,g=a.vertices,h=this.faces,l=a.faces,m=this.faceVertexUvs[0],k=a.faceVertexUvs[0],n=this.colors,p=a.colors;void 0===c&&(c=0);void 0!==b&&(d=(new la).getNormalMatrix(b));a=0;for(var q=g.length;a<q;a++){var r=g[a].clone();void 0!==b&&r.applyMatrix4(b);f.push(r)}a=0;for(q=p.length;a<q;a++)n.push(p[a].clone());a=0;for(q=l.length;a<q;a++){g=
l[a];var u=g.vertexNormals;p=g.vertexColors;n=new Ya(g.a+e,g.b+e,g.c+e);n.normal.copy(g.normal);void 0!==d&&n.normal.applyMatrix3(d).normalize();b=0;for(f=u.length;b<f;b++)r=u[b].clone(),void 0!==d&&r.applyMatrix3(d).normalize(),n.vertexNormals.push(r);n.color.copy(g.color);b=0;for(f=p.length;b<f;b++)r=p[b],n.vertexColors.push(r.clone());n.materialIndex=g.materialIndex+c;h.push(n)}a=0;for(q=k.length;a<q;a++)if(c=k[a],d=[],void 0!==c){b=0;for(f=c.length;b<f;b++)d.push(c[b].clone());m.push(d)}}else console.error("THREE.Geometry.merge(): geometry not an instance of THREE.Geometry.",
a)},mergeMesh:function(a){a&&a.isMesh?(a.matrixAutoUpdate&&a.updateMatrix(),this.merge(a.geometry,a.matrix)):console.error("THREE.Geometry.mergeMesh(): mesh not an instance of THREE.Mesh.",a)},mergeVertices:function(){var a={},b=[],c=[],d=Math.pow(10,4),e;var f=0;for(e=this.vertices.length;f<e;f++){var g=this.vertices[f];g=Math.round(g.x*d)+"_"+Math.round(g.y*d)+"_"+Math.round(g.z*d);void 0===a[g]?(a[g]=f,b.push(this.vertices[f]),c[f]=b.length-1):c[f]=c[a[g]]}a=[];f=0;for(e=this.faces.length;f<e;f++)for(d=
this.faces[f],d.a=c[d.a],d.b=c[d.b],d.c=c[d.c],d=[d.a,d.b,d.c],g=0;3>g;g++)if(d[g]===d[(g+1)%3]){a.push(f);break}for(f=a.length-1;0<=f;f--)for(d=a[f],this.faces.splice(d,1),c=0,e=this.faceVertexUvs.length;c<e;c++)this.faceVertexUvs[c].splice(d,1);f=this.vertices.length-b.length;this.vertices=b;return f},setFromPoints:function(a){this.vertices=[];for(var b=0,c=a.length;b<c;b++){var d=a[b];this.vertices.push(new p(d.x,d.y,d.z||0))}return this},sortFacesByMaterialIndex:function(){for(var a=this.faces,
b=a.length,c=0;c<b;c++)a[c]._id=c;a.sort(function(a,b){return a.materialIndex-b.materialIndex});var d=this.faceVertexUvs[0],e=this.faceVertexUvs[1],f,g;d&&d.length===b&&(f=[]);e&&e.length===b&&(g=[]);for(c=0;c<b;c++){var h=a[c]._id;f&&f.push(d[h]);g&&g.push(e[h])}f&&(this.faceVertexUvs[0]=f);g&&(this.faceVertexUvs[1]=g)},toJSON:function(){function a(a,b,c){return c?a|1<<b:a&~(1<<b)}function b(a){var b=a.x.toString()+a.y.toString()+a.z.toString();if(void 0!==m[b])return m[b];m[b]=l.length/3;l.push(a.x,
a.y,a.z);return m[b]}function c(a){var b=a.r.toString()+a.g.toString()+a.b.toString();if(void 0!==n[b])return n[b];n[b]=k.length;k.push(a.getHex());return n[b]}function d(a){var b=a.x.toString()+a.y.toString();if(void 0!==q[b])return q[b];q[b]=p.length/2;p.push(a.x,a.y);return q[b]}var e={metadata:{version:4.5,type:"Geometry",generator:"Geometry.toJSON"}};e.uuid=this.uuid;e.type=this.type;""!==this.name&&(e.name=this.name);if(void 0!==this.parameters){var f=this.parameters,g;for(g in f)void 0!==f[g]&&
(e[g]=f[g]);return e}f=[];for(g=0;g<this.vertices.length;g++){var h=this.vertices[g];f.push(h.x,h.y,h.z)}h=[];var l=[],m={},k=[],n={},p=[],q={};for(g=0;g<this.faces.length;g++){var r=this.faces[g],u=void 0!==this.faceVertexUvs[0][g],y=0<r.normal.length(),w=0<r.vertexNormals.length,x=1!==r.color.r||1!==r.color.g||1!==r.color.b,A=0<r.vertexColors.length,C=0;C=a(C,0,0);C=a(C,1,!0);C=a(C,2,!1);C=a(C,3,u);C=a(C,4,y);C=a(C,5,w);C=a(C,6,x);C=a(C,7,A);h.push(C);h.push(r.a,r.b,r.c);h.push(r.materialIndex);
u&&(u=this.faceVertexUvs[0][g],h.push(d(u[0]),d(u[1]),d(u[2])));y&&h.push(b(r.normal));w&&(y=r.vertexNormals,h.push(b(y[0]),b(y[1]),b(y[2])));x&&h.push(c(r.color));A&&(r=r.vertexColors,h.push(c(r[0]),c(r[1]),c(r[2])))}e.data={};e.data.vertices=f;e.data.normals=l;0<k.length&&(e.data.colors=k);0<p.length&&(e.data.uvs=[p]);e.data.faces=h;return e},clone:function(){return(new P).copy(this)},copy:function(a){var b,c,d;this.vertices=[];this.colors=[];this.faces=[];this.faceVertexUvs=[[]];this.morphTargets=
[];this.morphNormals=[];this.skinWeights=[];this.skinIndices=[];this.lineDistances=[];this.boundingSphere=this.boundingBox=null;this.name=a.name;var e=a.vertices;var f=0;for(b=e.length;f<b;f++)this.vertices.push(e[f].clone());e=a.colors;f=0;for(b=e.length;f<b;f++)this.colors.push(e[f].clone());e=a.faces;f=0;for(b=e.length;f<b;f++)this.faces.push(e[f].clone());f=0;for(b=a.faceVertexUvs.length;f<b;f++){var g=a.faceVertexUvs[f];void 0===this.faceVertexUvs[f]&&(this.faceVertexUvs[f]=[]);e=0;for(c=g.length;e<
c;e++){var h=g[e],l=[];var m=0;for(d=h.length;m<d;m++)l.push(h[m].clone());this.faceVertexUvs[f].push(l)}}m=a.morphTargets;f=0;for(b=m.length;f<b;f++){d={};d.name=m[f].name;if(void 0!==m[f].vertices)for(d.vertices=[],e=0,c=m[f].vertices.length;e<c;e++)d.vertices.push(m[f].vertices[e].clone());if(void 0!==m[f].normals)for(d.normals=[],e=0,c=m[f].normals.length;e<c;e++)d.normals.push(m[f].normals[e].clone());this.morphTargets.push(d)}m=a.morphNormals;f=0;for(b=m.length;f<b;f++){d={};if(void 0!==m[f].vertexNormals)for(d.vertexNormals=
[],e=0,c=m[f].vertexNormals.length;e<c;e++)g=m[f].vertexNormals[e],h={},h.a=g.a.clone(),h.b=g.b.clone(),h.c=g.c.clone(),d.vertexNormals.push(h);if(void 0!==m[f].faceNormals)for(d.faceNormals=[],e=0,c=m[f].faceNormals.length;e<c;e++)d.faceNormals.push(m[f].faceNormals[e].clone());this.morphNormals.push(d)}e=a.skinWeights;f=0;for(b=e.length;f<b;f++)this.skinWeights.push(e[f].clone());e=a.skinIndices;f=0;for(b=e.length;f<b;f++)this.skinIndices.push(e[f].clone());e=a.lineDistances;f=0;for(b=e.length;f<
b;f++)this.lineDistances.push(e[f]);f=a.boundingBox;null!==f&&(this.boundingBox=f.clone());f=a.boundingSphere;null!==f&&(this.boundingSphere=f.clone());this.elementsNeedUpdate=a.elementsNeedUpdate;this.verticesNeedUpdate=a.verticesNeedUpdate;this.uvsNeedUpdate=a.uvsNeedUpdate;this.normalsNeedUpdate=a.normalsNeedUpdate;this.colorsNeedUpdate=a.colorsNeedUpdate;this.lineDistancesNeedUpdate=a.lineDistancesNeedUpdate;this.groupsNeedUpdate=a.groupsNeedUpdate;return this},dispose:function(){this.dispatchEvent({type:"dispose"})}});
Object.defineProperty(L.prototype,"needsUpdate",{set:function(a){!0===a&&this.version++}});Object.assign(L.prototype,{isBufferAttribute:!0,onUploadCallback:function(){},setArray:function(a){if(Array.isArray(a))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.count=void 0!==a?a.length/this.itemSize:0;this.array=a;return this},setDynamic:function(a){this.dynamic=a;return this},copy:function(a){this.name=a.name;this.array=new a.array.constructor(a.array);this.itemSize=
a.itemSize;this.count=a.count;this.normalized=a.normalized;this.dynamic=a.dynamic;return this},copyAt:function(a,b,c){a*=this.itemSize;c*=b.itemSize;for(var d=0,e=this.itemSize;d<e;d++)this.array[a+d]=b.array[c+d];return this},copyArray:function(a){this.array.set(a);return this},copyColorsArray:function(a){for(var b=this.array,c=0,d=0,e=a.length;d<e;d++){var f=a[d];void 0===f&&(console.warn("THREE.BufferAttribute.copyColorsArray(): color is undefined",d),f=new G);b[c++]=f.r;b[c++]=f.g;b[c++]=f.b}return this},
copyVector2sArray:function(a){for(var b=this.array,c=0,d=0,e=a.length;d<e;d++){var f=a[d];void 0===f&&(console.warn("THREE.BufferAttribute.copyVector2sArray(): vector is undefined",d),f=new B);b[c++]=f.x;b[c++]=f.y}return this},copyVector3sArray:function(a){for(var b=this.array,c=0,d=0,e=a.length;d<e;d++){var f=a[d];void 0===f&&(console.warn("THREE.BufferAttribute.copyVector3sArray(): vector is undefined",d),f=new p);b[c++]=f.x;b[c++]=f.y;b[c++]=f.z}return this},copyVector4sArray:function(a){for(var b=
this.array,c=0,d=0,e=a.length;d<e;d++){var f=a[d];void 0===f&&(console.warn("THREE.BufferAttribute.copyVector4sArray(): vector is undefined",d),f=new W);b[c++]=f.x;b[c++]=f.y;b[c++]=f.z;b[c++]=f.w}return this},set:function(a,b){void 0===b&&(b=0);this.array.set(a,b);return this},getX:function(a){return this.array[a*this.itemSize]},setX:function(a,b){this.array[a*this.itemSize]=b;return this},getY:function(a){return this.array[a*this.itemSize+1]},setY:function(a,b){this.array[a*this.itemSize+1]=b;return this},
getZ:function(a){return this.array[a*this.itemSize+2]},setZ:function(a,b){this.array[a*this.itemSize+2]=b;return this},getW:function(a){return this.array[a*this.itemSize+3]},setW:function(a,b){this.array[a*this.itemSize+3]=b;return this},setXY:function(a,b,c){a*=this.itemSize;this.array[a+0]=b;this.array[a+1]=c;return this},setXYZ:function(a,b,c,d){a*=this.itemSize;this.array[a+0]=b;this.array[a+1]=c;this.array[a+2]=d;return this},setXYZW:function(a,b,c,d,e){a*=this.itemSize;this.array[a+0]=b;this.array[a+
1]=c;this.array[a+2]=d;this.array[a+3]=e;return this},onUpload:function(a){this.onUploadCallback=a;return this},clone:function(){return(new this.constructor(this.array,this.itemSize)).copy(this)}});yc.prototype=Object.create(L.prototype);yc.prototype.constructor=yc;zc.prototype=Object.create(L.prototype);zc.prototype.constructor=zc;Ac.prototype=Object.create(L.prototype);Ac.prototype.constructor=Ac;Bc.prototype=Object.create(L.prototype);Bc.prototype.constructor=Bc;nb.prototype=Object.create(L.prototype);
nb.prototype.constructor=nb;Cc.prototype=Object.create(L.prototype);Cc.prototype.constructor=Cc;ob.prototype=Object.create(L.prototype);ob.prototype.constructor=ob;z.prototype=Object.create(L.prototype);z.prototype.constructor=z;Dc.prototype=Object.create(L.prototype);Dc.prototype.constructor=Dc;Object.assign(Ge.prototype,{computeGroups:function(a){var b=[],c=void 0;a=a.faces;for(var d=0;d<a.length;d++){var e=a[d];if(e.materialIndex!==c){c=e.materialIndex;void 0!==f&&(f.count=3*d-f.start,b.push(f));
var f={start:3*d,materialIndex:c}}}void 0!==f&&(f.count=3*d-f.start,b.push(f));this.groups=b},fromGeometry:function(a){var b=a.faces,c=a.vertices,d=a.faceVertexUvs,e=d[0]&&0<d[0].length,f=d[1]&&0<d[1].length,g=a.morphTargets,h=g.length;if(0<h){var l=[];for(var m=0;m<h;m++)l[m]=[];this.morphTargets.position=l}var k=a.morphNormals,n=k.length;if(0<n){var p=[];for(m=0;m<n;m++)p[m]=[];this.morphTargets.normal=p}var q=a.skinIndices,r=a.skinWeights,u=q.length===c.length,y=r.length===c.length;0<c.length&&
0===b.length&&console.error("THREE.DirectGeometry: Faceless geometries are not supported.");for(m=0;m<b.length;m++){var w=b[m];this.vertices.push(c[w.a],c[w.b],c[w.c]);var x=w.vertexNormals;3===x.length?this.normals.push(x[0],x[1],x[2]):(x=w.normal,this.normals.push(x,x,x));x=w.vertexColors;3===x.length?this.colors.push(x[0],x[1],x[2]):(x=w.color,this.colors.push(x,x,x));!0===e&&(x=d[0][m],void 0!==x?this.uvs.push(x[0],x[1],x[2]):(console.warn("THREE.DirectGeometry.fromGeometry(): Undefined vertexUv ",
m),this.uvs.push(new B,new B,new B)));!0===f&&(x=d[1][m],void 0!==x?this.uvs2.push(x[0],x[1],x[2]):(console.warn("THREE.DirectGeometry.fromGeometry(): Undefined vertexUv2 ",m),this.uvs2.push(new B,new B,new B)));for(x=0;x<h;x++){var A=g[x].vertices;l[x].push(A[w.a],A[w.b],A[w.c])}for(x=0;x<n;x++)A=k[x].vertexNormals[m],p[x].push(A.a,A.b,A.c);u&&this.skinIndices.push(q[w.a],q[w.b],q[w.c]);y&&this.skinWeights.push(r[w.a],r[w.b],r[w.c])}this.computeGroups(a);this.verticesNeedUpdate=a.verticesNeedUpdate;
this.normalsNeedUpdate=a.normalsNeedUpdate;this.colorsNeedUpdate=a.colorsNeedUpdate;this.uvsNeedUpdate=a.uvsNeedUpdate;this.groupsNeedUpdate=a.groupsNeedUpdate;return this}});var Jf=1;D.prototype=Object.assign(Object.create(za.prototype),{constructor:D,isBufferGeometry:!0,getIndex:function(){return this.index},setIndex:function(a){Array.isArray(a)?this.index=new (65535<He(a)?ob:nb)(a,1):this.index=a},addAttribute:function(a,b,c){if(!(b&&b.isBufferAttribute||b&&b.isInterleavedBufferAttribute))return console.warn("THREE.BufferGeometry: .addAttribute() now expects ( name, attribute )."),
this.addAttribute(a,new L(b,c));if("index"===a)return console.warn("THREE.BufferGeometry.addAttribute: Use .setIndex() for index attribute."),this.setIndex(b),this;this.attributes[a]=b;return this},getAttribute:function(a){return this.attributes[a]},removeAttribute:function(a){delete this.attributes[a];return this},addGroup:function(a,b,c){this.groups.push({start:a,count:b,materialIndex:void 0!==c?c:0})},clearGroups:function(){this.groups=[]},setDrawRange:function(a,b){this.drawRange.start=a;this.drawRange.count=
b},applyMatrix:function(a){var b=this.attributes.position;void 0!==b&&(a.applyToBufferAttribute(b),b.needsUpdate=!0);b=this.attributes.normal;void 0!==b&&((new la).getNormalMatrix(a).applyToBufferAttribute(b),b.needsUpdate=!0);null!==this.boundingBox&&this.computeBoundingBox();null!==this.boundingSphere&&this.computeBoundingSphere();return this},rotateX:function(){var a=new R;return function(b){a.makeRotationX(b);this.applyMatrix(a);return this}}(),rotateY:function(){var a=new R;return function(b){a.makeRotationY(b);
this.applyMatrix(a);return this}}(),rotateZ:function(){var a=new R;return function(b){a.makeRotationZ(b);this.applyMatrix(a);return this}}(),translate:function(){var a=new R;return function(b,c,d){a.makeTranslation(b,c,d);this.applyMatrix(a);return this}}(),scale:function(){var a=new R;return function(b,c,d){a.makeScale(b,c,d);this.applyMatrix(a);return this}}(),lookAt:function(){var a=new H;return function(b){a.lookAt(b);a.updateMatrix();this.applyMatrix(a.matrix)}}(),center:function(){var a=new p;
return function(){this.computeBoundingBox();this.boundingBox.getCenter(a).negate();this.translate(a.x,a.y,a.z);return this}}(),setFromObject:function(a){var b=a.geometry;if(a.isPoints||a.isLine){a=new z(3*b.vertices.length,3);var c=new z(3*b.colors.length,3);this.addAttribute("position",a.copyVector3sArray(b.vertices));this.addAttribute("color",c.copyColorsArray(b.colors));b.lineDistances&&b.lineDistances.length===b.vertices.length&&(a=new z(b.lineDistances.length,1),this.addAttribute("lineDistance",
a.copyArray(b.lineDistances)));null!==b.boundingSphere&&(this.boundingSphere=b.boundingSphere.clone());null!==b.boundingBox&&(this.boundingBox=b.boundingBox.clone())}else a.isMesh&&b&&b.isGeometry&&this.fromGeometry(b);return this},setFromPoints:function(a){for(var b=[],c=0,d=a.length;c<d;c++){var e=a[c];b.push(e.x,e.y,e.z||0)}this.addAttribute("position",new z(b,3));return this},updateFromObject:function(a){var b=a.geometry;if(a.isMesh){var c=b.__directGeometry;!0===b.elementsNeedUpdate&&(c=void 0,
b.elementsNeedUpdate=!1);if(void 0===c)return this.fromGeometry(b);c.verticesNeedUpdate=b.verticesNeedUpdate;c.normalsNeedUpdate=b.normalsNeedUpdate;c.colorsNeedUpdate=b.colorsNeedUpdate;c.uvsNeedUpdate=b.uvsNeedUpdate;c.groupsNeedUpdate=b.groupsNeedUpdate;b.verticesNeedUpdate=!1;b.normalsNeedUpdate=!1;b.colorsNeedUpdate=!1;b.uvsNeedUpdate=!1;b.groupsNeedUpdate=!1;b=c}!0===b.verticesNeedUpdate&&(c=this.attributes.position,void 0!==c&&(c.copyVector3sArray(b.vertices),c.needsUpdate=!0),b.verticesNeedUpdate=
!1);!0===b.normalsNeedUpdate&&(c=this.attributes.normal,void 0!==c&&(c.copyVector3sArray(b.normals),c.needsUpdate=!0),b.normalsNeedUpdate=!1);!0===b.colorsNeedUpdate&&(c=this.attributes.color,void 0!==c&&(c.copyColorsArray(b.colors),c.needsUpdate=!0),b.colorsNeedUpdate=!1);b.uvsNeedUpdate&&(c=this.attributes.uv,void 0!==c&&(c.copyVector2sArray(b.uvs),c.needsUpdate=!0),b.uvsNeedUpdate=!1);b.lineDistancesNeedUpdate&&(c=this.attributes.lineDistance,void 0!==c&&(c.copyArray(b.lineDistances),c.needsUpdate=
!0),b.lineDistancesNeedUpdate=!1);b.groupsNeedUpdate&&(b.computeGroups(a.geometry),this.groups=b.groups,b.groupsNeedUpdate=!1);return this},fromGeometry:function(a){a.__directGeometry=(new Ge).fromGeometry(a);return this.fromDirectGeometry(a.__directGeometry)},fromDirectGeometry:function(a){var b=new Float32Array(3*a.vertices.length);this.addAttribute("position",(new L(b,3)).copyVector3sArray(a.vertices));0<a.normals.length&&(b=new Float32Array(3*a.normals.length),this.addAttribute("normal",(new L(b,
3)).copyVector3sArray(a.normals)));0<a.colors.length&&(b=new Float32Array(3*a.colors.length),this.addAttribute("color",(new L(b,3)).copyColorsArray(a.colors)));0<a.uvs.length&&(b=new Float32Array(2*a.uvs.length),this.addAttribute("uv",(new L(b,2)).copyVector2sArray(a.uvs)));0<a.uvs2.length&&(b=new Float32Array(2*a.uvs2.length),this.addAttribute("uv2",(new L(b,2)).copyVector2sArray(a.uvs2)));this.groups=a.groups;for(var c in a.morphTargets){b=[];for(var d=a.morphTargets[c],e=0,f=d.length;e<f;e++){var g=
d[e],h=new z(3*g.length,3);b.push(h.copyVector3sArray(g))}this.morphAttributes[c]=b}0<a.skinIndices.length&&(c=new z(4*a.skinIndices.length,4),this.addAttribute("skinIndex",c.copyVector4sArray(a.skinIndices)));0<a.skinWeights.length&&(c=new z(4*a.skinWeights.length,4),this.addAttribute("skinWeight",c.copyVector4sArray(a.skinWeights)));null!==a.boundingSphere&&(this.boundingSphere=a.boundingSphere.clone());null!==a.boundingBox&&(this.boundingBox=a.boundingBox.clone());return this},computeBoundingBox:function(){null===
this.boundingBox&&(this.boundingBox=new Xa);var a=this.attributes.position;void 0!==a?this.boundingBox.setFromBufferAttribute(a):this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox: Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)},computeBoundingSphere:function(){var a=new Xa,b=new p;return function(){null===this.boundingSphere&&
(this.boundingSphere=new Ha);var c=this.attributes.position;if(c){var d=this.boundingSphere.center;a.setFromBufferAttribute(c);a.getCenter(d);for(var e=0,f=0,g=c.count;f<g;f++)b.x=c.getX(f),b.y=c.getY(f),b.z=c.getZ(f),e=Math.max(e,d.distanceToSquared(b));this.boundingSphere.radius=Math.sqrt(e);isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}}(),computeFaceNormals:function(){},
computeVertexNormals:function(){var a=this.index,b=this.attributes,c=this.groups;if(b.position){var d=b.position.array;if(void 0===b.normal)this.addAttribute("normal",new L(new Float32Array(d.length),3));else for(var e=b.normal.array,f=0,g=e.length;f<g;f++)e[f]=0;e=b.normal.array;var h=new p,l=new p,m=new p,k=new p,n=new p;if(a){a=a.array;0===c.length&&this.addGroup(0,a.length);for(var t=0,q=c.length;t<q;++t){f=c[t];g=f.start;var r=f.count;f=g;for(g+=r;f<g;f+=3){r=3*a[f+0];var u=3*a[f+1];var y=3*
a[f+2];h.fromArray(d,r);l.fromArray(d,u);m.fromArray(d,y);k.subVectors(m,l);n.subVectors(h,l);k.cross(n);e[r]+=k.x;e[r+1]+=k.y;e[r+2]+=k.z;e[u]+=k.x;e[u+1]+=k.y;e[u+2]+=k.z;e[y]+=k.x;e[y+1]+=k.y;e[y+2]+=k.z}}}else for(f=0,g=d.length;f<g;f+=9)h.fromArray(d,f),l.fromArray(d,f+3),m.fromArray(d,f+6),k.subVectors(m,l),n.subVectors(h,l),k.cross(n),e[f]=k.x,e[f+1]=k.y,e[f+2]=k.z,e[f+3]=k.x,e[f+4]=k.y,e[f+5]=k.z,e[f+6]=k.x,e[f+7]=k.y,e[f+8]=k.z;this.normalizeNormals();b.normal.needsUpdate=!0}},merge:function(a,
b){if(a&&a.isBufferGeometry){void 0===b&&(b=0,console.warn("THREE.BufferGeometry.merge(): Overwriting original geometry, starting at offset=0. Use BufferGeometryUtils.mergeBufferGeometries() for lossless merge."));var c=this.attributes,d;for(d in c)if(void 0!==a.attributes[d]){var e=c[d].array,f=a.attributes[d],g=f.array,h=0;for(f=f.itemSize*b;h<g.length;h++,f++)e[f]=g[h]}return this}console.error("THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.",a)},normalizeNormals:function(){var a=
new p;return function(){for(var b=this.attributes.normal,c=0,d=b.count;c<d;c++)a.x=b.getX(c),a.y=b.getY(c),a.z=b.getZ(c),a.normalize(),b.setXYZ(c,a.x,a.y,a.z)}}(),toNonIndexed:function(){if(null===this.index)return console.warn("THREE.BufferGeometry.toNonIndexed(): Geometry is already non-indexed."),this;var a=new D,b=this.index.array,c=this.attributes,d;for(d in c){var e=c[d],f=e.array,g=e.itemSize,h=new f.constructor(b.length*g),l=0;e=0;for(var m=b.length;e<m;e++){var k=b[e]*g;for(var n=0;n<g;n++)h[l++]=
f[k++]}a.addAttribute(d,new L(h,g))}b=this.groups;e=0;for(m=b.length;e<m;e++)c=b[e],a.addGroup(c.start,c.count,c.materialIndex);return a},toJSON:function(){var a={metadata:{version:4.5,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};a.uuid=this.uuid;a.type=this.type;""!==this.name&&(a.name=this.name);0<Object.keys(this.userData).length&&(a.userData=this.userData);if(void 0!==this.parameters){var b=this.parameters;for(e in b)void 0!==b[e]&&(a[e]=b[e]);return a}a.data={attributes:{}};var c=
this.index;null!==c&&(b=Array.prototype.slice.call(c.array),a.data.index={type:c.array.constructor.name,array:b});c=this.attributes;for(e in c){var d=c[e];b=Array.prototype.slice.call(d.array);a.data.attributes[e]={itemSize:d.itemSize,type:d.array.constructor.name,array:b,normalized:d.normalized}}var e=this.groups;0<e.length&&(a.data.groups=JSON.parse(JSON.stringify(e)));e=this.boundingSphere;null!==e&&(a.data.boundingSphere={center:e.center.toArray(),radius:e.radius});return a},clone:function(){return(new D).copy(this)},
copy:function(a){var b;this.index=null;this.attributes={};this.morphAttributes={};this.groups=[];this.boundingSphere=this.boundingBox=null;this.name=a.name;var c=a.index;null!==c&&this.setIndex(c.clone());c=a.attributes;for(g in c)this.addAttribute(g,c[g].clone());var d=a.morphAttributes;for(g in d){var e=[],f=d[g];c=0;for(b=f.length;c<b;c++)e.push(f[c].clone());this.morphAttributes[g]=e}var g=a.groups;c=0;for(b=g.length;c<b;c++)d=g[c],this.addGroup(d.start,d.count,d.materialIndex);g=a.boundingBox;
null!==g&&(this.boundingBox=g.clone());g=a.boundingSphere;null!==g&&(this.boundingSphere=g.clone());this.drawRange.start=a.drawRange.start;this.drawRange.count=a.drawRange.count;this.userData=a.userData;return this},dispose:function(){this.dispatchEvent({type:"dispose"})}});Nb.prototype=Object.create(P.prototype);Nb.prototype.constructor=Nb;pb.prototype=Object.create(D.prototype);pb.prototype.constructor=pb;Fc.prototype=Object.create(P.prototype);Fc.prototype.constructor=Fc;rb.prototype=Object.create(D.prototype);
rb.prototype.constructor=rb;var Kf=0;I.prototype=Object.assign(Object.create(za.prototype),{constructor:I,isMaterial:!0,onBeforeCompile:function(){},setValues:function(a){if(void 0!==a)for(var b in a){var c=a[b];if(void 0===c)console.warn("THREE.Material: '"+b+"' parameter is undefined.");else if("shading"===b)console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead."),this.flatShading=1===c?!0:!1;else{var d=this[b];void 0===d?console.warn("THREE."+this.type+
": '"+b+"' is not a property of this material."):d&&d.isColor?d.set(c):d&&d.isVector3&&c&&c.isVector3?d.copy(c):this[b]="overdraw"===b?Number(c):c}}},toJSON:function(a){function b(a){var b=[],c;for(c in a){var d=a[c];delete d.metadata;b.push(d)}return b}var c=void 0===a||"string"===typeof a;c&&(a={textures:{},images:{}});var d={metadata:{version:4.5,type:"Material",generator:"Material.toJSON"}};d.uuid=this.uuid;d.type=this.type;""!==this.name&&(d.name=this.name);this.color&&this.color.isColor&&(d.color=
this.color.getHex());void 0!==this.roughness&&(d.roughness=this.roughness);void 0!==this.metalness&&(d.metalness=this.metalness);this.emissive&&this.emissive.isColor&&(d.emissive=this.emissive.getHex());1!==this.emissiveIntensity&&(d.emissiveIntensity=this.emissiveIntensity);this.specular&&this.specular.isColor&&(d.specular=this.specular.getHex());void 0!==this.shininess&&(d.shininess=this.shininess);void 0!==this.clearCoat&&(d.clearCoat=this.clearCoat);void 0!==this.clearCoatRoughness&&(d.clearCoatRoughness=
this.clearCoatRoughness);this.map&&this.map.isTexture&&(d.map=this.map.toJSON(a).uuid);this.alphaMap&&this.alphaMap.isTexture&&(d.alphaMap=this.alphaMap.toJSON(a).uuid);this.lightMap&&this.lightMap.isTexture&&(d.lightMap=this.lightMap.toJSON(a).uuid);this.aoMap&&this.aoMap.isTexture&&(d.aoMap=this.aoMap.toJSON(a).uuid,d.aoMapIntensity=this.aoMapIntensity);this.bumpMap&&this.bumpMap.isTexture&&(d.bumpMap=this.bumpMap.toJSON(a).uuid,d.bumpScale=this.bumpScale);this.normalMap&&this.normalMap.isTexture&&
(d.normalMap=this.normalMap.toJSON(a).uuid,d.normalMapType=this.normalMapType,d.normalScale=this.normalScale.toArray());this.displacementMap&&this.displacementMap.isTexture&&(d.displacementMap=this.displacementMap.toJSON(a).uuid,d.displacementScale=this.displacementScale,d.displacementBias=this.displacementBias);this.roughnessMap&&this.roughnessMap.isTexture&&(d.roughnessMap=this.roughnessMap.toJSON(a).uuid);this.metalnessMap&&this.metalnessMap.isTexture&&(d.metalnessMap=this.metalnessMap.toJSON(a).uuid);
this.emissiveMap&&this.emissiveMap.isTexture&&(d.emissiveMap=this.emissiveMap.toJSON(a).uuid);this.specularMap&&this.specularMap.isTexture&&(d.specularMap=this.specularMap.toJSON(a).uuid);this.envMap&&this.envMap.isTexture&&(d.envMap=this.envMap.toJSON(a).uuid,d.reflectivity=this.reflectivity);this.gradientMap&&this.gradientMap.isTexture&&(d.gradientMap=this.gradientMap.toJSON(a).uuid);void 0!==this.size&&(d.size=this.size);void 0!==this.sizeAttenuation&&(d.sizeAttenuation=this.sizeAttenuation);1!==
this.blending&&(d.blending=this.blending);!0===this.flatShading&&(d.flatShading=this.flatShading);0!==this.side&&(d.side=this.side);0!==this.vertexColors&&(d.vertexColors=this.vertexColors);1>this.opacity&&(d.opacity=this.opacity);!0===this.transparent&&(d.transparent=this.transparent);d.depthFunc=this.depthFunc;d.depthTest=this.depthTest;d.depthWrite=this.depthWrite;0!==this.rotation&&(d.rotation=this.rotation);1!==this.linewidth&&(d.linewidth=this.linewidth);void 0!==this.dashSize&&(d.dashSize=
this.dashSize);void 0!==this.gapSize&&(d.gapSize=this.gapSize);void 0!==this.scale&&(d.scale=this.scale);!0===this.dithering&&(d.dithering=!0);0<this.alphaTest&&(d.alphaTest=this.alphaTest);!0===this.premultipliedAlpha&&(d.premultipliedAlpha=this.premultipliedAlpha);!0===this.wireframe&&(d.wireframe=this.wireframe);1<this.wireframeLinewidth&&(d.wireframeLinewidth=this.wireframeLinewidth);"round"!==this.wireframeLinecap&&(d.wireframeLinecap=this.wireframeLinecap);"round"!==this.wireframeLinejoin&&
(d.wireframeLinejoin=this.wireframeLinejoin);!0===this.morphTargets&&(d.morphTargets=!0);!0===this.skinning&&(d.skinning=!0);!1===this.visible&&(d.visible=!1);"{}"!==JSON.stringify(this.userData)&&(d.userData=this.userData);c&&(c=b(a.textures),a=b(a.images),0<c.length&&(d.textures=c),0<a.length&&(d.images=a));return d},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.name=a.name;this.fog=a.fog;this.lights=a.lights;this.blending=a.blending;this.side=a.side;this.flatShading=
a.flatShading;this.vertexColors=a.vertexColors;this.opacity=a.opacity;this.transparent=a.transparent;this.blendSrc=a.blendSrc;this.blendDst=a.blendDst;this.blendEquation=a.blendEquation;this.blendSrcAlpha=a.blendSrcAlpha;this.blendDstAlpha=a.blendDstAlpha;this.blendEquationAlpha=a.blendEquationAlpha;this.depthFunc=a.depthFunc;this.depthTest=a.depthTest;this.depthWrite=a.depthWrite;this.colorWrite=a.colorWrite;this.precision=a.precision;this.polygonOffset=a.polygonOffset;this.polygonOffsetFactor=a.polygonOffsetFactor;
this.polygonOffsetUnits=a.polygonOffsetUnits;this.dithering=a.dithering;this.alphaTest=a.alphaTest;this.premultipliedAlpha=a.premultipliedAlpha;this.overdraw=a.overdraw;this.visible=a.visible;this.userData=JSON.parse(JSON.stringify(a.userData));this.clipShadows=a.clipShadows;this.clipIntersection=a.clipIntersection;var b=a.clippingPlanes,c=null;if(null!==b){var d=b.length;c=Array(d);for(var e=0;e!==d;++e)c[e]=b[e].clone()}this.clippingPlanes=c;this.shadowSide=a.shadowSide;return this},dispose:function(){this.dispatchEvent({type:"dispose"})}});
ua.prototype=Object.create(I.prototype);ua.prototype.constructor=ua;ua.prototype.isMeshBasicMaterial=!0;ua.prototype.copy=function(a){I.prototype.copy.call(this,a);this.color.copy(a.color);this.map=a.map;this.lightMap=a.lightMap;this.lightMapIntensity=a.lightMapIntensity;this.aoMap=a.aoMap;this.aoMapIntensity=a.aoMapIntensity;this.specularMap=a.specularMap;this.alphaMap=a.alphaMap;this.envMap=a.envMap;this.combine=a.combine;this.reflectivity=a.reflectivity;this.refractionRatio=a.refractionRatio;this.wireframe=
a.wireframe;this.wireframeLinewidth=a.wireframeLinewidth;this.wireframeLinecap=a.wireframeLinecap;this.wireframeLinejoin=a.wireframeLinejoin;this.skinning=a.skinning;this.morphTargets=a.morphTargets;return this};Fa.prototype=Object.create(I.prototype);Fa.prototype.constructor=Fa;Fa.prototype.isShaderMaterial=!0;Fa.prototype.copy=function(a){I.prototype.copy.call(this,a);this.fragmentShader=a.fragmentShader;this.vertexShader=a.vertexShader;this.uniforms=Ba.clone(a.uniforms);this.defines=Object.assign({},
a.defines);this.wireframe=a.wireframe;this.wireframeLinewidth=a.wireframeLinewidth;this.lights=a.lights;this.clipping=a.clipping;this.skinning=a.skinning;this.morphTargets=a.morphTargets;this.morphNormals=a.morphNormals;this.extensions=a.extensions;return this};Fa.prototype.toJSON=function(a){a=I.prototype.toJSON.call(this,a);a.uniforms=this.uniforms;a.vertexShader=this.vertexShader;a.fragmentShader=this.fragmentShader;return a};Object.assign(sb.prototype,{set:function(a,b){this.origin.copy(a);this.direction.copy(b);
return this},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.origin.copy(a.origin);this.direction.copy(a.direction);return this},at:function(a,b){void 0===b&&(console.warn("THREE.Ray: .at() target is now required"),b=new p);return b.copy(this.direction).multiplyScalar(a).add(this.origin)},lookAt:function(a){this.direction.copy(a).sub(this.origin).normalize();return this},recast:function(){var a=new p;return function(b){this.origin.copy(this.at(b,a));return this}}(),
closestPointToPoint:function(a,b){void 0===b&&(console.warn("THREE.Ray: .closestPointToPoint() target is now required"),b=new p);b.subVectors(a,this.origin);a=b.dot(this.direction);return 0>a?b.copy(this.origin):b.copy(this.direction).multiplyScalar(a).add(this.origin)},distanceToPoint:function(a){return Math.sqrt(this.distanceSqToPoint(a))},distanceSqToPoint:function(){var a=new p;return function(b){var c=a.subVectors(b,this.origin).dot(this.direction);if(0>c)return this.origin.distanceToSquared(b);
a.copy(this.direction).multiplyScalar(c).add(this.origin);return a.distanceToSquared(b)}}(),distanceSqToSegment:function(){var a=new p,b=new p,c=new p;return function(d,e,f,g){a.copy(d).add(e).multiplyScalar(.5);b.copy(e).sub(d).normalize();c.copy(this.origin).sub(a);var h=.5*d.distanceTo(e),l=-this.direction.dot(b),m=c.dot(this.direction),k=-c.dot(b),n=c.lengthSq(),p=Math.abs(1-l*l);if(0<p){d=l*k-m;e=l*m-k;var q=h*p;0<=d?e>=-q?e<=q?(h=1/p,d*=h,e*=h,l=d*(d+l*e+2*m)+e*(l*d+e+2*k)+n):(e=h,d=Math.max(0,
-(l*e+m)),l=-d*d+e*(e+2*k)+n):(e=-h,d=Math.max(0,-(l*e+m)),l=-d*d+e*(e+2*k)+n):e<=-q?(d=Math.max(0,-(-l*h+m)),e=0<d?-h:Math.min(Math.max(-h,-k),h),l=-d*d+e*(e+2*k)+n):e<=q?(d=0,e=Math.min(Math.max(-h,-k),h),l=e*(e+2*k)+n):(d=Math.max(0,-(l*h+m)),e=0<d?h:Math.min(Math.max(-h,-k),h),l=-d*d+e*(e+2*k)+n)}else e=0<l?-h:h,d=Math.max(0,-(l*e+m)),l=-d*d+e*(e+2*k)+n;f&&f.copy(this.direction).multiplyScalar(d).add(this.origin);g&&g.copy(b).multiplyScalar(e).add(a);return l}}(),intersectSphere:function(){var a=
new p;return function(b,c){a.subVectors(b.center,this.origin);var d=a.dot(this.direction),e=a.dot(a)-d*d;b=b.radius*b.radius;if(e>b)return null;b=Math.sqrt(b-e);e=d-b;d+=b;return 0>e&&0>d?null:0>e?this.at(d,c):this.at(e,c)}}(),intersectsSphere:function(a){return this.distanceToPoint(a.center)<=a.radius},distanceToPlane:function(a){var b=a.normal.dot(this.direction);if(0===b)return 0===a.distanceToPoint(this.origin)?0:null;a=-(this.origin.dot(a.normal)+a.constant)/b;return 0<=a?a:null},intersectPlane:function(a,
b){a=this.distanceToPlane(a);return null===a?null:this.at(a,b)},intersectsPlane:function(a){var b=a.distanceToPoint(this.origin);return 0===b||0>a.normal.dot(this.direction)*b?!0:!1},intersectBox:function(a,b){var c=1/this.direction.x;var d=1/this.direction.y;var e=1/this.direction.z,f=this.origin;if(0<=c){var g=(a.min.x-f.x)*c;c*=a.max.x-f.x}else g=(a.max.x-f.x)*c,c*=a.min.x-f.x;if(0<=d){var h=(a.min.y-f.y)*d;d*=a.max.y-f.y}else h=(a.max.y-f.y)*d,d*=a.min.y-f.y;if(g>d||h>c)return null;if(h>g||g!==
g)g=h;if(d<c||c!==c)c=d;0<=e?(h=(a.min.z-f.z)*e,a=(a.max.z-f.z)*e):(h=(a.max.z-f.z)*e,a=(a.min.z-f.z)*e);if(g>a||h>c)return null;if(h>g||g!==g)g=h;if(a<c||c!==c)c=a;return 0>c?null:this.at(0<=g?g:c,b)},intersectsBox:function(){var a=new p;return function(b){return null!==this.intersectBox(b,a)}}(),intersectTriangle:function(){var a=new p,b=new p,c=new p,d=new p;return function(e,f,g,h,l){b.subVectors(f,e);c.subVectors(g,e);d.crossVectors(b,c);f=this.direction.dot(d);if(0<f){if(h)return null;h=1}else if(0>
f)h=-1,f=-f;else return null;a.subVectors(this.origin,e);e=h*this.direction.dot(c.crossVectors(a,c));if(0>e)return null;g=h*this.direction.dot(b.cross(a));if(0>g||e+g>f)return null;e=-h*a.dot(d);return 0>e?null:this.at(e/f,l)}}(),applyMatrix4:function(a){this.origin.applyMatrix4(a);this.direction.transformDirection(a);return this},equals:function(a){return a.origin.equals(this.origin)&&a.direction.equals(this.direction)}});Object.assign(Qb.prototype,{set:function(a,b){this.start.copy(a);this.end.copy(b);
return this},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.start.copy(a.start);this.end.copy(a.end);return this},getCenter:function(a){void 0===a&&(console.warn("THREE.Line3: .getCenter() target is now required"),a=new p);return a.addVectors(this.start,this.end).multiplyScalar(.5)},delta:function(a){void 0===a&&(console.warn("THREE.Line3: .delta() target is now required"),a=new p);return a.subVectors(this.end,this.start)},distanceSq:function(){return this.start.distanceToSquared(this.end)},
distance:function(){return this.start.distanceTo(this.end)},at:function(a,b){void 0===b&&(console.warn("THREE.Line3: .at() target is now required"),b=new p);return this.delta(b).multiplyScalar(a).add(this.start)},closestPointToPointParameter:function(){var a=new p,b=new p;return function(c,d){a.subVectors(c,this.start);b.subVectors(this.end,this.start);c=b.dot(b);c=b.dot(a)/c;d&&(c=J.clamp(c,0,1));return c}}(),closestPointToPoint:function(a,b,c){a=this.closestPointToPointParameter(a,b);void 0===c&&
(console.warn("THREE.Line3: .closestPointToPoint() target is now required"),c=new p);return this.delta(c).multiplyScalar(a).add(this.start)},applyMatrix4:function(a){this.start.applyMatrix4(a);this.end.applyMatrix4(a);return this},equals:function(a){return a.start.equals(this.start)&&a.end.equals(this.end)}});Object.assign(ta,{getNormal:function(){var a=new p;return function(b,c,d,e){void 0===e&&(console.warn("THREE.Triangle: .getNormal() target is now required"),e=new p);e.subVectors(d,c);a.subVectors(b,
c);e.cross(a);b=e.lengthSq();return 0<b?e.multiplyScalar(1/Math.sqrt(b)):e.set(0,0,0)}}(),getBarycoord:function(){var a=new p,b=new p,c=new p;return function(d,e,f,g,h){a.subVectors(g,e);b.subVectors(f,e);c.subVectors(d,e);d=a.dot(a);e=a.dot(b);f=a.dot(c);var l=b.dot(b);g=b.dot(c);var m=d*l-e*e;void 0===h&&(console.warn("THREE.Triangle: .getBarycoord() target is now required"),h=new p);if(0===m)return h.set(-2,-1,-1);m=1/m;l=(l*f-e*g)*m;d=(d*g-e*f)*m;return h.set(1-l-d,d,l)}}(),containsPoint:function(){var a=
new p;return function(b,c,d,e){ta.getBarycoord(b,c,d,e,a);return 0<=a.x&&0<=a.y&&1>=a.x+a.y}}()});Object.assign(ta.prototype,{set:function(a,b,c){this.a.copy(a);this.b.copy(b);this.c.copy(c);return this},setFromPointsAndIndices:function(a,b,c,d){this.a.copy(a[b]);this.b.copy(a[c]);this.c.copy(a[d]);return this},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.a.copy(a.a);this.b.copy(a.b);this.c.copy(a.c);return this},getArea:function(){var a=new p,b=new p;return function(){a.subVectors(this.c,
this.b);b.subVectors(this.a,this.b);return.5*a.cross(b).length()}}(),getMidpoint:function(a){void 0===a&&(console.warn("THREE.Triangle: .getMidpoint() target is now required"),a=new p);return a.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)},getNormal:function(a){return ta.getNormal(this.a,this.b,this.c,a)},getPlane:function(a){void 0===a&&(console.warn("THREE.Triangle: .getPlane() target is now required"),a=new p);return a.setFromCoplanarPoints(this.a,this.b,this.c)},getBarycoord:function(a,
b){return ta.getBarycoord(a,this.a,this.b,this.c,b)},containsPoint:function(a){return ta.containsPoint(a,this.a,this.b,this.c)},intersectsBox:function(a){return a.intersectsTriangle(this)},closestPointToPoint:function(){var a=new Ia,b=[new Qb,new Qb,new Qb],c=new p,d=new p;return function(e,f){void 0===f&&(console.warn("THREE.Triangle: .closestPointToPoint() target is now required"),f=new p);var g=Infinity;a.setFromCoplanarPoints(this.a,this.b,this.c);a.projectPoint(e,c);if(!0===this.containsPoint(c))f.copy(c);
else for(b[0].set(this.a,this.b),b[1].set(this.b,this.c),b[2].set(this.c,this.a),e=0;e<b.length;e++){b[e].closestPointToPoint(c,!0,d);var h=c.distanceToSquared(d);h<g&&(g=h,f.copy(d))}return f}}(),equals:function(a){return a.a.equals(this.a)&&a.b.equals(this.b)&&a.c.equals(this.c)}});va.prototype=Object.assign(Object.create(H.prototype),{constructor:va,isMesh:!0,setDrawMode:function(a){this.drawMode=a},copy:function(a){H.prototype.copy.call(this,a);this.drawMode=a.drawMode;void 0!==a.morphTargetInfluences&&
(this.morphTargetInfluences=a.morphTargetInfluences.slice());void 0!==a.morphTargetDictionary&&(this.morphTargetDictionary=Object.assign({},a.morphTargetDictionary));return this},updateMorphTargets:function(){var a=this.geometry;if(a.isBufferGeometry){a=a.morphAttributes;var b=Object.keys(a);if(0<b.length){var c=a[b[0]];if(void 0!==c)for(this.morphTargetInfluences=[],this.morphTargetDictionary={},a=0,b=c.length;a<b;a++){var d=c[a].name||String(a);this.morphTargetInfluences.push(0);this.morphTargetDictionary[d]=
a}}}else if(c=a.morphTargets,void 0!==c&&0<c.length)for(this.morphTargetInfluences=[],this.morphTargetDictionary={},a=0,b=c.length;a<b;a++)d=c[a].name||String(a),this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=a},raycast:function(){function a(a,b,c,d,e,f,g){ta.getBarycoord(a,b,c,d,u);e.multiplyScalar(u.x);f.multiplyScalar(u.y);g.multiplyScalar(u.z);e.add(f).add(g);return e.clone()}function b(a,b,c,d,e,f,g,h){if(null===(1===b.side?d.intersectTriangle(g,f,e,!0,h):d.intersectTriangle(e,
f,g,2!==b.side,h)))return null;w.copy(h);w.applyMatrix4(a.matrixWorld);b=c.ray.origin.distanceTo(w);return b<c.near||b>c.far?null:{distance:b,point:w.clone(),object:a}}function c(c,d,e,f,m,k,n,p,v){g.fromBufferAttribute(m,n);h.fromBufferAttribute(m,p);l.fromBufferAttribute(m,v);if(c=b(c,d,e,f,g,h,l,y))k&&(t.fromBufferAttribute(k,n),q.fromBufferAttribute(k,p),r.fromBufferAttribute(k,v),c.uv=a(y,g,h,l,t,q,r)),k=new Ya(n,p,v),ta.getNormal(g,h,l,k.normal),c.face=k;return c}var d=new R,e=new sb,f=new Ha,
g=new p,h=new p,l=new p,m=new p,k=new p,n=new p,t=new B,q=new B,r=new B,u=new p,y=new p,w=new p;return function(p,v){var u=this.geometry,x=this.material,w=this.matrixWorld;if(void 0!==x&&(null===u.boundingSphere&&u.computeBoundingSphere(),f.copy(u.boundingSphere),f.applyMatrix4(w),!1!==p.ray.intersectsSphere(f)&&(d.getInverse(w),e.copy(p.ray).applyMatrix4(d),null===u.boundingBox||!1!==e.intersectsBox(u.boundingBox))))if(u.isBufferGeometry){var A=u.index,z=u.attributes.position,B=u.attributes.uv,H=
u.groups;u=u.drawRange;var G;if(null!==A)if(Array.isArray(x)){var D=0;for(G=H.length;D<G;D++){var E=H[D];var J=x[E.materialIndex];w=Math.max(E.start,u.start);var L=Math.min(E.start+E.count,u.start+u.count);for(E=w;E<L;E+=3){w=A.getX(D);var I=A.getX(D+1);var K=A.getX(D+2);if(w=c(this,J,p,e,z,B,w,I,K))w.faceIndex=Math.floor(D/3),v.push(w)}}}else for(w=Math.max(0,u.start),L=Math.min(A.count,u.start+u.count),D=w,G=L;D<G;D+=3){if(w=A.getX(D),I=A.getX(D+1),K=A.getX(D+2),w=c(this,x,p,e,z,B,w,I,K))w.faceIndex=
Math.floor(D/3),v.push(w)}else if(void 0!==z)if(Array.isArray(x))for(D=0,G=H.length;D<G;D++)for(E=H[D],J=x[E.materialIndex],w=Math.max(E.start,u.start),L=Math.min(E.start+E.count,u.start+u.count),E=w;E<L;E+=3){if(w=E,I=E+1,K=E+2,w=c(this,J,p,e,z,B,w,I,K))w.faceIndex=Math.floor(D/3),v.push(w)}else for(w=Math.max(0,u.start),L=Math.min(z.count,u.start+u.count),D=w,G=L;D<G;D+=3)if(w=D,I=D+1,K=D+2,w=c(this,x,p,e,z,B,w,I,K))w.faceIndex=Math.floor(D/3),v.push(w)}else if(u.isGeometry)for(z=Array.isArray(x),
B=u.vertices,H=u.faces,w=u.faceVertexUvs[0],0<w.length&&(A=w),E=0,L=H.length;E<L;E++)if(I=H[E],w=z?x[I.materialIndex]:x,void 0!==w){D=B[I.a];G=B[I.b];J=B[I.c];if(!0===w.morphTargets){K=u.morphTargets;var R=this.morphTargetInfluences;g.set(0,0,0);h.set(0,0,0);l.set(0,0,0);for(var P=0,S=K.length;P<S;P++){var T=R[P];if(0!==T){var W=K[P].vertices;g.addScaledVector(m.subVectors(W[I.a],D),T);h.addScaledVector(k.subVectors(W[I.b],G),T);l.addScaledVector(n.subVectors(W[I.c],J),T)}}g.add(D);h.add(G);l.add(J);
D=g;G=h;J=l}if(w=b(this,w,p,e,D,G,J,y))A&&A[E]&&(K=A[E],t.copy(K[0]),q.copy(K[1]),r.copy(K[2]),w.uv=a(y,D,G,J,t,q,r)),w.face=I,w.faceIndex=E,v.push(w)}}}(),clone:function(){return(new this.constructor(this.geometry,this.material)).copy(this)}});Za.prototype=Object.create(ea.prototype);Za.prototype.constructor=Za;Za.prototype.isCubeTexture=!0;Object.defineProperty(Za.prototype,"images",{get:function(){return this.image},set:function(a){this.image=a}});var Oe=new ea,Pe=new Za,Ie=[],Ke=[],Ne=new Float32Array(16),
Me=new Float32Array(9),Le=new Float32Array(4);Te.prototype.updateCache=function(a){var b=this.cache;a instanceof Float32Array&&b.length!==a.length&&(this.cache=new Float32Array(a.length));qa(b,a)};Ue.prototype.setValue=function(a,b){for(var c=this.seq,d=0,e=c.length;d!==e;++d){var f=c[d];f.setValue(a,b[f.id])}};var Xd=/([\w\d_]+)(\])?(\[|\.)?/g;eb.prototype.setValue=function(a,b,c){b=this.map[b];void 0!==b&&b.setValue(a,c,this.renderer)};eb.prototype.setOptional=function(a,b,c){b=b[c];void 0!==b&&
this.setValue(a,c,b)};eb.upload=function(a,b,c,d){for(var e=0,f=b.length;e!==f;++e){var g=b[e],h=c[g.id];!1!==h.needsUpdate&&g.setValue(a,h.value,d)}};eb.seqWithValue=function(a,b){for(var c=[],d=0,e=a.length;d!==e;++d){var f=a[d];f.id in b&&c.push(f)}return c};var yg=0,Hg=0;fb.prototype=Object.create(I.prototype);fb.prototype.constructor=fb;fb.prototype.isMeshDepthMaterial=!0;fb.prototype.copy=function(a){I.prototype.copy.call(this,a);this.depthPacking=a.depthPacking;this.skinning=a.skinning;this.morphTargets=
a.morphTargets;this.map=a.map;this.alphaMap=a.alphaMap;this.displacementMap=a.displacementMap;this.displacementScale=a.displacementScale;this.displacementBias=a.displacementBias;this.wireframe=a.wireframe;this.wireframeLinewidth=a.wireframeLinewidth;return this};gb.prototype=Object.create(I.prototype);gb.prototype.constructor=gb;gb.prototype.isMeshDistanceMaterial=!0;gb.prototype.copy=function(a){I.prototype.copy.call(this,a);this.referencePosition.copy(a.referencePosition);this.nearDistance=a.nearDistance;
this.farDistance=a.farDistance;this.skinning=a.skinning;this.morphTargets=a.morphTargets;this.map=a.map;this.alphaMap=a.alphaMap;this.displacementMap=a.displacementMap;this.displacementScale=a.displacementScale;this.displacementBias=a.displacementBias;return this};Sb.prototype=Object.create(ea.prototype);Sb.prototype.constructor=Sb;Sb.prototype.isCanvasTexture=!0;Ub.prototype=Object.assign(Object.create(H.prototype),{constructor:Ub,isGroup:!0});Z.prototype=Object.assign(Object.create(Ra.prototype),
{constructor:Z,isPerspectiveCamera:!0,copy:function(a,b){Ra.prototype.copy.call(this,a,b);this.fov=a.fov;this.zoom=a.zoom;this.near=a.near;this.far=a.far;this.focus=a.focus;this.aspect=a.aspect;this.view=null===a.view?null:Object.assign({},a.view);this.filmGauge=a.filmGauge;this.filmOffset=a.filmOffset;return this},setFocalLength:function(a){a=.5*this.getFilmHeight()/a;this.fov=2*J.RAD2DEG*Math.atan(a);this.updateProjectionMatrix()},getFocalLength:function(){var a=Math.tan(.5*J.DEG2RAD*this.fov);
return.5*this.getFilmHeight()/a},getEffectiveFOV:function(){return 2*J.RAD2DEG*Math.atan(Math.tan(.5*J.DEG2RAD*this.fov)/this.zoom)},getFilmWidth:function(){return this.filmGauge*Math.min(this.aspect,1)},getFilmHeight:function(){return this.filmGauge/Math.max(this.aspect,1)},setViewOffset:function(a,b,c,d,e,f){this.aspect=a/b;null===this.view&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1});this.view.enabled=!0;this.view.fullWidth=a;this.view.fullHeight=b;this.view.offsetX=
c;this.view.offsetY=d;this.view.width=e;this.view.height=f;this.updateProjectionMatrix()},clearViewOffset:function(){null!==this.view&&(this.view.enabled=!1);this.updateProjectionMatrix()},updateProjectionMatrix:function(){var a=this.near,b=a*Math.tan(.5*J.DEG2RAD*this.fov)/this.zoom,c=2*b,d=this.aspect*c,e=-.5*d,f=this.view;if(null!==this.view&&this.view.enabled){var g=f.fullWidth,h=f.fullHeight;e+=f.offsetX*d/g;b-=f.offsetY*c/h;d*=f.width/g;c*=f.height/h}f=this.filmOffset;0!==f&&(e+=a*f/this.getFilmWidth());
this.projectionMatrix.makePerspective(e,e+d,b,b-c,a,this.far)},toJSON:function(a){a=H.prototype.toJSON.call(this,a);a.object.fov=this.fov;a.object.zoom=this.zoom;a.object.near=this.near;a.object.far=this.far;a.object.focus=this.focus;a.object.aspect=this.aspect;null!==this.view&&(a.object.view=Object.assign({},this.view));a.object.filmGauge=this.filmGauge;a.object.filmOffset=this.filmOffset;return a}});Hc.prototype=Object.assign(Object.create(Z.prototype),{constructor:Hc,isArrayCamera:!0});Vb.prototype.isFogExp2=
!0;Vb.prototype.clone=function(){return new Vb(this.color,this.density)};Vb.prototype.toJSON=function(){return{type:"FogExp2",color:this.color.getHex(),density:this.density}};Wb.prototype.isFog=!0;Wb.prototype.clone=function(){return new Wb(this.color,this.near,this.far)};Wb.prototype.toJSON=function(){return{type:"Fog",color:this.color.getHex(),near:this.near,far:this.far}};vd.prototype=Object.assign(Object.create(H.prototype),{constructor:vd,copy:function(a,b){H.prototype.copy.call(this,a,b);null!==
a.background&&(this.background=a.background.clone());null!==a.fog&&(this.fog=a.fog.clone());null!==a.overrideMaterial&&(this.overrideMaterial=a.overrideMaterial.clone());this.autoUpdate=a.autoUpdate;this.matrixAutoUpdate=a.matrixAutoUpdate;return this},toJSON:function(a){var b=H.prototype.toJSON.call(this,a);null!==this.background&&(b.object.background=this.background.toJSON(a));null!==this.fog&&(b.object.fog=this.fog.toJSON());return b}});ib.prototype=Object.create(I.prototype);ib.prototype.constructor=
ib;ib.prototype.isSpriteMaterial=!0;ib.prototype.copy=function(a){I.prototype.copy.call(this,a);this.color.copy(a.color);this.map=a.map;this.rotation=a.rotation;return this};Ic.prototype=Object.assign(Object.create(H.prototype),{constructor:Ic,isSprite:!0,raycast:function(){function a(a,b,c,d,h,l){e.subVectors(a,c).addScalar(.5).multiply(d);void 0!==h?(f.x=l*e.x-h*e.y,f.y=h*e.x+l*e.y):f.copy(e);a.copy(b);a.x+=f.x;a.y+=f.y;a.applyMatrix4(g)}var b=new p,c=new p,d=new p,e=new B,f=new B,g=new R,h=new p,
l=new p,m=new p;return function(e,f){c.setFromMatrixScale(this.matrixWorld);g.getInverse(this.modelViewMatrix).premultiply(this.matrixWorld);d.setFromMatrixPosition(this.modelViewMatrix);var k=this.material.rotation;if(0!==k){var n=Math.cos(k);var p=Math.sin(k)}k=this.center;a(h.set(-.5,-.5,0),d,k,c,p,n);a(l.set(.5,-.5,0),d,k,c,p,n);a(m.set(.5,.5,0),d,k,c,p,n);var v=e.ray.intersectTriangle(h,l,m,!1,b);if(null===v&&(a(l.set(-.5,.5,0),d,k,c,p,n),v=e.ray.intersectTriangle(h,m,l,!1,b),null===v))return;
p=e.ray.origin.distanceTo(b);p<e.near||p>e.far||f.push({distance:p,point:b.clone(),face:null,object:this})}}(),clone:function(){return(new this.constructor(this.material)).copy(this)},copy:function(a){H.prototype.copy.call(this,a);void 0!==a.center&&this.center.copy(a.center);return this}});Jc.prototype=Object.assign(Object.create(H.prototype),{constructor:Jc,copy:function(a){H.prototype.copy.call(this,a,!1);a=a.levels;for(var b=0,c=a.length;b<c;b++){var d=a[b];this.addLevel(d.object.clone(),d.distance)}return this},
addLevel:function(a,b){void 0===b&&(b=0);b=Math.abs(b);for(var c=this.levels,d=0;d<c.length&&!(b<c[d].distance);d++);c.splice(d,0,{distance:b,object:a});this.add(a)},getObjectForDistance:function(a){for(var b=this.levels,c=1,d=b.length;c<d&&!(a<b[c].distance);c++);return b[c-1].object},raycast:function(){var a=new p;return function(b,c){a.setFromMatrixPosition(this.matrixWorld);var d=b.ray.origin.distanceTo(a);this.getObjectForDistance(d).raycast(b,c)}}(),update:function(){var a=new p,b=new p;return function(c){var d=
this.levels;if(1<d.length){a.setFromMatrixPosition(c.matrixWorld);b.setFromMatrixPosition(this.matrixWorld);c=a.distanceTo(b);d[0].object.visible=!0;for(var e=1,f=d.length;e<f;e++)if(c>=d[e].distance)d[e-1].object.visible=!1,d[e].object.visible=!0;else break;for(;e<f;e++)d[e].object.visible=!1}}}(),toJSON:function(a){a=H.prototype.toJSON.call(this,a);a.object.levels=[];for(var b=this.levels,c=0,d=b.length;c<d;c++){var e=b[c];a.object.levels.push({object:e.object.uuid,distance:e.distance})}return a}});
Object.assign(Kc.prototype,{calculateInverses:function(){this.boneInverses=[];for(var a=0,b=this.bones.length;a<b;a++){var c=new R;this.bones[a]&&c.getInverse(this.bones[a].matrixWorld);this.boneInverses.push(c)}},pose:function(){var a,b;var c=0;for(b=this.bones.length;c<b;c++)(a=this.bones[c])&&a.matrixWorld.getInverse(this.boneInverses[c]);c=0;for(b=this.bones.length;c<b;c++)if(a=this.bones[c])a.parent&&a.parent.isBone?(a.matrix.getInverse(a.parent.matrixWorld),a.matrix.multiply(a.matrixWorld)):
a.matrix.copy(a.matrixWorld),a.matrix.decompose(a.position,a.quaternion,a.scale)},update:function(){var a=new R,b=new R;return function(){for(var c=this.bones,d=this.boneInverses,e=this.boneMatrices,f=this.boneTexture,g=0,h=c.length;g<h;g++)a.multiplyMatrices(c[g]?c[g].matrixWorld:b,d[g]),a.toArray(e,16*g);void 0!==f&&(f.needsUpdate=!0)}}(),clone:function(){return new Kc(this.bones,this.boneInverses)},getBoneByName:function(a){for(var b=0,c=this.bones.length;b<c;b++){var d=this.bones[b];if(d.name===
a)return d}}});wd.prototype=Object.assign(Object.create(H.prototype),{constructor:wd,isBone:!0});xd.prototype=Object.assign(Object.create(va.prototype),{constructor:xd,isSkinnedMesh:!0,initBones:function(){var a=[],b;if(this.geometry&&void 0!==this.geometry.bones){var c=0;for(b=this.geometry.bones.length;c<b;c++){var d=this.geometry.bones[c];var e=new wd;a.push(e);e.name=d.name;e.position.fromArray(d.pos);e.quaternion.fromArray(d.rotq);void 0!==d.scl&&e.scale.fromArray(d.scl)}c=0;for(b=this.geometry.bones.length;c<
b;c++)d=this.geometry.bones[c],-1!==d.parent&&null!==d.parent&&void 0!==a[d.parent]?a[d.parent].add(a[c]):this.add(a[c])}this.updateMatrixWorld(!0);return a},bind:function(a,b){this.skeleton=a;void 0===b&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),b=this.matrixWorld);this.bindMatrix.copy(b);this.bindMatrixInverse.getInverse(b)},pose:function(){this.skeleton.pose()},normalizeSkinWeights:function(){var a;if(this.geometry&&this.geometry.isGeometry)for(a=0;a<this.geometry.skinWeights.length;a++){var b=
this.geometry.skinWeights[a];var c=1/b.manhattanLength();Infinity!==c?b.multiplyScalar(c):b.set(1,0,0,0)}else if(this.geometry&&this.geometry.isBufferGeometry){b=new W;var d=this.geometry.attributes.skinWeight;for(a=0;a<d.count;a++)b.x=d.getX(a),b.y=d.getY(a),b.z=d.getZ(a),b.w=d.getW(a),c=1/b.manhattanLength(),Infinity!==c?b.multiplyScalar(c):b.set(1,0,0,0),d.setXYZW(a,b.x,b.y,b.z,b.w)}},updateMatrixWorld:function(a){va.prototype.updateMatrixWorld.call(this,a);"attached"===this.bindMode?this.bindMatrixInverse.getInverse(this.matrixWorld):
"detached"===this.bindMode?this.bindMatrixInverse.getInverse(this.bindMatrix):console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)},clone:function(){return(new this.constructor(this.geometry,this.material)).copy(this)}});T.prototype=Object.create(I.prototype);T.prototype.constructor=T;T.prototype.isLineBasicMaterial=!0;T.prototype.copy=function(a){I.prototype.copy.call(this,a);this.color.copy(a.color);this.linewidth=a.linewidth;this.linecap=a.linecap;this.linejoin=a.linejoin;return this};
wa.prototype=Object.assign(Object.create(H.prototype),{constructor:wa,isLine:!0,computeLineDistances:function(){var a=new p,b=new p;return function(){var c=this.geometry;if(c.isBufferGeometry)if(null===c.index){for(var d=c.attributes.position,e=[0],f=1,g=d.count;f<g;f++)a.fromBufferAttribute(d,f-1),b.fromBufferAttribute(d,f),e[f]=e[f-1],e[f]+=a.distanceTo(b);c.addAttribute("lineDistance",new z(e,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
else if(c.isGeometry)for(d=c.vertices,e=c.lineDistances,e[0]=0,f=1,g=d.length;f<g;f++)e[f]=e[f-1],e[f]+=d[f-1].distanceTo(d[f]);return this}}(),raycast:function(){var a=new R,b=new sb,c=new Ha;return function(d,e){var f=d.linePrecision;f*=f;var g=this.geometry,h=this.matrixWorld;null===g.boundingSphere&&g.computeBoundingSphere();c.copy(g.boundingSphere);c.applyMatrix4(h);if(!1!==d.ray.intersectsSphere(c)){a.getInverse(h);b.copy(d.ray).applyMatrix4(a);var l=new p,m=new p;h=new p;var k=new p,n=this&&
this.isLineSegments?2:1;if(g.isBufferGeometry){var t=g.index,q=g.attributes.position.array;if(null!==t){t=t.array;g=0;for(var r=t.length-1;g<r;g+=n){var u=t[g+1];l.fromArray(q,3*t[g]);m.fromArray(q,3*u);u=b.distanceSqToSegment(l,m,k,h);u>f||(k.applyMatrix4(this.matrixWorld),u=d.ray.origin.distanceTo(k),u<d.near||u>d.far||e.push({distance:u,point:h.clone().applyMatrix4(this.matrixWorld),index:g,face:null,faceIndex:null,object:this}))}}else for(g=0,r=q.length/3-1;g<r;g+=n)l.fromArray(q,3*g),m.fromArray(q,
3*g+3),u=b.distanceSqToSegment(l,m,k,h),u>f||(k.applyMatrix4(this.matrixWorld),u=d.ray.origin.distanceTo(k),u<d.near||u>d.far||e.push({distance:u,point:h.clone().applyMatrix4(this.matrixWorld),index:g,face:null,faceIndex:null,object:this}))}else if(g.isGeometry)for(l=g.vertices,m=l.length,g=0;g<m-1;g+=n)u=b.distanceSqToSegment(l[g],l[g+1],k,h),u>f||(k.applyMatrix4(this.matrixWorld),u=d.ray.origin.distanceTo(k),u<d.near||u>d.far||e.push({distance:u,point:h.clone().applyMatrix4(this.matrixWorld),index:g,
face:null,faceIndex:null,object:this}))}}}(),clone:function(){return(new this.constructor(this.geometry,this.material)).copy(this)}});Y.prototype=Object.assign(Object.create(wa.prototype),{constructor:Y,isLineSegments:!0,computeLineDistances:function(){var a=new p,b=new p;return function(){var c=this.geometry;if(c.isBufferGeometry)if(null===c.index){for(var d=c.attributes.position,e=[],f=0,g=d.count;f<g;f+=2)a.fromBufferAttribute(d,f),b.fromBufferAttribute(d,f+1),e[f]=0===f?0:e[f-1],e[f+1]=e[f]+a.distanceTo(b);
c.addAttribute("lineDistance",new z(e,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");else if(c.isGeometry)for(d=c.vertices,e=c.lineDistances,f=0,g=d.length;f<g;f+=2)a.copy(d[f]),b.copy(d[f+1]),e[f]=0===f?0:e[f-1],e[f+1]=e[f]+a.distanceTo(b);return this}}()});yd.prototype=Object.assign(Object.create(wa.prototype),{constructor:yd,isLineLoop:!0});Ja.prototype=Object.create(I.prototype);Ja.prototype.constructor=Ja;Ja.prototype.isPointsMaterial=
!0;Ja.prototype.copy=function(a){I.prototype.copy.call(this,a);this.color.copy(a.color);this.map=a.map;this.size=a.size;this.sizeAttenuation=a.sizeAttenuation;this.morphTargets=a.morphTargets;return this};Xb.prototype=Object.assign(Object.create(H.prototype),{constructor:Xb,isPoints:!0,raycast:function(){var a=new R,b=new sb,c=new Ha;return function(d,e){function f(a,c){var f=b.distanceSqToPoint(a);f<k&&(b.closestPointToPoint(a,n),n.applyMatrix4(l),a=d.ray.origin.distanceTo(n),a<d.near||a>d.far||
e.push({distance:a,distanceToRay:Math.sqrt(f),point:n.clone(),index:c,face:null,object:g}))}var g=this,h=this.geometry,l=this.matrixWorld,m=d.params.Points.threshold;null===h.boundingSphere&&h.computeBoundingSphere();c.copy(h.boundingSphere);c.applyMatrix4(l);c.radius+=m;if(!1!==d.ray.intersectsSphere(c)){a.getInverse(l);b.copy(d.ray).applyMatrix4(a);m/=(this.scale.x+this.scale.y+this.scale.z)/3;var k=m*m;m=new p;var n=new p;if(h.isBufferGeometry){var t=h.index;h=h.attributes.position.array;if(null!==
t){var q=t.array;t=0;for(var r=q.length;t<r;t++){var u=q[t];m.fromArray(h,3*u);f(m,u)}}else for(t=0,q=h.length/3;t<q;t++)m.fromArray(h,3*t),f(m,t)}else for(m=h.vertices,t=0,q=m.length;t<q;t++)f(m[t],t)}}}(),clone:function(){return(new this.constructor(this.geometry,this.material)).copy(this)}});be.prototype=Object.assign(Object.create(ea.prototype),{constructor:be,isVideoTexture:!0,update:function(){var a=this.image;a.readyState>=a.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}});Yb.prototype=Object.create(ea.prototype);
Yb.prototype.constructor=Yb;Yb.prototype.isCompressedTexture=!0;Lc.prototype=Object.create(ea.prototype);Lc.prototype.constructor=Lc;Lc.prototype.isDepthTexture=!0;Zb.prototype=Object.create(D.prototype);Zb.prototype.constructor=Zb;Mc.prototype=Object.create(P.prototype);Mc.prototype.constructor=Mc;$b.prototype=Object.create(D.prototype);$b.prototype.constructor=$b;Nc.prototype=Object.create(P.prototype);Nc.prototype.constructor=Nc;xa.prototype=Object.create(D.prototype);xa.prototype.constructor=
xa;Oc.prototype=Object.create(P.prototype);Oc.prototype.constructor=Oc;ac.prototype=Object.create(xa.prototype);ac.prototype.constructor=ac;Pc.prototype=Object.create(P.prototype);Pc.prototype.constructor=Pc;ub.prototype=Object.create(xa.prototype);ub.prototype.constructor=ub;Qc.prototype=Object.create(P.prototype);Qc.prototype.constructor=Qc;bc.prototype=Object.create(xa.prototype);bc.prototype.constructor=bc;Rc.prototype=Object.create(P.prototype);Rc.prototype.constructor=Rc;cc.prototype=Object.create(xa.prototype);
cc.prototype.constructor=cc;Sc.prototype=Object.create(P.prototype);Sc.prototype.constructor=Sc;dc.prototype=Object.create(D.prototype);dc.prototype.constructor=dc;Tc.prototype=Object.create(P.prototype);Tc.prototype.constructor=Tc;ec.prototype=Object.create(D.prototype);ec.prototype.constructor=ec;Uc.prototype=Object.create(P.prototype);Uc.prototype.constructor=Uc;fc.prototype=Object.create(D.prototype);fc.prototype.constructor=fc;var Ug={triangulate:function(a,b,c){c=c||2;var d=b&&b.length,e=d?
b[0]*c:a.length,f=cf(a,0,e,c,!0),g=[];if(!f)return g;var h;if(d){var l=c;d=[];var m;var k=0;for(m=b.length;k<m;k++){var n=b[k]*l;var p=k<m-1?b[k+1]*l:a.length;n=cf(a,n,p,l,!1);n===n.next&&(n.steiner=!0);d.push(Rg(n))}d.sort(Pg);for(k=0;k<d.length;k++){b=d[k];l=f;if(l=Qg(b,l))b=ff(l,b),Wc(b,b.next);f=Wc(f,f.next)}}if(a.length>80*c){var q=h=a[0];var r=d=a[1];for(l=c;l<e;l+=c)k=a[l],b=a[l+1],k<q&&(q=k),b<r&&(r=b),k>h&&(h=k),b>d&&(d=b);h=Math.max(h-q,d-r);h=0!==h?1/h:0}Xc(f,g,c,q,r,h);return g}},$a={area:function(a){for(var b=
a.length,c=0,d=b-1,e=0;e<b;d=e++)c+=a[d].x*a[e].y-a[e].x*a[d].y;return.5*c},isClockWise:function(a){return 0>$a.area(a)},triangulateShape:function(a,b){var c=[],d=[],e=[];gf(a);hf(c,a);var f=a.length;b.forEach(gf);for(a=0;a<b.length;a++)d.push(f),f+=b[a].length,hf(c,b[a]);b=Ug.triangulate(c,d);for(a=0;a<b.length;a+=3)e.push(b.slice(a,a+3));return e}};wb.prototype=Object.create(P.prototype);wb.prototype.constructor=wb;wb.prototype.toJSON=function(){var a=P.prototype.toJSON.call(this);return jf(this.parameters.shapes,
this.parameters.options,a)};Ta.prototype=Object.create(D.prototype);Ta.prototype.constructor=Ta;Ta.prototype.toJSON=function(){var a=D.prototype.toJSON.call(this);return jf(this.parameters.shapes,this.parameters.options,a)};var Sg={generateTopUV:function(a,b,c,d,e){a=b[3*d];d=b[3*d+1];var f=b[3*e];e=b[3*e+1];return[new B(b[3*c],b[3*c+1]),new B(a,d),new B(f,e)]},generateSideWallUV:function(a,b,c,d,e,f){a=b[3*c];var g=b[3*c+1];c=b[3*c+2];var h=b[3*d],l=b[3*d+1];d=b[3*d+2];var m=b[3*e],k=b[3*e+1];e=
b[3*e+2];var n=b[3*f],p=b[3*f+1];b=b[3*f+2];return.01>Math.abs(g-l)?[new B(a,1-c),new B(h,1-d),new B(m,1-e),new B(n,1-b)]:[new B(g,1-c),new B(l,1-d),new B(k,1-e),new B(p,1-b)]}};Zc.prototype=Object.create(P.prototype);Zc.prototype.constructor=Zc;gc.prototype=Object.create(Ta.prototype);gc.prototype.constructor=gc;$c.prototype=Object.create(P.prototype);$c.prototype.constructor=$c;xb.prototype=Object.create(D.prototype);xb.prototype.constructor=xb;ad.prototype=Object.create(P.prototype);ad.prototype.constructor=
ad;hc.prototype=Object.create(D.prototype);hc.prototype.constructor=hc;bd.prototype=Object.create(P.prototype);bd.prototype.constructor=bd;ic.prototype=Object.create(D.prototype);ic.prototype.constructor=ic;yb.prototype=Object.create(P.prototype);yb.prototype.constructor=yb;yb.prototype.toJSON=function(){var a=P.prototype.toJSON.call(this);return kf(this.parameters.shapes,a)};zb.prototype=Object.create(D.prototype);zb.prototype.constructor=zb;zb.prototype.toJSON=function(){var a=D.prototype.toJSON.call(this);
return kf(this.parameters.shapes,a)};jc.prototype=Object.create(D.prototype);jc.prototype.constructor=jc;Ab.prototype=Object.create(P.prototype);Ab.prototype.constructor=Ab;ab.prototype=Object.create(D.prototype);ab.prototype.constructor=ab;cd.prototype=Object.create(Ab.prototype);cd.prototype.constructor=cd;dd.prototype=Object.create(ab.prototype);dd.prototype.constructor=dd;ed.prototype=Object.create(P.prototype);ed.prototype.constructor=ed;kc.prototype=Object.create(D.prototype);kc.prototype.constructor=
kc;var ka=Object.freeze({WireframeGeometry:Zb,ParametricGeometry:Mc,ParametricBufferGeometry:$b,TetrahedronGeometry:Oc,TetrahedronBufferGeometry:ac,OctahedronGeometry:Pc,OctahedronBufferGeometry:ub,IcosahedronGeometry:Qc,IcosahedronBufferGeometry:bc,DodecahedronGeometry:Rc,DodecahedronBufferGeometry:cc,PolyhedronGeometry:Nc,PolyhedronBufferGeometry:xa,TubeGeometry:Sc,TubeBufferGeometry:dc,TorusKnotGeometry:Tc,TorusKnotBufferGeometry:ec,TorusGeometry:Uc,TorusBufferGeometry:fc,TextGeometry:Zc,TextBufferGeometry:gc,
SphereGeometry:$c,SphereBufferGeometry:xb,RingGeometry:ad,RingBufferGeometry:hc,PlaneGeometry:Fc,PlaneBufferGeometry:rb,LatheGeometry:bd,LatheBufferGeometry:ic,ShapeGeometry:yb,ShapeBufferGeometry:zb,ExtrudeGeometry:wb,ExtrudeBufferGeometry:Ta,EdgesGeometry:jc,ConeGeometry:cd,ConeBufferGeometry:dd,CylinderGeometry:Ab,CylinderBufferGeometry:ab,CircleGeometry:ed,CircleBufferGeometry:kc,BoxGeometry:Nb,BoxBufferGeometry:pb});Bb.prototype=Object.create(I.prototype);Bb.prototype.constructor=Bb;Bb.prototype.isShadowMaterial=
!0;Bb.prototype.copy=function(a){I.prototype.copy.call(this,a);this.color.copy(a.color);return this};lc.prototype=Object.create(Fa.prototype);lc.prototype.constructor=lc;lc.prototype.isRawShaderMaterial=!0;Ua.prototype=Object.create(I.prototype);Ua.prototype.constructor=Ua;Ua.prototype.isMeshStandardMaterial=!0;Ua.prototype.copy=function(a){I.prototype.copy.call(this,a);this.defines={STANDARD:""};this.color.copy(a.color);this.roughness=a.roughness;this.metalness=a.metalness;this.map=a.map;this.lightMap=
a.lightMap;this.lightMapIntensity=a.lightMapIntensity;this.aoMap=a.aoMap;this.aoMapIntensity=a.aoMapIntensity;this.emissive.copy(a.emissive);this.emissiveMap=a.emissiveMap;this.emissiveIntensity=a.emissiveIntensity;this.bumpMap=a.bumpMap;this.bumpScale=a.bumpScale;this.normalMap=a.normalMap;this.normalMapType=a.normalMapType;this.normalScale.copy(a.normalScale);this.displacementMap=a.displacementMap;this.displacementScale=a.displacementScale;this.displacementBias=a.displacementBias;this.roughnessMap=
a.roughnessMap;this.metalnessMap=a.metalnessMap;this.alphaMap=a.alphaMap;this.envMap=a.envMap;this.envMapIntensity=a.envMapIntensity;this.refractionRatio=a.refractionRatio;this.wireframe=a.wireframe;this.wireframeLinewidth=a.wireframeLinewidth;this.wireframeLinecap=a.wireframeLinecap;this.wireframeLinejoin=a.wireframeLinejoin;this.skinning=a.skinning;this.morphTargets=a.morphTargets;this.morphNormals=a.morphNormals;return this};Cb.prototype=Object.create(Ua.prototype);Cb.prototype.constructor=Cb;
Cb.prototype.isMeshPhysicalMaterial=!0;Cb.prototype.copy=function(a){Ua.prototype.copy.call(this,a);this.defines={PHYSICAL:""};this.reflectivity=a.reflectivity;this.clearCoat=a.clearCoat;this.clearCoatRoughness=a.clearCoatRoughness;return this};Ka.prototype=Object.create(I.prototype);Ka.prototype.constructor=Ka;Ka.prototype.isMeshPhongMaterial=!0;Ka.prototype.copy=function(a){I.prototype.copy.call(this,a);this.color.copy(a.color);this.specular.copy(a.specular);this.shininess=a.shininess;this.map=
a.map;this.lightMap=a.lightMap;this.lightMapIntensity=a.lightMapIntensity;this.aoMap=a.aoMap;this.aoMapIntensity=a.aoMapIntensity;this.emissive.copy(a.emissive);this.emissiveMap=a.emissiveMap;this.emissiveIntensity=a.emissiveIntensity;this.bumpMap=a.bumpMap;this.bumpScale=a.bumpScale;this.normalMap=a.normalMap;this.normalMapType=a.normalMapType;this.normalScale.copy(a.normalScale);this.displacementMap=a.displacementMap;this.displacementScale=a.displacementScale;this.displacementBias=a.displacementBias;
this.specularMap=a.specularMap;this.alphaMap=a.alphaMap;this.envMap=a.envMap;this.combine=a.combine;this.reflectivity=a.reflectivity;this.refractionRatio=a.refractionRatio;this.wireframe=a.wireframe;this.wireframeLinewidth=a.wireframeLinewidth;this.wireframeLinecap=a.wireframeLinecap;this.wireframeLinejoin=a.wireframeLinejoin;this.skinning=a.skinning;this.morphTargets=a.morphTargets;this.morphNormals=a.morphNormals;return this};Db.prototype=Object.create(Ka.prototype);Db.prototype.constructor=Db;
Db.prototype.isMeshToonMaterial=!0;Db.prototype.copy=function(a){Ka.prototype.copy.call(this,a);this.gradientMap=a.gradientMap;return this};Eb.prototype=Object.create(I.prototype);Eb.prototype.constructor=Eb;Eb.prototype.isMeshNormalMaterial=!0;Eb.prototype.copy=function(a){I.prototype.copy.call(this,a);this.bumpMap=a.bumpMap;this.bumpScale=a.bumpScale;this.normalMap=a.normalMap;this.normalMapType=a.normalMapType;this.normalScale.copy(a.normalScale);this.displacementMap=a.displacementMap;this.displacementScale=
a.displacementScale;this.displacementBias=a.displacementBias;this.wireframe=a.wireframe;this.wireframeLinewidth=a.wireframeLinewidth;this.skinning=a.skinning;this.morphTargets=a.morphTargets;this.morphNormals=a.morphNormals;return this};Fb.prototype=Object.create(I.prototype);Fb.prototype.constructor=Fb;Fb.prototype.isMeshLambertMaterial=!0;Fb.prototype.copy=function(a){I.prototype.copy.call(this,a);this.color.copy(a.color);this.map=a.map;this.lightMap=a.lightMap;this.lightMapIntensity=a.lightMapIntensity;
this.aoMap=a.aoMap;this.aoMapIntensity=a.aoMapIntensity;this.emissive.copy(a.emissive);this.emissiveMap=a.emissiveMap;this.emissiveIntensity=a.emissiveIntensity;this.specularMap=a.specularMap;this.alphaMap=a.alphaMap;this.envMap=a.envMap;this.combine=a.combine;this.reflectivity=a.reflectivity;this.refractionRatio=a.refractionRatio;this.wireframe=a.wireframe;this.wireframeLinewidth=a.wireframeLinewidth;this.wireframeLinecap=a.wireframeLinecap;this.wireframeLinejoin=a.wireframeLinejoin;this.skinning=
a.skinning;this.morphTargets=a.morphTargets;this.morphNormals=a.morphNormals;return this};Gb.prototype=Object.create(T.prototype);Gb.prototype.constructor=Gb;Gb.prototype.isLineDashedMaterial=!0;Gb.prototype.copy=function(a){T.prototype.copy.call(this,a);this.scale=a.scale;this.dashSize=a.dashSize;this.gapSize=a.gapSize;return this};var Vg=Object.freeze({ShadowMaterial:Bb,SpriteMaterial:ib,RawShaderMaterial:lc,ShaderMaterial:Fa,PointsMaterial:Ja,MeshPhysicalMaterial:Cb,MeshStandardMaterial:Ua,MeshPhongMaterial:Ka,
MeshToonMaterial:Db,MeshNormalMaterial:Eb,MeshLambertMaterial:Fb,MeshDepthMaterial:fb,MeshDistanceMaterial:gb,MeshBasicMaterial:ua,LineDashedMaterial:Gb,LineBasicMaterial:T,Material:I}),Kb={enabled:!1,files:{},add:function(a,b){!1!==this.enabled&&(this.files[a]=b)},get:function(a){if(!1!==this.enabled)return this.files[a]},remove:function(a){delete this.files[a]},clear:function(){this.files={}}},ya=new ee,cb={};Object.assign(La.prototype,{load:function(a,b,c,d){void 0===a&&(a="");void 0!==this.path&&
(a=this.path+a);a=this.manager.resolveURL(a);var e=this,f=Kb.get(a);if(void 0!==f)return e.manager.itemStart(a),setTimeout(function(){b&&b(f);e.manager.itemEnd(a)},0),f;if(void 0!==cb[a])cb[a].push({onLoad:b,onProgress:c,onError:d});else{var g=a.match(/^data:(.*?)(;base64)?,(.*)$/);if(g){c=g[1];var h=!!g[2];g=g[3];g=window.decodeURIComponent(g);h&&(g=window.atob(g));try{var l=(this.responseType||"").toLowerCase();switch(l){case "arraybuffer":case "blob":var m=new Uint8Array(g.length);for(h=0;h<g.length;h++)m[h]=
g.charCodeAt(h);var k="blob"===l?new Blob([m.buffer],{type:c}):m.buffer;break;case "document":k=(new DOMParser).parseFromString(g,c);break;case "json":k=JSON.parse(g);break;default:k=g}window.setTimeout(function(){b&&b(k);e.manager.itemEnd(a)},0)}catch(t){window.setTimeout(function(){d&&d(t);e.manager.itemEnd(a);e.manager.itemError(a)},0)}}else{cb[a]=[];cb[a].push({onLoad:b,onProgress:c,onError:d});var n=new XMLHttpRequest;n.open("GET",a,!0);n.addEventListener("load",function(b){var c=this.response;
Kb.add(a,c);var d=cb[a];delete cb[a];if(200===this.status||0===this.status){0===this.status&&console.warn("THREE.FileLoader: HTTP Status 0 received.");for(var f=0,g=d.length;f<g;f++){var h=d[f];if(h.onLoad)h.onLoad(c)}e.manager.itemEnd(a)}else{f=0;for(g=d.length;f<g;f++)if(h=d[f],h.onError)h.onError(b);e.manager.itemEnd(a);e.manager.itemError(a)}},!1);n.addEventListener("progress",function(b){for(var c=cb[a],d=0,e=c.length;d<e;d++){var f=c[d];if(f.onProgress)f.onProgress(b)}},!1);n.addEventListener("error",
function(b){var c=cb[a];delete cb[a];for(var d=0,f=c.length;d<f;d++){var g=c[d];if(g.onError)g.onError(b)}e.manager.itemEnd(a);e.manager.itemError(a)},!1);void 0!==this.responseType&&(n.responseType=this.responseType);void 0!==this.withCredentials&&(n.withCredentials=this.withCredentials);n.overrideMimeType&&n.overrideMimeType(void 0!==this.mimeType?this.mimeType:"text/plain");for(h in this.requestHeader)n.setRequestHeader(h,this.requestHeader[h]);n.send(null)}e.manager.itemStart(a);return n}},setPath:function(a){this.path=
a;return this},setResponseType:function(a){this.responseType=a;return this},setWithCredentials:function(a){this.withCredentials=a;return this},setMimeType:function(a){this.mimeType=a;return this},setRequestHeader:function(a){this.requestHeader=a;return this}});Object.assign(lf.prototype,{load:function(a,b,c,d){function e(e){l.load(a[e],function(a){a=f._parser(a,!0);g[e]={width:a.width,height:a.height,format:a.format,mipmaps:a.mipmaps};m+=1;6===m&&(1===a.mipmapCount&&(h.minFilter=1006),h.format=a.format,
h.needsUpdate=!0,b&&b(h))},c,d)}var f=this,g=[],h=new Yb;h.image=g;var l=new La(this.manager);l.setPath(this.path);l.setResponseType("arraybuffer");if(Array.isArray(a))for(var m=0,k=0,n=a.length;k<n;++k)e(k);else l.load(a,function(a){a=f._parser(a,!0);if(a.isCubemap)for(var c=a.mipmaps.length/a.mipmapCount,d=0;d<c;d++){g[d]={mipmaps:[]};for(var e=0;e<a.mipmapCount;e++)g[d].mipmaps.push(a.mipmaps[d*a.mipmapCount+e]),g[d].format=a.format,g[d].width=a.width,g[d].height=a.height}else h.image.width=a.width,
h.image.height=a.height,h.mipmaps=a.mipmaps;1===a.mipmapCount&&(h.minFilter=1006);h.format=a.format;h.needsUpdate=!0;b&&b(h)},c,d);return h},setPath:function(a){this.path=a;return this}});Object.assign(fe.prototype,{load:function(a,b,c,d){var e=this,f=new lb,g=new La(this.manager);g.setResponseType("arraybuffer");g.load(a,function(a){if(a=e._parser(a))void 0!==a.image?f.image=a.image:void 0!==a.data&&(f.image.width=a.width,f.image.height=a.height,f.image.data=a.data),f.wrapS=void 0!==a.wrapS?a.wrapS:
1001,f.wrapT=void 0!==a.wrapT?a.wrapT:1001,f.magFilter=void 0!==a.magFilter?a.magFilter:1006,f.minFilter=void 0!==a.minFilter?a.minFilter:1008,f.anisotropy=void 0!==a.anisotropy?a.anisotropy:1,void 0!==a.format&&(f.format=a.format),void 0!==a.type&&(f.type=a.type),void 0!==a.mipmaps&&(f.mipmaps=a.mipmaps),1===a.mipmapCount&&(f.minFilter=1006),f.needsUpdate=!0,b&&b(f,a)},c,d);return f}});Object.assign(fd.prototype,{crossOrigin:"anonymous",load:function(a,b,c,d){function e(){l.removeEventListener("load",
e,!1);l.removeEventListener("error",f,!1);Kb.add(a,this);b&&b(this);g.manager.itemEnd(a)}function f(b){l.removeEventListener("load",e,!1);l.removeEventListener("error",f,!1);d&&d(b);g.manager.itemEnd(a);g.manager.itemError(a)}void 0===a&&(a="");void 0!==this.path&&(a=this.path+a);a=this.manager.resolveURL(a);var g=this,h=Kb.get(a);if(void 0!==h)return g.manager.itemStart(a),setTimeout(function(){b&&b(h);g.manager.itemEnd(a)},0),h;var l=document.createElementNS("http://www.w3.org/1999/xhtml","img");
l.addEventListener("load",e,!1);l.addEventListener("error",f,!1);"data:"!==a.substr(0,5)&&void 0!==this.crossOrigin&&(l.crossOrigin=this.crossOrigin);g.manager.itemStart(a);l.src=a;return l},setCrossOrigin:function(a){this.crossOrigin=a;return this},setPath:function(a){this.path=a;return this}});Object.assign(ge.prototype,{crossOrigin:"anonymous",load:function(a,b,c,d){function e(c){g.load(a[c],function(a){f.images[c]=a;h++;6===h&&(f.needsUpdate=!0,b&&b(f))},void 0,d)}var f=new Za,g=new fd(this.manager);
g.setCrossOrigin(this.crossOrigin);g.setPath(this.path);var h=0;for(c=0;c<a.length;++c)e(c);return f},setCrossOrigin:function(a){this.crossOrigin=a;return this},setPath:function(a){this.path=a;return this}});Object.assign(Ad.prototype,{crossOrigin:"anonymous",load:function(a,b,c,d){var e=new ea,f=new fd(this.manager);f.setCrossOrigin(this.crossOrigin);f.setPath(this.path);f.load(a,function(c){e.image=c;c=0<a.search(/\.(jpg|jpeg)$/)||0===a.search(/^data:image\/jpeg/);e.format=c?1022:1023;e.needsUpdate=
!0;void 0!==b&&b(e)},c,d);return e},setCrossOrigin:function(a){this.crossOrigin=a;return this},setPath:function(a){this.path=a;return this}});Object.assign(E.prototype,{getPoint:function(){console.warn("THREE.Curve: .getPoint() not implemented.");return null},getPointAt:function(a,b){a=this.getUtoTmapping(a);return this.getPoint(a,b)},getPoints:function(a){void 0===a&&(a=5);for(var b=[],c=0;c<=a;c++)b.push(this.getPoint(c/a));return b},getSpacedPoints:function(a){void 0===a&&(a=5);for(var b=[],c=
0;c<=a;c++)b.push(this.getPointAt(c/a));return b},getLength:function(){var a=this.getLengths();return a[a.length-1]},getLengths:function(a){void 0===a&&(a=this.arcLengthDivisions);if(this.cacheArcLengths&&this.cacheArcLengths.length===a+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;var b=[],c=this.getPoint(0),d,e=0;b.push(0);for(d=1;d<=a;d++){var f=this.getPoint(d/a);e+=f.distanceTo(c);b.push(e);c=f}return this.cacheArcLengths=b},updateArcLengths:function(){this.needsUpdate=
!0;this.getLengths()},getUtoTmapping:function(a,b){var c=this.getLengths(),d=c.length;b=b?b:a*c[d-1];for(var e=0,f=d-1,g;e<=f;)if(a=Math.floor(e+(f-e)/2),g=c[a]-b,0>g)e=a+1;else if(0<g)f=a-1;else{f=a;break}a=f;if(c[a]===b)return a/(d-1);e=c[a];return(a+(b-e)/(c[a+1]-e))/(d-1)},getTangent:function(a){var b=a-1E-4;a+=1E-4;0>b&&(b=0);1<a&&(a=1);b=this.getPoint(b);return this.getPoint(a).clone().sub(b).normalize()},getTangentAt:function(a){a=this.getUtoTmapping(a);return this.getTangent(a)},computeFrenetFrames:function(a,
b){var c=new p,d=[],e=[],f=[],g=new p,h=new R,l;for(l=0;l<=a;l++){var m=l/a;d[l]=this.getTangentAt(m);d[l].normalize()}e[0]=new p;f[0]=new p;l=Number.MAX_VALUE;m=Math.abs(d[0].x);var k=Math.abs(d[0].y),n=Math.abs(d[0].z);m<=l&&(l=m,c.set(1,0,0));k<=l&&(l=k,c.set(0,1,0));n<=l&&c.set(0,0,1);g.crossVectors(d[0],c).normalize();e[0].crossVectors(d[0],g);f[0].crossVectors(d[0],e[0]);for(l=1;l<=a;l++)e[l]=e[l-1].clone(),f[l]=f[l-1].clone(),g.crossVectors(d[l-1],d[l]),g.length()>Number.EPSILON&&(g.normalize(),
c=Math.acos(J.clamp(d[l-1].dot(d[l]),-1,1)),e[l].applyMatrix4(h.makeRotationAxis(g,c))),f[l].crossVectors(d[l],e[l]);if(!0===b)for(c=Math.acos(J.clamp(e[0].dot(e[a]),-1,1)),c/=a,0<d[0].dot(g.crossVectors(e[0],e[a]))&&(c=-c),l=1;l<=a;l++)e[l].applyMatrix4(h.makeRotationAxis(d[l],c*l)),f[l].crossVectors(d[l],e[l]);return{tangents:d,normals:e,binormals:f}},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.arcLengthDivisions=a.arcLengthDivisions;return this},toJSON:function(){var a=
{metadata:{version:4.5,type:"Curve",generator:"Curve.toJSON"}};a.arcLengthDivisions=this.arcLengthDivisions;a.type=this.type;return a},fromJSON:function(a){this.arcLengthDivisions=a.arcLengthDivisions;return this}});Da.prototype=Object.create(E.prototype);Da.prototype.constructor=Da;Da.prototype.isEllipseCurve=!0;Da.prototype.getPoint=function(a,b){b=b||new B;for(var c=2*Math.PI,d=this.aEndAngle-this.aStartAngle,e=Math.abs(d)<Number.EPSILON;0>d;)d+=c;for(;d>c;)d-=c;d<Number.EPSILON&&(d=e?0:c);!0!==
this.aClockwise||e||(d=d===c?-c:d-c);c=this.aStartAngle+a*d;a=this.aX+this.xRadius*Math.cos(c);var f=this.aY+this.yRadius*Math.sin(c);0!==this.aRotation&&(c=Math.cos(this.aRotation),d=Math.sin(this.aRotation),e=a-this.aX,f-=this.aY,a=e*c-f*d+this.aX,f=e*d+f*c+this.aY);return b.set(a,f)};Da.prototype.copy=function(a){E.prototype.copy.call(this,a);this.aX=a.aX;this.aY=a.aY;this.xRadius=a.xRadius;this.yRadius=a.yRadius;this.aStartAngle=a.aStartAngle;this.aEndAngle=a.aEndAngle;this.aClockwise=a.aClockwise;
this.aRotation=a.aRotation;return this};Da.prototype.toJSON=function(){var a=E.prototype.toJSON.call(this);a.aX=this.aX;a.aY=this.aY;a.xRadius=this.xRadius;a.yRadius=this.yRadius;a.aStartAngle=this.aStartAngle;a.aEndAngle=this.aEndAngle;a.aClockwise=this.aClockwise;a.aRotation=this.aRotation;return a};Da.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,a);this.aX=a.aX;this.aY=a.aY;this.xRadius=a.xRadius;this.yRadius=a.yRadius;this.aStartAngle=a.aStartAngle;this.aEndAngle=a.aEndAngle;
this.aClockwise=a.aClockwise;this.aRotation=a.aRotation;return this};mc.prototype=Object.create(Da.prototype);mc.prototype.constructor=mc;mc.prototype.isArcCurve=!0;var Td=new p,Ce=new he,De=new he,Ee=new he;pa.prototype=Object.create(E.prototype);pa.prototype.constructor=pa;pa.prototype.isCatmullRomCurve3=!0;pa.prototype.getPoint=function(a,b){b=b||new p;var c=this.points,d=c.length;a*=d-(this.closed?0:1);var e=Math.floor(a);a-=e;this.closed?e+=0<e?0:(Math.floor(Math.abs(e)/d)+1)*d:0===a&&e===d-
1&&(e=d-2,a=1);if(this.closed||0<e)var f=c[(e-1)%d];else Td.subVectors(c[0],c[1]).add(c[0]),f=Td;var g=c[e%d];var h=c[(e+1)%d];this.closed||e+2<d?c=c[(e+2)%d]:(Td.subVectors(c[d-1],c[d-2]).add(c[d-1]),c=Td);if("centripetal"===this.curveType||"chordal"===this.curveType){var l="chordal"===this.curveType?.5:.25;d=Math.pow(f.distanceToSquared(g),l);e=Math.pow(g.distanceToSquared(h),l);l=Math.pow(h.distanceToSquared(c),l);1E-4>e&&(e=1);1E-4>d&&(d=e);1E-4>l&&(l=e);Ce.initNonuniformCatmullRom(f.x,g.x,h.x,
c.x,d,e,l);De.initNonuniformCatmullRom(f.y,g.y,h.y,c.y,d,e,l);Ee.initNonuniformCatmullRom(f.z,g.z,h.z,c.z,d,e,l)}else"catmullrom"===this.curveType&&(Ce.initCatmullRom(f.x,g.x,h.x,c.x,this.tension),De.initCatmullRom(f.y,g.y,h.y,c.y,this.tension),Ee.initCatmullRom(f.z,g.z,h.z,c.z,this.tension));b.set(Ce.calc(a),De.calc(a),Ee.calc(a));return b};pa.prototype.copy=function(a){E.prototype.copy.call(this,a);this.points=[];for(var b=0,c=a.points.length;b<c;b++)this.points.push(a.points[b].clone());this.closed=
a.closed;this.curveType=a.curveType;this.tension=a.tension;return this};pa.prototype.toJSON=function(){var a=E.prototype.toJSON.call(this);a.points=[];for(var b=0,c=this.points.length;b<c;b++)a.points.push(this.points[b].toArray());a.closed=this.closed;a.curveType=this.curveType;a.tension=this.tension;return a};pa.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,a);this.points=[];for(var b=0,c=a.points.length;b<c;b++){var d=a.points[b];this.points.push((new p).fromArray(d))}this.closed=
a.closed;this.curveType=a.curveType;this.tension=a.tension;return this};Ma.prototype=Object.create(E.prototype);Ma.prototype.constructor=Ma;Ma.prototype.isCubicBezierCurve=!0;Ma.prototype.getPoint=function(a,b){b=b||new B;var c=this.v0,d=this.v1,e=this.v2,f=this.v3;b.set(hd(a,c.x,d.x,e.x,f.x),hd(a,c.y,d.y,e.y,f.y));return b};Ma.prototype.copy=function(a){E.prototype.copy.call(this,a);this.v0.copy(a.v0);this.v1.copy(a.v1);this.v2.copy(a.v2);this.v3.copy(a.v3);return this};Ma.prototype.toJSON=function(){var a=
E.prototype.toJSON.call(this);a.v0=this.v0.toArray();a.v1=this.v1.toArray();a.v2=this.v2.toArray();a.v3=this.v3.toArray();return a};Ma.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,a);this.v0.fromArray(a.v0);this.v1.fromArray(a.v1);this.v2.fromArray(a.v2);this.v3.fromArray(a.v3);return this};Va.prototype=Object.create(E.prototype);Va.prototype.constructor=Va;Va.prototype.isCubicBezierCurve3=!0;Va.prototype.getPoint=function(a,b){b=b||new p;var c=this.v0,d=this.v1,e=this.v2,f=this.v3;
b.set(hd(a,c.x,d.x,e.x,f.x),hd(a,c.y,d.y,e.y,f.y),hd(a,c.z,d.z,e.z,f.z));return b};Va.prototype.copy=function(a){E.prototype.copy.call(this,a);this.v0.copy(a.v0);this.v1.copy(a.v1);this.v2.copy(a.v2);this.v3.copy(a.v3);return this};Va.prototype.toJSON=function(){var a=E.prototype.toJSON.call(this);a.v0=this.v0.toArray();a.v1=this.v1.toArray();a.v2=this.v2.toArray();a.v3=this.v3.toArray();return a};Va.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,a);this.v0.fromArray(a.v0);this.v1.fromArray(a.v1);
this.v2.fromArray(a.v2);this.v3.fromArray(a.v3);return this};ia.prototype=Object.create(E.prototype);ia.prototype.constructor=ia;ia.prototype.isLineCurve=!0;ia.prototype.getPoint=function(a,b){b=b||new B;1===a?b.copy(this.v2):(b.copy(this.v2).sub(this.v1),b.multiplyScalar(a).add(this.v1));return b};ia.prototype.getPointAt=function(a,b){return this.getPoint(a,b)};ia.prototype.getTangent=function(){return this.v2.clone().sub(this.v1).normalize()};ia.prototype.copy=function(a){E.prototype.copy.call(this,
a);this.v1.copy(a.v1);this.v2.copy(a.v2);return this};ia.prototype.toJSON=function(){var a=E.prototype.toJSON.call(this);a.v1=this.v1.toArray();a.v2=this.v2.toArray();return a};ia.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,a);this.v1.fromArray(a.v1);this.v2.fromArray(a.v2);return this};Na.prototype=Object.create(E.prototype);Na.prototype.constructor=Na;Na.prototype.isLineCurve3=!0;Na.prototype.getPoint=function(a,b){b=b||new p;1===a?b.copy(this.v2):(b.copy(this.v2).sub(this.v1),
b.multiplyScalar(a).add(this.v1));return b};Na.prototype.getPointAt=function(a,b){return this.getPoint(a,b)};Na.prototype.copy=function(a){E.prototype.copy.call(this,a);this.v1.copy(a.v1);this.v2.copy(a.v2);return this};Na.prototype.toJSON=function(){var a=E.prototype.toJSON.call(this);a.v1=this.v1.toArray();a.v2=this.v2.toArray();return a};Na.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,a);this.v1.fromArray(a.v1);this.v2.fromArray(a.v2);return this};Oa.prototype=Object.create(E.prototype);
Oa.prototype.constructor=Oa;Oa.prototype.isQuadraticBezierCurve=!0;Oa.prototype.getPoint=function(a,b){b=b||new B;var c=this.v0,d=this.v1,e=this.v2;b.set(gd(a,c.x,d.x,e.x),gd(a,c.y,d.y,e.y));return b};Oa.prototype.copy=function(a){E.prototype.copy.call(this,a);this.v0.copy(a.v0);this.v1.copy(a.v1);this.v2.copy(a.v2);return this};Oa.prototype.toJSON=function(){var a=E.prototype.toJSON.call(this);a.v0=this.v0.toArray();a.v1=this.v1.toArray();a.v2=this.v2.toArray();return a};Oa.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,
a);this.v0.fromArray(a.v0);this.v1.fromArray(a.v1);this.v2.fromArray(a.v2);return this};Wa.prototype=Object.create(E.prototype);Wa.prototype.constructor=Wa;Wa.prototype.isQuadraticBezierCurve3=!0;Wa.prototype.getPoint=function(a,b){b=b||new p;var c=this.v0,d=this.v1,e=this.v2;b.set(gd(a,c.x,d.x,e.x),gd(a,c.y,d.y,e.y),gd(a,c.z,d.z,e.z));return b};Wa.prototype.copy=function(a){E.prototype.copy.call(this,a);this.v0.copy(a.v0);this.v1.copy(a.v1);this.v2.copy(a.v2);return this};Wa.prototype.toJSON=function(){var a=
E.prototype.toJSON.call(this);a.v0=this.v0.toArray();a.v1=this.v1.toArray();a.v2=this.v2.toArray();return a};Wa.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,a);this.v0.fromArray(a.v0);this.v1.fromArray(a.v1);this.v2.fromArray(a.v2);return this};Pa.prototype=Object.create(E.prototype);Pa.prototype.constructor=Pa;Pa.prototype.isSplineCurve=!0;Pa.prototype.getPoint=function(a,b){b=b||new B;var c=this.points,d=(c.length-1)*a;a=Math.floor(d);d-=a;var e=c[0===a?a:a-1],f=c[a],g=c[a>c.length-
2?c.length-1:a+1];c=c[a>c.length-3?c.length-1:a+2];b.set(mf(d,e.x,f.x,g.x,c.x),mf(d,e.y,f.y,g.y,c.y));return b};Pa.prototype.copy=function(a){E.prototype.copy.call(this,a);this.points=[];for(var b=0,c=a.points.length;b<c;b++)this.points.push(a.points[b].clone());return this};Pa.prototype.toJSON=function(){var a=E.prototype.toJSON.call(this);a.points=[];for(var b=0,c=this.points.length;b<c;b++)a.points.push(this.points[b].toArray());return a};Pa.prototype.fromJSON=function(a){E.prototype.fromJSON.call(this,
a);this.points=[];for(var b=0,c=a.points.length;b<c;b++){var d=a.points[b];this.points.push((new B).fromArray(d))}return this};var Bf=Object.freeze({ArcCurve:mc,CatmullRomCurve3:pa,CubicBezierCurve:Ma,CubicBezierCurve3:Va,EllipseCurve:Da,LineCurve:ia,LineCurve3:Na,QuadraticBezierCurve:Oa,QuadraticBezierCurve3:Wa,SplineCurve:Pa});bb.prototype=Object.assign(Object.create(E.prototype),{constructor:bb,add:function(a){this.curves.push(a)},closePath:function(){var a=this.curves[0].getPoint(0),b=this.curves[this.curves.length-
1].getPoint(1);a.equals(b)||this.curves.push(new ia(b,a))},getPoint:function(a){var b=a*this.getLength(),c=this.getCurveLengths();for(a=0;a<c.length;){if(c[a]>=b)return b=c[a]-b,a=this.curves[a],c=a.getLength(),a.getPointAt(0===c?0:1-b/c);a++}return null},getLength:function(){var a=this.getCurveLengths();return a[a.length-1]},updateArcLengths:function(){this.needsUpdate=!0;this.cacheLengths=null;this.getCurveLengths()},getCurveLengths:function(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;
for(var a=[],b=0,c=0,d=this.curves.length;c<d;c++)b+=this.curves[c].getLength(),a.push(b);return this.cacheLengths=a},getSpacedPoints:function(a){void 0===a&&(a=40);for(var b=[],c=0;c<=a;c++)b.push(this.getPoint(c/a));this.autoClose&&b.push(b[0]);return b},getPoints:function(a){a=a||12;for(var b=[],c,d=0,e=this.curves;d<e.length;d++){var f=e[d];f=f.getPoints(f&&f.isEllipseCurve?2*a:f&&(f.isLineCurve||f.isLineCurve3)?1:f&&f.isSplineCurve?a*f.points.length:a);for(var g=0;g<f.length;g++){var h=f[g];
c&&c.equals(h)||(b.push(h),c=h)}}this.autoClose&&1<b.length&&!b[b.length-1].equals(b[0])&&b.push(b[0]);return b},copy:function(a){E.prototype.copy.call(this,a);this.curves=[];for(var b=0,c=a.curves.length;b<c;b++)this.curves.push(a.curves[b].clone());this.autoClose=a.autoClose;return this},toJSON:function(){var a=E.prototype.toJSON.call(this);a.autoClose=this.autoClose;a.curves=[];for(var b=0,c=this.curves.length;b<c;b++)a.curves.push(this.curves[b].toJSON());return a},fromJSON:function(a){E.prototype.fromJSON.call(this,
a);this.autoClose=a.autoClose;this.curves=[];for(var b=0,c=a.curves.length;b<c;b++){var d=a.curves[b];this.curves.push((new Bf[d.type]).fromJSON(d))}return this}});Qa.prototype=Object.assign(Object.create(bb.prototype),{constructor:Qa,setFromPoints:function(a){this.moveTo(a[0].x,a[0].y);for(var b=1,c=a.length;b<c;b++)this.lineTo(a[b].x,a[b].y)},moveTo:function(a,b){this.currentPoint.set(a,b)},lineTo:function(a,b){var c=new ia(this.currentPoint.clone(),new B(a,b));this.curves.push(c);this.currentPoint.set(a,
b)},quadraticCurveTo:function(a,b,c,d){a=new Oa(this.currentPoint.clone(),new B(a,b),new B(c,d));this.curves.push(a);this.currentPoint.set(c,d)},bezierCurveTo:function(a,b,c,d,e,f){a=new Ma(this.currentPoint.clone(),new B(a,b),new B(c,d),new B(e,f));this.curves.push(a);this.currentPoint.set(e,f)},splineThru:function(a){var b=[this.currentPoint.clone()].concat(a);b=new Pa(b);this.curves.push(b);this.currentPoint.copy(a[a.length-1])},arc:function(a,b,c,d,e,f){this.absarc(a+this.currentPoint.x,b+this.currentPoint.y,
c,d,e,f)},absarc:function(a,b,c,d,e,f){this.absellipse(a,b,c,c,d,e,f)},ellipse:function(a,b,c,d,e,f,g,h){this.absellipse(a+this.currentPoint.x,b+this.currentPoint.y,c,d,e,f,g,h)},absellipse:function(a,b,c,d,e,f,g,h){a=new Da(a,b,c,d,e,f,g,h);0<this.curves.length&&(b=a.getPoint(0),b.equals(this.currentPoint)||this.lineTo(b.x,b.y));this.curves.push(a);a=a.getPoint(1);this.currentPoint.copy(a)},copy:function(a){bb.prototype.copy.call(this,a);this.currentPoint.copy(a.currentPoint);return this},toJSON:function(){var a=
bb.prototype.toJSON.call(this);a.currentPoint=this.currentPoint.toArray();return a},fromJSON:function(a){bb.prototype.fromJSON.call(this,a);this.currentPoint.fromArray(a.currentPoint);return this}});jb.prototype=Object.assign(Object.create(Qa.prototype),{constructor:jb,getPointsHoles:function(a){for(var b=[],c=0,d=this.holes.length;c<d;c++)b[c]=this.holes[c].getPoints(a);return b},extractPoints:function(a){return{shape:this.getPoints(a),holes:this.getPointsHoles(a)}},copy:function(a){Qa.prototype.copy.call(this,
a);this.holes=[];for(var b=0,c=a.holes.length;b<c;b++)this.holes.push(a.holes[b].clone());return this},toJSON:function(){var a=Qa.prototype.toJSON.call(this);a.uuid=this.uuid;a.holes=[];for(var b=0,c=this.holes.length;b<c;b++)a.holes.push(this.holes[b].toJSON());return a},fromJSON:function(a){Qa.prototype.fromJSON.call(this,a);this.uuid=a.uuid;this.holes=[];for(var b=0,c=a.holes.length;b<c;b++){var d=a.holes[b];this.holes.push((new Qa).fromJSON(d))}return this}});X.prototype=Object.assign(Object.create(H.prototype),
{constructor:X,isLight:!0,copy:function(a){H.prototype.copy.call(this,a);this.color.copy(a.color);this.intensity=a.intensity;return this},toJSON:function(a){a=H.prototype.toJSON.call(this,a);a.object.color=this.color.getHex();a.object.intensity=this.intensity;void 0!==this.groundColor&&(a.object.groundColor=this.groundColor.getHex());void 0!==this.distance&&(a.object.distance=this.distance);void 0!==this.angle&&(a.object.angle=this.angle);void 0!==this.decay&&(a.object.decay=this.decay);void 0!==
this.penumbra&&(a.object.penumbra=this.penumbra);void 0!==this.shadow&&(a.object.shadow=this.shadow.toJSON());return a}});Bd.prototype=Object.assign(Object.create(X.prototype),{constructor:Bd,isHemisphereLight:!0,copy:function(a){X.prototype.copy.call(this,a);this.groundColor.copy(a.groundColor);return this}});Object.assign(Hb.prototype,{copy:function(a){this.camera=a.camera.clone();this.bias=a.bias;this.radius=a.radius;this.mapSize.copy(a.mapSize);return this},clone:function(){return(new this.constructor).copy(this)},
toJSON:function(){var a={};0!==this.bias&&(a.bias=this.bias);1!==this.radius&&(a.radius=this.radius);if(512!==this.mapSize.x||512!==this.mapSize.y)a.mapSize=this.mapSize.toArray();a.camera=this.camera.toJSON(!1).object;delete a.camera.matrix;return a}});Cd.prototype=Object.assign(Object.create(Hb.prototype),{constructor:Cd,isSpotLightShadow:!0,update:function(a){var b=this.camera,c=2*J.RAD2DEG*a.angle,d=this.mapSize.width/this.mapSize.height;a=a.distance||b.far;if(c!==b.fov||d!==b.aspect||a!==b.far)b.fov=
c,b.aspect=d,b.far=a,b.updateProjectionMatrix()}});Dd.prototype=Object.assign(Object.create(X.prototype),{constructor:Dd,isSpotLight:!0,copy:function(a){X.prototype.copy.call(this,a);this.distance=a.distance;this.angle=a.angle;this.penumbra=a.penumbra;this.decay=a.decay;this.target=a.target.clone();this.shadow=a.shadow.clone();return this}});Ed.prototype=Object.assign(Object.create(X.prototype),{constructor:Ed,isPointLight:!0,copy:function(a){X.prototype.copy.call(this,a);this.distance=a.distance;
this.decay=a.decay;this.shadow=a.shadow.clone();return this}});Fd.prototype=Object.assign(Object.create(Hb.prototype),{constructor:Fd});Gd.prototype=Object.assign(Object.create(X.prototype),{constructor:Gd,isDirectionalLight:!0,copy:function(a){X.prototype.copy.call(this,a);this.target=a.target.clone();this.shadow=a.shadow.clone();return this}});Hd.prototype=Object.assign(Object.create(X.prototype),{constructor:Hd,isAmbientLight:!0});Id.prototype=Object.assign(Object.create(X.prototype),{constructor:Id,
isRectAreaLight:!0,copy:function(a){X.prototype.copy.call(this,a);this.width=a.width;this.height=a.height;return this},toJSON:function(a){a=X.prototype.toJSON.call(this,a);a.object.width=this.width;a.object.height=this.height;return a}});Jd.prototype=Object.assign(Object.create(ja.prototype),{constructor:Jd,ValueTypeName:"string",ValueBufferType:Array,DefaultInterpolation:2300,InterpolantFactoryMethodLinear:void 0,InterpolantFactoryMethodSmooth:void 0});Kd.prototype=Object.assign(Object.create(ja.prototype),
{constructor:Kd,ValueTypeName:"bool",ValueBufferType:Array,DefaultInterpolation:2300,InterpolantFactoryMethodLinear:void 0,InterpolantFactoryMethodSmooth:void 0});Object.assign(Ea.prototype,{evaluate:function(a){var b=this.parameterPositions,c=this._cachedIndex,d=b[c],e=b[c-1];a:{b:{c:{d:if(!(a<d)){for(var f=c+2;;){if(void 0===d){if(a<e)break d;this._cachedIndex=c=b.length;return this.afterEnd_(c-1,a,e)}if(c===f)break;e=d;d=b[++c];if(a<d)break b}d=b.length;break c}if(a>=e)break a;else{f=b[1];a<f&&
(c=2,e=f);for(f=c-2;;){if(void 0===e)return this._cachedIndex=0,this.beforeStart_(0,a,d);if(c===f)break;d=e;e=b[--c-1];if(a>=e)break b}d=c;c=0}}for(;c<d;)e=c+d>>>1,a<b[e]?d=e:c=e+1;d=b[c];e=b[c-1];if(void 0===e)return this._cachedIndex=0,this.beforeStart_(0,a,d);if(void 0===d)return this._cachedIndex=c=b.length,this.afterEnd_(c-1,e,a)}this._cachedIndex=c;this.intervalChanged_(c,e,d)}return this.interpolate_(c,e,a,d)},settings:null,DefaultSettings_:{},getSettings_:function(){return this.settings||
this.DefaultSettings_},copySampleValue_:function(a){var b=this.resultBuffer,c=this.sampleValues,d=this.valueSize;a*=d;for(var e=0;e!==d;++e)b[e]=c[a+e];return b},interpolate_:function(){throw Error("call to abstract method");},intervalChanged_:function(){}});Object.assign(Ea.prototype,{beforeStart_:Ea.prototype.copySampleValue_,afterEnd_:Ea.prototype.copySampleValue_});Ld.prototype=Object.assign(Object.create(Ea.prototype),{constructor:Ld,interpolate_:function(a,b,c,d){var e=this.resultBuffer,f=this.sampleValues,
g=this.valueSize;a*=g;b=(c-b)/(d-b);for(c=a+g;a!==c;a+=4)ca.slerpFlat(e,0,f,a-g,f,a,b);return e}});id.prototype=Object.assign(Object.create(ja.prototype),{constructor:id,ValueTypeName:"quaternion",DefaultInterpolation:2301,InterpolantFactoryMethodLinear:function(a){return new Ld(this.times,this.values,this.getValueSize(),a)},InterpolantFactoryMethodSmooth:void 0});Md.prototype=Object.assign(Object.create(ja.prototype),{constructor:Md,ValueTypeName:"color"});nc.prototype=Object.assign(Object.create(ja.prototype),
{constructor:nc,ValueTypeName:"number"});Nd.prototype=Object.assign(Object.create(Ea.prototype),{constructor:Nd,DefaultSettings_:{endingStart:2400,endingEnd:2400},intervalChanged_:function(a,b,c){var d=this.parameterPositions,e=a-2,f=a+1,g=d[e],h=d[f];if(void 0===g)switch(this.getSettings_().endingStart){case 2401:e=a;g=2*b-c;break;case 2402:e=d.length-2;g=b+d[e]-d[e+1];break;default:e=a,g=c}if(void 0===h)switch(this.getSettings_().endingEnd){case 2401:f=a;h=2*c-b;break;case 2402:f=1;h=c+d[1]-d[0];
break;default:f=a-1,h=b}a=.5*(c-b);d=this.valueSize;this._weightPrev=a/(b-g);this._weightNext=a/(h-c);this._offsetPrev=e*d;this._offsetNext=f*d},interpolate_:function(a,b,c,d){var e=this.resultBuffer,f=this.sampleValues,g=this.valueSize;a*=g;var h=a-g,l=this._offsetPrev,m=this._offsetNext,k=this._weightPrev,n=this._weightNext,p=(c-b)/(d-b);c=p*p;d=c*p;b=-k*d+2*k*c-k*p;k=(1+k)*d+(-1.5-2*k)*c+(-.5+k)*p+1;p=(-1-n)*d+(1.5+n)*c+.5*p;n=n*d-n*c;for(c=0;c!==g;++c)e[c]=b*f[l+c]+k*f[h+c]+p*f[a+c]+n*f[m+c];
return e}});jd.prototype=Object.assign(Object.create(Ea.prototype),{constructor:jd,interpolate_:function(a,b,c,d){var e=this.resultBuffer,f=this.sampleValues,g=this.valueSize;a*=g;var h=a-g;b=(c-b)/(d-b);c=1-b;for(d=0;d!==g;++d)e[d]=f[h+d]*c+f[a+d]*b;return e}});Od.prototype=Object.assign(Object.create(Ea.prototype),{constructor:Od,interpolate_:function(a){return this.copySampleValue_(a-1)}});var na={arraySlice:function(a,b,c){return na.isTypedArray(a)?new a.constructor(a.subarray(b,void 0!==c?c:
a.length)):a.slice(b,c)},convertArray:function(a,b,c){return!a||!c&&a.constructor===b?a:"number"===typeof b.BYTES_PER_ELEMENT?new b(a):Array.prototype.slice.call(a)},isTypedArray:function(a){return ArrayBuffer.isView(a)&&!(a instanceof DataView)},getKeyframeOrder:function(a){for(var b=a.length,c=Array(b),d=0;d!==b;++d)c[d]=d;c.sort(function(b,c){return a[b]-a[c]});return c},sortedArray:function(a,b,c){for(var d=a.length,e=new a.constructor(d),f=0,g=0;g!==d;++f)for(var h=c[f]*b,l=0;l!==b;++l)e[g++]=
a[h+l];return e},flattenJSON:function(a,b,c,d){for(var e=1,f=a[0];void 0!==f&&void 0===f[d];)f=a[e++];if(void 0!==f){var g=f[d];if(void 0!==g)if(Array.isArray(g)){do g=f[d],void 0!==g&&(b.push(f.time),c.push.apply(c,g)),f=a[e++];while(void 0!==f)}else if(void 0!==g.toArray){do g=f[d],void 0!==g&&(b.push(f.time),g.toArray(c,c.length)),f=a[e++];while(void 0!==f)}else{do g=f[d],void 0!==g&&(b.push(f.time),c.push(g)),f=a[e++];while(void 0!==f)}}}};Object.assign(ja,{parse:function(a){if(void 0===a.type)throw Error("THREE.KeyframeTrack: track type undefined, can not parse");
var b=ja._getTrackTypeForValueTypeName(a.type);if(void 0===a.times){var c=[],d=[];na.flattenJSON(a.keys,c,d,"value");a.times=c;a.values=d}return void 0!==b.parse?b.parse(a):new b(a.name,a.times,a.values,a.interpolation)},toJSON:function(a){var b=a.constructor;if(void 0!==b.toJSON)b=b.toJSON(a);else{b={name:a.name,times:na.convertArray(a.times,Array),values:na.convertArray(a.values,Array)};var c=a.getInterpolation();c!==a.DefaultInterpolation&&(b.interpolation=c)}b.type=a.ValueTypeName;return b},_getTrackTypeForValueTypeName:function(a){switch(a.toLowerCase()){case "scalar":case "double":case "float":case "number":case "integer":return nc;
case "vector":case "vector2":case "vector3":case "vector4":return oc;case "color":return Md;case "quaternion":return id;case "bool":case "boolean":return Kd;case "string":return Jd}throw Error("THREE.KeyframeTrack: Unsupported typeName: "+a);}});Object.assign(ja.prototype,{constructor:ja,TimeBufferType:Float32Array,ValueBufferType:Float32Array,DefaultInterpolation:2301,InterpolantFactoryMethodDiscrete:function(a){return new Od(this.times,this.values,this.getValueSize(),a)},InterpolantFactoryMethodLinear:function(a){return new jd(this.times,
this.values,this.getValueSize(),a)},InterpolantFactoryMethodSmooth:function(a){return new Nd(this.times,this.values,this.getValueSize(),a)},setInterpolation:function(a){switch(a){case 2300:var b=this.InterpolantFactoryMethodDiscrete;break;case 2301:b=this.InterpolantFactoryMethodLinear;break;case 2302:b=this.InterpolantFactoryMethodSmooth}if(void 0===b){b="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(void 0===this.createInterpolant)if(a!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);
else throw Error(b);console.warn("THREE.KeyframeTrack:",b)}else this.createInterpolant=b},getInterpolation:function(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302}},getValueSize:function(){return this.values.length/this.times.length},shift:function(a){if(0!==a)for(var b=this.times,c=0,d=b.length;c!==d;++c)b[c]+=a;return this},scale:function(a){if(1!==a)for(var b=
this.times,c=0,d=b.length;c!==d;++c)b[c]*=a;return this},trim:function(a,b){for(var c=this.times,d=c.length,e=0,f=d-1;e!==d&&c[e]<a;)++e;for(;-1!==f&&c[f]>b;)--f;++f;if(0!==e||f!==d)e>=f&&(f=Math.max(f,1),e=f-1),a=this.getValueSize(),this.times=na.arraySlice(c,e,f),this.values=na.arraySlice(this.values,e*a,f*a);return this},validate:function(){var a=!0,b=this.getValueSize();0!==b-Math.floor(b)&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),a=!1);var c=this.times;b=this.values;
var d=c.length;0===d&&(console.error("THREE.KeyframeTrack: Track is empty.",this),a=!1);for(var e=null,f=0;f!==d;f++){var g=c[f];if("number"===typeof g&&isNaN(g)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,f,g);a=!1;break}if(null!==e&&e>g){console.error("THREE.KeyframeTrack: Out of order keys.",this,f,g,e);a=!1;break}e=g}if(void 0!==b&&na.isTypedArray(b))for(f=0,c=b.length;f!==c;++f)if(d=b[f],isNaN(d)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,
f,d);a=!1;break}return a},optimize:function(){for(var a=this.times,b=this.values,c=this.getValueSize(),d=2302===this.getInterpolation(),e=1,f=a.length-1,g=1;g<f;++g){var h=!1,l=a[g];if(l!==a[g+1]&&(1!==g||l!==l[0]))if(d)h=!0;else{var k=g*c,p=k-c,n=k+c;for(l=0;l!==c;++l){var t=b[k+l];if(t!==b[p+l]||t!==b[n+l]){h=!0;break}}}if(h){if(g!==e)for(a[e]=a[g],h=g*c,k=e*c,l=0;l!==c;++l)b[k+l]=b[h+l];++e}}if(0<f){a[e]=a[f];h=f*c;k=e*c;for(l=0;l!==c;++l)b[k+l]=b[h+l];++e}e!==a.length&&(this.times=na.arraySlice(a,
0,e),this.values=na.arraySlice(b,0,e*c));return this}});oc.prototype=Object.assign(Object.create(ja.prototype),{constructor:oc,ValueTypeName:"vector"});Object.assign(Ga,{parse:function(a){for(var b=[],c=a.tracks,d=1/(a.fps||1),e=0,f=c.length;e!==f;++e)b.push(ja.parse(c[e]).scale(d));return new Ga(a.name,a.duration,b)},toJSON:function(a){var b=[],c=a.tracks;a={name:a.name,duration:a.duration,tracks:b,uuid:a.uuid};for(var d=0,e=c.length;d!==e;++d)b.push(ja.toJSON(c[d]));return a},CreateFromMorphTargetSequence:function(a,
b,c,d){for(var e=b.length,f=[],g=0;g<e;g++){var h=[],l=[];h.push((g+e-1)%e,g,(g+1)%e);l.push(0,1,0);var k=na.getKeyframeOrder(h);h=na.sortedArray(h,1,k);l=na.sortedArray(l,1,k);d||0!==h[0]||(h.push(e),l.push(l[0]));f.push((new nc(".morphTargetInfluences["+b[g].name+"]",h,l)).scale(1/c))}return new Ga(a,-1,f)},findByName:function(a,b){var c=a;Array.isArray(a)||(c=a.geometry&&a.geometry.animations||a.animations);for(a=0;a<c.length;a++)if(c[a].name===b)return c[a];return null},CreateClipsFromMorphTargetSequences:function(a,
b,c){for(var d={},e=/^([\w-]*?)([\d]+)$/,f=0,g=a.length;f<g;f++){var h=a[f],l=h.name.match(e);if(l&&1<l.length){var k=l[1];(l=d[k])||(d[k]=l=[]);l.push(h)}}a=[];for(k in d)a.push(Ga.CreateFromMorphTargetSequence(k,d[k],b,c));return a},parseAnimation:function(a,b){if(!a)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;var c=function(a,b,c,d,e){if(0!==c.length){var f=[],g=[];na.flattenJSON(c,f,g,d);0!==f.length&&e.push(new a(b,f,g))}},d=[],e=a.name||"default",f=a.length||
-1,g=a.fps||30;a=a.hierarchy||[];for(var h=0;h<a.length;h++){var l=a[h].keys;if(l&&0!==l.length)if(l[0].morphTargets){f={};for(var k=0;k<l.length;k++)if(l[k].morphTargets)for(var p=0;p<l[k].morphTargets.length;p++)f[l[k].morphTargets[p]]=-1;for(var n in f){var t=[],q=[];for(p=0;p!==l[k].morphTargets.length;++p){var r=l[k];t.push(r.time);q.push(r.morphTarget===n?1:0)}d.push(new nc(".morphTargetInfluence["+n+"]",t,q))}f=f.length*(g||1)}else k=".bones["+b[h].name+"]",c(oc,k+".position",l,"pos",d),c(id,
k+".quaternion",l,"rot",d),c(oc,k+".scale",l,"scl",d)}return 0===d.length?null:new Ga(e,f,d)}});Object.assign(Ga.prototype,{resetDuration:function(){for(var a=0,b=0,c=this.tracks.length;b!==c;++b){var d=this.tracks[b];a=Math.max(a,d.times[d.times.length-1])}this.duration=a},trim:function(){for(var a=0;a<this.tracks.length;a++)this.tracks[a].trim(0,this.duration);return this},optimize:function(){for(var a=0;a<this.tracks.length;a++)this.tracks[a].optimize();return this}});Object.assign(Pd.prototype,
{load:function(a,b,c,d){var e=this;(new La(e.manager)).load(a,function(a){b(e.parse(JSON.parse(a)))},c,d)},setTextures:function(a){this.textures=a},parse:function(a){function b(a){void 0===c[a]&&console.warn("THREE.MaterialLoader: Undefined texture",a);return c[a]}var c=this.textures,d=new Vg[a.type];void 0!==a.uuid&&(d.uuid=a.uuid);void 0!==a.name&&(d.name=a.name);void 0!==a.color&&d.color.setHex(a.color);void 0!==a.roughness&&(d.roughness=a.roughness);void 0!==a.metalness&&(d.metalness=a.metalness);
void 0!==a.emissive&&d.emissive.setHex(a.emissive);void 0!==a.specular&&d.specular.setHex(a.specular);void 0!==a.shininess&&(d.shininess=a.shininess);void 0!==a.clearCoat&&(d.clearCoat=a.clearCoat);void 0!==a.clearCoatRoughness&&(d.clearCoatRoughness=a.clearCoatRoughness);void 0!==a.uniforms&&(d.uniforms=a.uniforms);void 0!==a.vertexShader&&(d.vertexShader=a.vertexShader);void 0!==a.fragmentShader&&(d.fragmentShader=a.fragmentShader);void 0!==a.vertexColors&&(d.vertexColors=a.vertexColors);void 0!==
a.fog&&(d.fog=a.fog);void 0!==a.flatShading&&(d.flatShading=a.flatShading);void 0!==a.blending&&(d.blending=a.blending);void 0!==a.side&&(d.side=a.side);void 0!==a.opacity&&(d.opacity=a.opacity);void 0!==a.transparent&&(d.transparent=a.transparent);void 0!==a.alphaTest&&(d.alphaTest=a.alphaTest);void 0!==a.depthTest&&(d.depthTest=a.depthTest);void 0!==a.depthWrite&&(d.depthWrite=a.depthWrite);void 0!==a.colorWrite&&(d.colorWrite=a.colorWrite);void 0!==a.wireframe&&(d.wireframe=a.wireframe);void 0!==
a.wireframeLinewidth&&(d.wireframeLinewidth=a.wireframeLinewidth);void 0!==a.wireframeLinecap&&(d.wireframeLinecap=a.wireframeLinecap);void 0!==a.wireframeLinejoin&&(d.wireframeLinejoin=a.wireframeLinejoin);void 0!==a.rotation&&(d.rotation=a.rotation);1!==a.linewidth&&(d.linewidth=a.linewidth);void 0!==a.dashSize&&(d.dashSize=a.dashSize);void 0!==a.gapSize&&(d.gapSize=a.gapSize);void 0!==a.scale&&(d.scale=a.scale);void 0!==a.polygonOffset&&(d.polygonOffset=a.polygonOffset);void 0!==a.polygonOffsetFactor&&
(d.polygonOffsetFactor=a.polygonOffsetFactor);void 0!==a.polygonOffsetUnits&&(d.polygonOffsetUnits=a.polygonOffsetUnits);void 0!==a.skinning&&(d.skinning=a.skinning);void 0!==a.morphTargets&&(d.morphTargets=a.morphTargets);void 0!==a.dithering&&(d.dithering=a.dithering);void 0!==a.visible&&(d.visible=a.visible);void 0!==a.userData&&(d.userData=a.userData);void 0!==a.shading&&(d.flatShading=1===a.shading);void 0!==a.size&&(d.size=a.size);void 0!==a.sizeAttenuation&&(d.sizeAttenuation=a.sizeAttenuation);
void 0!==a.map&&(d.map=b(a.map));void 0!==a.alphaMap&&(d.alphaMap=b(a.alphaMap),d.transparent=!0);void 0!==a.bumpMap&&(d.bumpMap=b(a.bumpMap));void 0!==a.bumpScale&&(d.bumpScale=a.bumpScale);void 0!==a.normalMap&&(d.normalMap=b(a.normalMap));void 0!==a.normalMapType&&(d.normalMapType=a.normalMapType);if(void 0!==a.normalScale){var e=a.normalScale;!1===Array.isArray(e)&&(e=[e,e]);d.normalScale=(new B).fromArray(e)}void 0!==a.displacementMap&&(d.displacementMap=b(a.displacementMap));void 0!==a.displacementScale&&
(d.displacementScale=a.displacementScale);void 0!==a.displacementBias&&(d.displacementBias=a.displacementBias);void 0!==a.roughnessMap&&(d.roughnessMap=b(a.roughnessMap));void 0!==a.metalnessMap&&(d.metalnessMap=b(a.metalnessMap));void 0!==a.emissiveMap&&(d.emissiveMap=b(a.emissiveMap));void 0!==a.emissiveIntensity&&(d.emissiveIntensity=a.emissiveIntensity);void 0!==a.specularMap&&(d.specularMap=b(a.specularMap));void 0!==a.envMap&&(d.envMap=b(a.envMap));void 0!==a.reflectivity&&(d.reflectivity=a.reflectivity);
void 0!==a.lightMap&&(d.lightMap=b(a.lightMap));void 0!==a.lightMapIntensity&&(d.lightMapIntensity=a.lightMapIntensity);void 0!==a.aoMap&&(d.aoMap=b(a.aoMap));void 0!==a.aoMapIntensity&&(d.aoMapIntensity=a.aoMapIntensity);void 0!==a.gradientMap&&(d.gradientMap=b(a.gradientMap));return d}});Object.assign(ie.prototype,{load:function(a,b,c,d){var e=this;(new La(e.manager)).load(a,function(a){b(e.parse(JSON.parse(a)))},c,d)},parse:function(a){var b=new D,c=a.data.index;void 0!==c&&(c=new Cf[c.type](c.array),
b.setIndex(new L(c,1)));var d=a.data.attributes;for(f in d){var e=d[f];c=new Cf[e.type](e.array);b.addAttribute(f,new L(c,e.itemSize,e.normalized))}var f=a.data.groups||a.data.drawcalls||a.data.offsets;if(void 0!==f)for(c=0,d=f.length;c!==d;++c)e=f[c],b.addGroup(e.start,e.count,e.materialIndex);a=a.data.boundingSphere;void 0!==a&&(f=new p,void 0!==a.center&&f.fromArray(a.center),b.boundingSphere=new Ha(f,a.radius));return b}});var Cf={Int8Array:Int8Array,Uint8Array:Uint8Array,Uint8ClampedArray:"undefined"!==
typeof Uint8ClampedArray?Uint8ClampedArray:Uint8Array,Int16Array:Int16Array,Uint16Array:Uint16Array,Int32Array:Int32Array,Uint32Array:Uint32Array,Float32Array:Float32Array,Float64Array:Float64Array};pc.Handlers={handlers:[],add:function(a,b){this.handlers.push(a,b)},get:function(a){for(var b=this.handlers,c=0,d=b.length;c<d;c+=2){var e=b[c+1];if(b[c].test(a))return e}return null}};Object.assign(pc.prototype,{crossOrigin:"anonymous",onLoadStart:function(){},onLoadProgress:function(){},onLoadComplete:function(){},
initMaterials:function(a,b,c){for(var d=[],e=0;e<a.length;++e)d[e]=this.createMaterial(a[e],b,c);return d},createMaterial:function(){var a={NoBlending:0,NormalBlending:1,AdditiveBlending:2,SubtractiveBlending:3,MultiplyBlending:4,CustomBlending:5},b=new G,c=new Ad,d=new Pd;return function(e,f,g){function h(a,b,d,e,h){a=f+a;var k=pc.Handlers.get(a);null!==k?a=k.load(a):(c.setCrossOrigin(g),a=c.load(a));void 0!==b&&(a.repeat.fromArray(b),1!==b[0]&&(a.wrapS=1E3),1!==b[1]&&(a.wrapT=1E3));void 0!==d&&
a.offset.fromArray(d);void 0!==e&&("repeat"===e[0]&&(a.wrapS=1E3),"mirror"===e[0]&&(a.wrapS=1002),"repeat"===e[1]&&(a.wrapT=1E3),"mirror"===e[1]&&(a.wrapT=1002));void 0!==h&&(a.anisotropy=h);b=J.generateUUID();l[b]=a;return b}var l={},k={uuid:J.generateUUID(),type:"MeshLambertMaterial"},p;for(p in e){var n=e[p];switch(p){case "DbgColor":case "DbgIndex":case "opticalDensity":case "illumination":break;case "DbgName":k.name=n;break;case "blending":k.blending=a[n];break;case "colorAmbient":case "mapAmbient":console.warn("THREE.Loader.createMaterial:",
p,"is no longer supported.");break;case "colorDiffuse":k.color=b.fromArray(n).getHex();break;case "colorSpecular":k.specular=b.fromArray(n).getHex();break;case "colorEmissive":k.emissive=b.fromArray(n).getHex();break;case "specularCoef":k.shininess=n;break;case "shading":"basic"===n.toLowerCase()&&(k.type="MeshBasicMaterial");"phong"===n.toLowerCase()&&(k.type="MeshPhongMaterial");"standard"===n.toLowerCase()&&(k.type="MeshStandardMaterial");break;case "mapDiffuse":k.map=h(n,e.mapDiffuseRepeat,e.mapDiffuseOffset,
e.mapDiffuseWrap,e.mapDiffuseAnisotropy);break;case "mapDiffuseRepeat":case "mapDiffuseOffset":case "mapDiffuseWrap":case "mapDiffuseAnisotropy":break;case "mapEmissive":k.emissiveMap=h(n,e.mapEmissiveRepeat,e.mapEmissiveOffset,e.mapEmissiveWrap,e.mapEmissiveAnisotropy);break;case "mapEmissiveRepeat":case "mapEmissiveOffset":case "mapEmissiveWrap":case "mapEmissiveAnisotropy":break;case "mapLight":k.lightMap=h(n,e.mapLightRepeat,e.mapLightOffset,e.mapLightWrap,e.mapLightAnisotropy);break;case "mapLightRepeat":case "mapLightOffset":case "mapLightWrap":case "mapLightAnisotropy":break;
case "mapAO":k.aoMap=h(n,e.mapAORepeat,e.mapAOOffset,e.mapAOWrap,e.mapAOAnisotropy);break;case "mapAORepeat":case "mapAOOffset":case "mapAOWrap":case "mapAOAnisotropy":break;case "mapBump":k.bumpMap=h(n,e.mapBumpRepeat,e.mapBumpOffset,e.mapBumpWrap,e.mapBumpAnisotropy);break;case "mapBumpScale":k.bumpScale=n;break;case "mapBumpRepeat":case "mapBumpOffset":case "mapBumpWrap":case "mapBumpAnisotropy":break;case "mapNormal":k.normalMap=h(n,e.mapNormalRepeat,e.mapNormalOffset,e.mapNormalWrap,e.mapNormalAnisotropy);
break;case "mapNormalFactor":k.normalScale=n;break;case "mapNormalRepeat":case "mapNormalOffset":case "mapNormalWrap":case "mapNormalAnisotropy":break;case "mapSpecular":k.specularMap=h(n,e.mapSpecularRepeat,e.mapSpecularOffset,e.mapSpecularWrap,e.mapSpecularAnisotropy);break;case "mapSpecularRepeat":case "mapSpecularOffset":case "mapSpecularWrap":case "mapSpecularAnisotropy":break;case "mapMetalness":k.metalnessMap=h(n,e.mapMetalnessRepeat,e.mapMetalnessOffset,e.mapMetalnessWrap,e.mapMetalnessAnisotropy);
break;case "mapMetalnessRepeat":case "mapMetalnessOffset":case "mapMetalnessWrap":case "mapMetalnessAnisotropy":break;case "mapRoughness":k.roughnessMap=h(n,e.mapRoughnessRepeat,e.mapRoughnessOffset,e.mapRoughnessWrap,e.mapRoughnessAnisotropy);break;case "mapRoughnessRepeat":case "mapRoughnessOffset":case "mapRoughnessWrap":case "mapRoughnessAnisotropy":break;case "mapAlpha":k.alphaMap=h(n,e.mapAlphaRepeat,e.mapAlphaOffset,e.mapAlphaWrap,e.mapAlphaAnisotropy);break;case "mapAlphaRepeat":case "mapAlphaOffset":case "mapAlphaWrap":case "mapAlphaAnisotropy":break;
case "flipSided":k.side=1;break;case "doubleSided":k.side=2;break;case "transparency":console.warn("THREE.Loader.createMaterial: transparency has been renamed to opacity");k.opacity=n;break;case "depthTest":case "depthWrite":case "colorWrite":case "opacity":case "reflectivity":case "transparent":case "visible":case "wireframe":k[p]=n;break;case "vertexColors":!0===n&&(k.vertexColors=2);"face"===n&&(k.vertexColors=1);break;default:console.error("THREE.Loader.createMaterial: Unsupported",p,n)}}"MeshBasicMaterial"===
k.type&&delete k.emissive;"MeshPhongMaterial"!==k.type&&delete k.specular;1>k.opacity&&(k.transparent=!0);d.setTextures(l);return d.parse(k)}}()});var Fe={decodeText:function(a){if("undefined"!==typeof TextDecoder)return(new TextDecoder).decode(a);for(var b="",c=0,d=a.length;c<d;c++)b+=String.fromCharCode(a[c]);return decodeURIComponent(escape(b))},extractUrlBase:function(a){var b=a.lastIndexOf("/");return-1===b?"./":a.substr(0,b+1)}};Object.assign(je.prototype,{crossOrigin:"anonymous",load:function(a,
b,c,d){var e=this,f=this.texturePath&&"string"===typeof this.texturePath?this.texturePath:Fe.extractUrlBase(a),g=new La(this.manager);g.setWithCredentials(this.withCredentials);g.load(a,function(c){c=JSON.parse(c);var d=c.metadata;if(void 0!==d&&(d=d.type,void 0!==d&&"object"===d.toLowerCase())){console.error("THREE.JSONLoader: "+a+" should be loaded with THREE.ObjectLoader instead.");return}c=e.parse(c,f);b(c.geometry,c.materials)},c,d)},setCrossOrigin:function(a){this.crossOrigin=a;return this},
setTexturePath:function(a){this.texturePath=a;return this},parse:function(){return function(a,b){void 0!==a.data&&(a=a.data);a.scale=void 0!==a.scale?1/a.scale:1;var c=new P,d=a,e,f,g,h=d.faces;var l=d.vertices;var k=d.normals,v=d.colors;var n=d.scale;var t=0;if(void 0!==d.uvs){for(e=0;e<d.uvs.length;e++)d.uvs[e].length&&t++;for(e=0;e<t;e++)c.faceVertexUvs[e]=[]}var q=0;for(g=l.length;q<g;)e=new p,e.x=l[q++]*n,e.y=l[q++]*n,e.z=l[q++]*n,c.vertices.push(e);q=0;for(g=h.length;q<g;){l=h[q++];var r=l&
1;var u=l&2;e=l&8;var y=l&16;var w=l&32;n=l&64;l&=128;if(r){r=new Ya;r.a=h[q];r.b=h[q+1];r.c=h[q+3];var x=new Ya;x.a=h[q+1];x.b=h[q+2];x.c=h[q+3];q+=4;u&&(u=h[q++],r.materialIndex=u,x.materialIndex=u);u=c.faces.length;if(e)for(e=0;e<t;e++){var A=d.uvs[e];c.faceVertexUvs[e][u]=[];c.faceVertexUvs[e][u+1]=[];for(f=0;4>f;f++){var C=h[q++];var z=A[2*C];C=A[2*C+1];z=new B(z,C);2!==f&&c.faceVertexUvs[e][u].push(z);0!==f&&c.faceVertexUvs[e][u+1].push(z)}}y&&(y=3*h[q++],r.normal.set(k[y++],k[y++],k[y]),x.normal.copy(r.normal));
if(w)for(e=0;4>e;e++)y=3*h[q++],w=new p(k[y++],k[y++],k[y]),2!==e&&r.vertexNormals.push(w),0!==e&&x.vertexNormals.push(w);n&&(n=h[q++],n=v[n],r.color.setHex(n),x.color.setHex(n));if(l)for(e=0;4>e;e++)n=h[q++],n=v[n],2!==e&&r.vertexColors.push(new G(n)),0!==e&&x.vertexColors.push(new G(n));c.faces.push(r);c.faces.push(x)}else{r=new Ya;r.a=h[q++];r.b=h[q++];r.c=h[q++];u&&(u=h[q++],r.materialIndex=u);u=c.faces.length;if(e)for(e=0;e<t;e++)for(A=d.uvs[e],c.faceVertexUvs[e][u]=[],f=0;3>f;f++)C=h[q++],z=
A[2*C],C=A[2*C+1],z=new B(z,C),c.faceVertexUvs[e][u].push(z);y&&(y=3*h[q++],r.normal.set(k[y++],k[y++],k[y]));if(w)for(e=0;3>e;e++)y=3*h[q++],w=new p(k[y++],k[y++],k[y]),r.vertexNormals.push(w);n&&(n=h[q++],r.color.setHex(v[n]));if(l)for(e=0;3>e;e++)n=h[q++],r.vertexColors.push(new G(v[n]));c.faces.push(r)}}d=a;q=void 0!==d.influencesPerVertex?d.influencesPerVertex:2;if(d.skinWeights)for(g=0,h=d.skinWeights.length;g<h;g+=q)c.skinWeights.push(new W(d.skinWeights[g],1<q?d.skinWeights[g+1]:0,2<q?d.skinWeights[g+
2]:0,3<q?d.skinWeights[g+3]:0));if(d.skinIndices)for(g=0,h=d.skinIndices.length;g<h;g+=q)c.skinIndices.push(new W(d.skinIndices[g],1<q?d.skinIndices[g+1]:0,2<q?d.skinIndices[g+2]:0,3<q?d.skinIndices[g+3]:0));c.bones=d.bones;c.bones&&0<c.bones.length&&(c.skinWeights.length!==c.skinIndices.length||c.skinIndices.length!==c.vertices.length)&&console.warn("When skinning, number of vertices ("+c.vertices.length+"), skinIndices ("+c.skinIndices.length+"), and skinWeights ("+c.skinWeights.length+") should match.");
g=a;h=g.scale;if(void 0!==g.morphTargets)for(d=0,q=g.morphTargets.length;d<q;d++)for(c.morphTargets[d]={},c.morphTargets[d].name=g.morphTargets[d].name,c.morphTargets[d].vertices=[],k=c.morphTargets[d].vertices,v=g.morphTargets[d].vertices,t=0,l=v.length;t<l;t+=3)n=new p,n.x=v[t]*h,n.y=v[t+1]*h,n.z=v[t+2]*h,k.push(n);if(void 0!==g.morphColors&&0<g.morphColors.length)for(console.warn('THREE.JSONLoader: "morphColors" no longer supported. Using them as face colors.'),h=c.faces,g=g.morphColors[0].colors,
d=0,q=h.length;d<q;d++)h[d].color.fromArray(g,3*d);g=a;d=[];q=[];void 0!==g.animation&&q.push(g.animation);void 0!==g.animations&&(g.animations.length?q=q.concat(g.animations):q.push(g.animations));for(g=0;g<q.length;g++)(h=Ga.parseAnimation(q[g],c.bones))&&d.push(h);c.morphTargets&&(q=Ga.CreateClipsFromMorphTargetSequences(c.morphTargets,10),d=d.concat(q));0<d.length&&(c.animations=d);c.computeFaceNormals();c.computeBoundingSphere();if(void 0===a.materials||0===a.materials.length)return{geometry:c};
a=pc.prototype.initMaterials(a.materials,b,this.crossOrigin);return{geometry:c,materials:a}}}()});Object.assign(nf.prototype,{crossOrigin:"anonymous",load:function(a,b,c,d){""===this.texturePath&&(this.texturePath=a.substring(0,a.lastIndexOf("/")+1));var e=this;(new La(e.manager)).load(a,function(c){var f=null;try{f=JSON.parse(c)}catch(h){void 0!==d&&d(h);console.error("THREE:ObjectLoader: Can't parse "+a+".",h.message);return}c=f.metadata;void 0===c||void 0===c.type||"geometry"===c.type.toLowerCase()?
console.error("THREE.ObjectLoader: Can't load "+a+". Use THREE.JSONLoader instead."):e.parse(f,b)},c,d)},setTexturePath:function(a){this.texturePath=a;return this},setCrossOrigin:function(a){this.crossOrigin=a;return this},parse:function(a,b){var c=this.parseShape(a.shapes);c=this.parseGeometries(a.geometries,c);var d=this.parseImages(a.images,function(){void 0!==b&&b(e)});d=this.parseTextures(a.textures,d);d=this.parseMaterials(a.materials,d);var e=this.parseObject(a.object,c,d);a.animations&&(e.animations=
this.parseAnimations(a.animations));void 0!==a.images&&0!==a.images.length||void 0===b||b(e);return e},parseShape:function(a){var b={};if(void 0!==a)for(var c=0,d=a.length;c<d;c++){var e=(new jb).fromJSON(a[c]);b[e.uuid]=e}return b},parseGeometries:function(a,b){var c={};if(void 0!==a)for(var d=new je,e=new ie,f=0,g=a.length;f<g;f++){var h=a[f];switch(h.type){case "PlaneGeometry":case "PlaneBufferGeometry":var l=new ka[h.type](h.width,h.height,h.widthSegments,h.heightSegments);break;case "BoxGeometry":case "BoxBufferGeometry":case "CubeGeometry":l=
new ka[h.type](h.width,h.height,h.depth,h.widthSegments,h.heightSegments,h.depthSegments);break;case "CircleGeometry":case "CircleBufferGeometry":l=new ka[h.type](h.radius,h.segments,h.thetaStart,h.thetaLength);break;case "CylinderGeometry":case "CylinderBufferGeometry":l=new ka[h.type](h.radiusTop,h.radiusBottom,h.height,h.radialSegments,h.heightSegments,h.openEnded,h.thetaStart,h.thetaLength);break;case "ConeGeometry":case "ConeBufferGeometry":l=new ka[h.type](h.radius,h.height,h.radialSegments,
h.heightSegments,h.openEnded,h.thetaStart,h.thetaLength);break;case "SphereGeometry":case "SphereBufferGeometry":l=new ka[h.type](h.radius,h.widthSegments,h.heightSegments,h.phiStart,h.phiLength,h.thetaStart,h.thetaLength);break;case "DodecahedronGeometry":case "DodecahedronBufferGeometry":case "IcosahedronGeometry":case "IcosahedronBufferGeometry":case "OctahedronGeometry":case "OctahedronBufferGeometry":case "TetrahedronGeometry":case "TetrahedronBufferGeometry":l=new ka[h.type](h.radius,h.detail);
break;case "RingGeometry":case "RingBufferGeometry":l=new ka[h.type](h.innerRadius,h.outerRadius,h.thetaSegments,h.phiSegments,h.thetaStart,h.thetaLength);break;case "TorusGeometry":case "TorusBufferGeometry":l=new ka[h.type](h.radius,h.tube,h.radialSegments,h.tubularSegments,h.arc);break;case "TorusKnotGeometry":case "TorusKnotBufferGeometry":l=new ka[h.type](h.radius,h.tube,h.tubularSegments,h.radialSegments,h.p,h.q);break;case "LatheGeometry":case "LatheBufferGeometry":l=new ka[h.type](h.points,
h.segments,h.phiStart,h.phiLength);break;case "PolyhedronGeometry":case "PolyhedronBufferGeometry":l=new ka[h.type](h.vertices,h.indices,h.radius,h.details);break;case "ShapeGeometry":case "ShapeBufferGeometry":l=[];for(var k=0,p=h.shapes.length;k<p;k++){var n=b[h.shapes[k]];l.push(n)}l=new ka[h.type](l,h.curveSegments);break;case "ExtrudeGeometry":case "ExtrudeBufferGeometry":l=[];k=0;for(p=h.shapes.length;k<p;k++)n=b[h.shapes[k]],l.push(n);k=h.options.extrudePath;void 0!==k&&(h.options.extrudePath=
(new Bf[k.type]).fromJSON(k));l=new ka[h.type](l,h.options);break;case "BufferGeometry":l=e.parse(h);break;case "Geometry":l=d.parse(h,this.texturePath).geometry;break;default:console.warn('THREE.ObjectLoader: Unsupported geometry type "'+h.type+'"');continue}l.uuid=h.uuid;void 0!==h.name&&(l.name=h.name);!0===l.isBufferGeometry&&void 0!==h.userData&&(l.userData=h.userData);c[h.uuid]=l}return c},parseMaterials:function(a,b){var c={};if(void 0!==a){var d=new Pd;d.setTextures(b);b=0;for(var e=a.length;b<
e;b++){var f=a[b];if("MultiMaterial"===f.type){for(var g=[],h=0;h<f.materials.length;h++)g.push(d.parse(f.materials[h]));c[f.uuid]=g}else c[f.uuid]=d.parse(f)}}return c},parseAnimations:function(a){for(var b=[],c=0;c<a.length;c++){var d=a[c],e=Ga.parse(d);void 0!==d.uuid&&(e.uuid=d.uuid);b.push(e)}return b},parseImages:function(a,b){function c(a){d.manager.itemStart(a);return f.load(a,function(){d.manager.itemEnd(a)},void 0,function(){d.manager.itemEnd(a);d.manager.itemError(a)})}var d=this,e={};
if(void 0!==a&&0<a.length){b=new ee(b);var f=new fd(b);f.setCrossOrigin(this.crossOrigin);b=0;for(var g=a.length;b<g;b++){var h=a[b],l=h.url;if(Array.isArray(l)){e[h.uuid]=[];for(var k=0,p=l.length;k<p;k++){var n=l[k];n=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(n)?n:d.texturePath+n;e[h.uuid].push(c(n))}}else n=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(h.url)?h.url:d.texturePath+h.url,e[h.uuid]=c(n)}}return e},parseTextures:function(a,b){function c(a,b){if("number"===typeof a)return a;console.warn("THREE.ObjectLoader.parseTexture: Constant should be in numeric form.",
a);return b[a]}var d={};if(void 0!==a)for(var e=0,f=a.length;e<f;e++){var g=a[e];void 0===g.image&&console.warn('THREE.ObjectLoader: No "image" specified for',g.uuid);void 0===b[g.image]&&console.warn("THREE.ObjectLoader: Undefined image",g.image);var h=Array.isArray(b[g.image])?new Za(b[g.image]):new ea(b[g.image]);h.needsUpdate=!0;h.uuid=g.uuid;void 0!==g.name&&(h.name=g.name);void 0!==g.mapping&&(h.mapping=c(g.mapping,Wg));void 0!==g.offset&&h.offset.fromArray(g.offset);void 0!==g.repeat&&h.repeat.fromArray(g.repeat);
void 0!==g.center&&h.center.fromArray(g.center);void 0!==g.rotation&&(h.rotation=g.rotation);void 0!==g.wrap&&(h.wrapS=c(g.wrap[0],Df),h.wrapT=c(g.wrap[1],Df));void 0!==g.format&&(h.format=g.format);void 0!==g.minFilter&&(h.minFilter=c(g.minFilter,Ef));void 0!==g.magFilter&&(h.magFilter=c(g.magFilter,Ef));void 0!==g.anisotropy&&(h.anisotropy=g.anisotropy);void 0!==g.flipY&&(h.flipY=g.flipY);d[g.uuid]=h}return d},parseObject:function(a,b,c){function d(a){void 0===b[a]&&console.warn("THREE.ObjectLoader: Undefined geometry",
a);return b[a]}function e(a){if(void 0!==a){if(Array.isArray(a)){for(var b=[],d=0,e=a.length;d<e;d++){var f=a[d];void 0===c[f]&&console.warn("THREE.ObjectLoader: Undefined material",f);b.push(c[f])}return b}void 0===c[a]&&console.warn("THREE.ObjectLoader: Undefined material",a);return c[a]}}switch(a.type){case "Scene":var f=new vd;void 0!==a.background&&Number.isInteger(a.background)&&(f.background=new G(a.background));void 0!==a.fog&&("Fog"===a.fog.type?f.fog=new Wb(a.fog.color,a.fog.near,a.fog.far):
"FogExp2"===a.fog.type&&(f.fog=new Vb(a.fog.color,a.fog.density)));break;case "PerspectiveCamera":f=new Z(a.fov,a.aspect,a.near,a.far);void 0!==a.focus&&(f.focus=a.focus);void 0!==a.zoom&&(f.zoom=a.zoom);void 0!==a.filmGauge&&(f.filmGauge=a.filmGauge);void 0!==a.filmOffset&&(f.filmOffset=a.filmOffset);void 0!==a.view&&(f.view=Object.assign({},a.view));break;case "OrthographicCamera":f=new Mb(a.left,a.right,a.top,a.bottom,a.near,a.far);void 0!==a.zoom&&(f.zoom=a.zoom);void 0!==a.view&&(f.view=Object.assign({},
a.view));break;case "AmbientLight":f=new Hd(a.color,a.intensity);break;case "DirectionalLight":f=new Gd(a.color,a.intensity);break;case "PointLight":f=new Ed(a.color,a.intensity,a.distance,a.decay);break;case "RectAreaLight":f=new Id(a.color,a.intensity,a.width,a.height);break;case "SpotLight":f=new Dd(a.color,a.intensity,a.distance,a.angle,a.penumbra,a.decay);break;case "HemisphereLight":f=new Bd(a.color,a.groundColor,a.intensity);break;case "SkinnedMesh":console.warn("THREE.ObjectLoader.parseObject() does not support SkinnedMesh yet.");
case "Mesh":f=d(a.geometry);var g=e(a.material);f=f.bones&&0<f.bones.length?new xd(f,g):new va(f,g);break;case "LOD":f=new Jc;break;case "Line":f=new wa(d(a.geometry),e(a.material),a.mode);break;case "LineLoop":f=new yd(d(a.geometry),e(a.material));break;case "LineSegments":f=new Y(d(a.geometry),e(a.material));break;case "PointCloud":case "Points":f=new Xb(d(a.geometry),e(a.material));break;case "Sprite":f=new Ic(e(a.material));break;case "Group":f=new Ub;break;default:f=new H}f.uuid=a.uuid;void 0!==
a.name&&(f.name=a.name);void 0!==a.matrix?(f.matrix.fromArray(a.matrix),void 0!==a.matrixAutoUpdate&&(f.matrixAutoUpdate=a.matrixAutoUpdate),f.matrixAutoUpdate&&f.matrix.decompose(f.position,f.quaternion,f.scale)):(void 0!==a.position&&f.position.fromArray(a.position),void 0!==a.rotation&&f.rotation.fromArray(a.rotation),void 0!==a.quaternion&&f.quaternion.fromArray(a.quaternion),void 0!==a.scale&&f.scale.fromArray(a.scale));void 0!==a.castShadow&&(f.castShadow=a.castShadow);void 0!==a.receiveShadow&&
(f.receiveShadow=a.receiveShadow);a.shadow&&(void 0!==a.shadow.bias&&(f.shadow.bias=a.shadow.bias),void 0!==a.shadow.radius&&(f.shadow.radius=a.shadow.radius),void 0!==a.shadow.mapSize&&f.shadow.mapSize.fromArray(a.shadow.mapSize),void 0!==a.shadow.camera&&(f.shadow.camera=this.parseObject(a.shadow.camera)));void 0!==a.visible&&(f.visible=a.visible);void 0!==a.frustumCulled&&(f.frustumCulled=a.frustumCulled);void 0!==a.renderOrder&&(f.renderOrder=a.renderOrder);void 0!==a.userData&&(f.userData=a.userData);
void 0!==a.layers&&(f.layers.mask=a.layers);if(void 0!==a.children){g=a.children;for(var h=0;h<g.length;h++)f.add(this.parseObject(g[h],b,c))}if("LOD"===a.type)for(a=a.levels,g=0;g<a.length;g++){h=a[g];var l=f.getObjectByProperty("uuid",h.object);void 0!==l&&f.addLevel(l,h.distance)}return f}});var Wg={UVMapping:300,CubeReflectionMapping:301,CubeRefractionMapping:302,EquirectangularReflectionMapping:303,EquirectangularRefractionMapping:304,SphericalReflectionMapping:305,CubeUVReflectionMapping:306,
CubeUVRefractionMapping:307},Df={RepeatWrapping:1E3,ClampToEdgeWrapping:1001,MirroredRepeatWrapping:1002},Ef={NearestFilter:1003,NearestMipMapNearestFilter:1004,NearestMipMapLinearFilter:1005,LinearFilter:1006,LinearMipMapNearestFilter:1007,LinearMipMapLinearFilter:1008};ke.prototype={constructor:ke,setOptions:function(a){this.options=a;return this},load:function(a,b,c,d){void 0===a&&(a="");void 0!==this.path&&(a=this.path+a);a=this.manager.resolveURL(a);var e=this,f=Kb.get(a);if(void 0!==f)return e.manager.itemStart(a),
setTimeout(function(){b&&b(f);e.manager.itemEnd(a)},0),f;fetch(a).then(function(a){return a.blob()}).then(function(a){return createImageBitmap(a,e.options)}).then(function(c){Kb.add(a,c);b&&b(c);e.manager.itemEnd(a)}).catch(function(b){d&&d(b);e.manager.itemEnd(a);e.manager.itemError(a)})},setCrossOrigin:function(){return this},setPath:function(a){this.path=a;return this}};Object.assign(le.prototype,{moveTo:function(a,b){this.currentPath=new Qa;this.subPaths.push(this.currentPath);this.currentPath.moveTo(a,
b)},lineTo:function(a,b){this.currentPath.lineTo(a,b)},quadraticCurveTo:function(a,b,c,d){this.currentPath.quadraticCurveTo(a,b,c,d)},bezierCurveTo:function(a,b,c,d,e,f){this.currentPath.bezierCurveTo(a,b,c,d,e,f)},splineThru:function(a){this.currentPath.splineThru(a)},toShapes:function(a,b){function c(a){for(var b=[],c=0,d=a.length;c<d;c++){var e=a[c],f=new jb;f.curves=e.curves;b.push(f)}return b}function d(a,b){for(var c=b.length,d=!1,e=c-1,f=0;f<c;e=f++){var g=b[e],h=b[f],l=h.x-g.x,k=h.y-g.y;if(Math.abs(k)>
Number.EPSILON){if(0>k&&(g=b[f],l=-l,h=b[e],k=-k),!(a.y<g.y||a.y>h.y))if(a.y===g.y){if(a.x===g.x)return!0}else{e=k*(a.x-g.x)-l*(a.y-g.y);if(0===e)return!0;0>e||(d=!d)}}else if(a.y===g.y&&(h.x<=a.x&&a.x<=g.x||g.x<=a.x&&a.x<=h.x))return!0}return d}var e=$a.isClockWise,f=this.subPaths;if(0===f.length)return[];if(!0===b)return c(f);b=[];if(1===f.length){var g=f[0];var h=new jb;h.curves=g.curves;b.push(h);return b}var l=!e(f[0].getPoints());l=a?!l:l;h=[];var k=[],p=[],n=0;k[n]=void 0;p[n]=[];for(var t=
0,q=f.length;t<q;t++){g=f[t];var r=g.getPoints();var u=e(r);(u=a?!u:u)?(!l&&k[n]&&n++,k[n]={s:new jb,p:r},k[n].s.curves=g.curves,l&&n++,p[n]=[]):p[n].push({h:g,p:r[0]})}if(!k[0])return c(f);if(1<k.length){t=!1;a=[];e=0;for(f=k.length;e<f;e++)h[e]=[];e=0;for(f=k.length;e<f;e++)for(g=p[e],u=0;u<g.length;u++){l=g[u];n=!0;for(r=0;r<k.length;r++)d(l.p,k[r].p)&&(e!==r&&a.push({froms:e,tos:r,hole:u}),n?(n=!1,h[r].push(l)):t=!0);n&&h[e].push(l)}0<a.length&&(t||(p=h))}t=0;for(e=k.length;t<e;t++)for(h=k[t].s,
b.push(h),a=p[t],f=0,g=a.length;f<g;f++)h.holes.push(a[f].h);return b}});Object.assign(me.prototype,{isFont:!0,generateShapes:function(a,b){void 0===b&&(b=100);var c=[],d=b;b=this.data;var e=Array.from?Array.from(a):String(a).split("");d/=b.resolution;var f=(b.boundingBox.yMax-b.boundingBox.yMin+b.underlineThickness)*d;a=[];for(var g=0,h=0,l=0;l<e.length;l++){var k=e[l];if("\n"===k)g=0,h-=f;else{var p=d;var n=g,t=h;if(k=b.glyphs[k]||b.glyphs["?"]){var q=new le;if(k.o)for(var r=k._cachedOutline||(k._cachedOutline=
k.o.split(" ")),u=0,y=r.length;u<y;)switch(r[u++]){case "m":var w=r[u++]*p+n;var x=r[u++]*p+t;q.moveTo(w,x);break;case "l":w=r[u++]*p+n;x=r[u++]*p+t;q.lineTo(w,x);break;case "q":var z=r[u++]*p+n;var B=r[u++]*p+t;var D=r[u++]*p+n;var E=r[u++]*p+t;q.quadraticCurveTo(D,E,z,B);break;case "b":z=r[u++]*p+n,B=r[u++]*p+t,D=r[u++]*p+n,E=r[u++]*p+t,w=r[u++]*p+n,x=r[u++]*p+t,q.bezierCurveTo(D,E,w,x,z,B)}p={offsetX:k.ha*p,path:q}}else p=void 0;g+=p.offsetX;a.push(p.path)}}b=0;for(e=a.length;b<e;b++)Array.prototype.push.apply(c,
a[b].toShapes());return c}});Object.assign(of.prototype,{load:function(a,b,c,d){var e=this,f=new La(this.manager);f.setPath(this.path);f.load(a,function(a){try{var c=JSON.parse(a)}catch(l){console.warn("THREE.FontLoader: typeface.js support is being deprecated. Use typeface.json instead."),c=JSON.parse(a.substring(65,a.length-2))}a=e.parse(c);b&&b(a)},c,d)},parse:function(a){return new me(a)},setPath:function(a){this.path=a;return this}});var Ud,pe={getContext:function(){void 0===Ud&&(Ud=new (window.AudioContext||
window.webkitAudioContext));return Ud},setContext:function(a){Ud=a}};Object.assign(ne.prototype,{load:function(a,b,c,d){var e=new La(this.manager);e.setResponseType("arraybuffer");e.load(a,function(a){a=a.slice(0);pe.getContext().decodeAudioData(a,function(a){b(a)})},c,d)}});Object.assign(pf.prototype,{update:function(){var a,b,c,d,e,f,g,h,l=new R,k=new R;return function(m){if(a!==this||b!==m.focus||c!==m.fov||d!==m.aspect*this.aspect||e!==m.near||f!==m.far||g!==m.zoom||h!==this.eyeSep){a=this;b=
m.focus;c=m.fov;d=m.aspect*this.aspect;e=m.near;f=m.far;g=m.zoom;var n=m.projectionMatrix.clone();h=this.eyeSep/2;var p=h*e/b,q=e*Math.tan(J.DEG2RAD*c*.5)/g;k.elements[12]=-h;l.elements[12]=h;var r=-q*d+p;var v=q*d+p;n.elements[0]=2*e/(v-r);n.elements[8]=(v+r)/(v-r);this.cameraL.projectionMatrix.copy(n);r=-q*d-p;v=q*d-p;n.elements[0]=2*e/(v-r);n.elements[8]=(v+r)/(v-r);this.cameraR.projectionMatrix.copy(n)}this.cameraL.matrixWorld.copy(m.matrixWorld).multiply(k);this.cameraR.matrixWorld.copy(m.matrixWorld).multiply(l)}}()});
kd.prototype=Object.create(H.prototype);kd.prototype.constructor=kd;oe.prototype=Object.assign(Object.create(H.prototype),{constructor:oe,getInput:function(){return this.gain},removeFilter:function(){null!==this.filter&&(this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination),this.gain.connect(this.context.destination),this.filter=null);return this},getFilter:function(){return this.filter},setFilter:function(a){null!==this.filter?(this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination)):
this.gain.disconnect(this.context.destination);this.filter=a;this.gain.connect(this.filter);this.filter.connect(this.context.destination);return this},getMasterVolume:function(){return this.gain.gain.value},setMasterVolume:function(a){this.gain.gain.setTargetAtTime(a,this.context.currentTime,.01);return this},updateMatrixWorld:function(){var a=new p,b=new ca,c=new p,d=new p;return function(e){H.prototype.updateMatrixWorld.call(this,e);e=this.context.listener;var f=this.up;this.matrixWorld.decompose(a,
b,c);d.set(0,0,-1).applyQuaternion(b);e.positionX?(e.positionX.setValueAtTime(a.x,this.context.currentTime),e.positionY.setValueAtTime(a.y,this.context.currentTime),e.positionZ.setValueAtTime(a.z,this.context.currentTime),e.forwardX.setValueAtTime(d.x,this.context.currentTime),e.forwardY.setValueAtTime(d.y,this.context.currentTime),e.forwardZ.setValueAtTime(d.z,this.context.currentTime),e.upX.setValueAtTime(f.x,this.context.currentTime),e.upY.setValueAtTime(f.y,this.context.currentTime),e.upZ.setValueAtTime(f.z,
this.context.currentTime)):(e.setPosition(a.x,a.y,a.z),e.setOrientation(d.x,d.y,d.z,f.x,f.y,f.z))}}()});qc.prototype=Object.assign(Object.create(H.prototype),{constructor:qc,getOutput:function(){return this.gain},setNodeSource:function(a){this.hasPlaybackControl=!1;this.sourceType="audioNode";this.source=a;this.connect();return this},setMediaElementSource:function(a){this.hasPlaybackControl=!1;this.sourceType="mediaNode";this.source=this.context.createMediaElementSource(a);this.connect();return this},
setBuffer:function(a){this.buffer=a;this.sourceType="buffer";this.autoplay&&this.play();return this},play:function(){if(!0===this.isPlaying)console.warn("THREE.Audio: Audio is already playing.");else if(!1===this.hasPlaybackControl)console.warn("THREE.Audio: this Audio has no playback control.");else{var a=this.context.createBufferSource();a.buffer=this.buffer;a.loop=this.loop;a.onended=this.onEnded.bind(this);a.playbackRate.setValueAtTime(this.playbackRate,this.startTime);this.startTime=this.context.currentTime;
a.start(this.startTime,this.offset);this.isPlaying=!0;this.source=a;return this.connect()}},pause:function(){if(!1===this.hasPlaybackControl)console.warn("THREE.Audio: this Audio has no playback control.");else return!0===this.isPlaying&&(this.source.stop(),this.offset+=(this.context.currentTime-this.startTime)*this.playbackRate,this.isPlaying=!1),this},stop:function(){if(!1===this.hasPlaybackControl)console.warn("THREE.Audio: this Audio has no playback control.");else return this.source.stop(),this.offset=
0,this.isPlaying=!1,this},connect:function(){if(0<this.filters.length){this.source.connect(this.filters[0]);for(var a=1,b=this.filters.length;a<b;a++)this.filters[a-1].connect(this.filters[a]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this},disconnect:function(){if(0<this.filters.length){this.source.disconnect(this.filters[0]);for(var a=1,b=this.filters.length;a<b;a++)this.filters[a-1].disconnect(this.filters[a]);this.filters[this.filters.length-
1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this},getFilters:function(){return this.filters},setFilters:function(a){a||(a=[]);!0===this.isPlaying?(this.disconnect(),this.filters=a,this.connect()):this.filters=a;return this},getFilter:function(){return this.getFilters()[0]},setFilter:function(a){return this.setFilters(a?[a]:[])},setPlaybackRate:function(a){if(!1===this.hasPlaybackControl)console.warn("THREE.Audio: this Audio has no playback control.");else return this.playbackRate=
a,!0===this.isPlaying&&this.source.playbackRate.setValueAtTime(this.playbackRate,this.context.currentTime),this},getPlaybackRate:function(){return this.playbackRate},onEnded:function(){this.isPlaying=!1},getLoop:function(){return!1===this.hasPlaybackControl?(console.warn("THREE.Audio: this Audio has no playback control."),!1):this.loop},setLoop:function(a){if(!1===this.hasPlaybackControl)console.warn("THREE.Audio: this Audio has no playback control.");else return this.loop=a,!0===this.isPlaying&&
(this.source.loop=this.loop),this},getVolume:function(){return this.gain.gain.value},setVolume:function(a){this.gain.gain.setTargetAtTime(a,this.context.currentTime,.01);return this}});qe.prototype=Object.assign(Object.create(qc.prototype),{constructor:qe,getOutput:function(){return this.panner},getRefDistance:function(){return this.panner.refDistance},setRefDistance:function(a){this.panner.refDistance=a;return this},getRolloffFactor:function(){return this.panner.rolloffFactor},setRolloffFactor:function(a){this.panner.rolloffFactor=
a;return this},getDistanceModel:function(){return this.panner.distanceModel},setDistanceModel:function(a){this.panner.distanceModel=a;return this},getMaxDistance:function(){return this.panner.maxDistance},setMaxDistance:function(a){this.panner.maxDistance=a;return this},setDirectionalCone:function(a,b,c){this.panner.coneInnerAngle=a;this.panner.coneOuterAngle=b;this.panner.coneOuterGain=c;return this},updateMatrixWorld:function(){var a=new p,b=new ca,c=new p,d=new p;return function(e){H.prototype.updateMatrixWorld.call(this,
e);e=this.panner;this.matrixWorld.decompose(a,b,c);d.set(0,0,1).applyQuaternion(b);e.setPosition(a.x,a.y,a.z);e.setOrientation(d.x,d.y,d.z)}}()});Object.assign(re.prototype,{getFrequencyData:function(){this.analyser.getByteFrequencyData(this.data);return this.data},getAverageFrequency:function(){for(var a=0,b=this.getFrequencyData(),c=0;c<b.length;c++)a+=b[c];return a/b.length}});Object.assign(se.prototype,{accumulate:function(a,b){var c=this.buffer,d=this.valueSize;a=a*d+d;var e=this.cumulativeWeight;
if(0===e){for(e=0;e!==d;++e)c[a+e]=c[e];e=b}else e+=b,this._mixBufferRegion(c,a,0,b/e,d);this.cumulativeWeight=e},apply:function(a){var b=this.valueSize,c=this.buffer;a=a*b+b;var d=this.cumulativeWeight,e=this.binding;this.cumulativeWeight=0;1>d&&this._mixBufferRegion(c,a,3*b,1-d,b);d=b;for(var f=b+b;d!==f;++d)if(c[d]!==c[d+b]){e.setValue(c,a);break}},saveOriginalState:function(){var a=this.buffer,b=this.valueSize,c=3*b;this.binding.getValue(a,c);for(var d=b;d!==c;++d)a[d]=a[c+d%b];this.cumulativeWeight=
0},restoreOriginalState:function(){this.binding.setValue(this.buffer,3*this.valueSize)},_select:function(a,b,c,d,e){if(.5<=d)for(d=0;d!==e;++d)a[b+d]=a[c+d]},_slerp:function(a,b,c,d){ca.slerpFlat(a,b,a,b,a,c,d)},_lerp:function(a,b,c,d,e){for(var f=1-d,g=0;g!==e;++g){var h=b+g;a[h]=a[h]*f+a[c+g]*d}}});Object.assign(qf.prototype,{getValue:function(a,b){this.bind();var c=this._bindings[this._targetGroup.nCachedObjects_];void 0!==c&&c.getValue(a,b)},setValue:function(a,b){for(var c=this._bindings,d=this._targetGroup.nCachedObjects_,
e=c.length;d!==e;++d)c[d].setValue(a,b)},bind:function(){for(var a=this._bindings,b=this._targetGroup.nCachedObjects_,c=a.length;b!==c;++b)a[b].bind()},unbind:function(){for(var a=this._bindings,b=this._targetGroup.nCachedObjects_,c=a.length;b!==c;++b)a[b].unbind()}});Object.assign(ra,{Composite:qf,create:function(a,b,c){return a&&a.isAnimationObjectGroup?new ra.Composite(a,b,c):new ra(a,b,c)},sanitizeNodeName:function(){var a=/[\[\]\.:\/]/g;return function(b){return b.replace(/\s/g,"_").replace(a,
"")}}(),parseTrackName:function(){var a="[^"+"\\[\\]\\.:\\/".replace("\\.","")+"]",b=/((?:WC+[\/:])*)/.source.replace("WC","[^\\[\\]\\.:\\/]");a=/(WCOD+)?/.source.replace("WCOD",a);var c=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC","[^\\[\\]\\.:\\/]"),d=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC","[^\\[\\]\\.:\\/]"),e=new RegExp("^"+b+a+c+d+"$"),f=["material","materials","bones"];return function(a){var b=e.exec(a);if(!b)throw Error("PropertyBinding: Cannot parse trackName: "+a);b={nodeName:b[2],
objectName:b[3],objectIndex:b[4],propertyName:b[5],propertyIndex:b[6]};var c=b.nodeName&&b.nodeName.lastIndexOf(".");if(void 0!==c&&-1!==c){var d=b.nodeName.substring(c+1);-1!==f.indexOf(d)&&(b.nodeName=b.nodeName.substring(0,c),b.objectName=d)}if(null===b.propertyName||0===b.propertyName.length)throw Error("PropertyBinding: can not parse propertyName from trackName: "+a);return b}}(),findNode:function(a,b){if(!b||""===b||"root"===b||"."===b||-1===b||b===a.name||b===a.uuid)return a;if(a.skeleton){var c=
a.skeleton.getBoneByName(b);if(void 0!==c)return c}if(a.children){var d=function(a){for(var c=0;c<a.length;c++){var e=a[c];if(e.name===b||e.uuid===b||(e=d(e.children)))return e}return null};if(a=d(a.children))return a}return null}});Object.assign(ra.prototype,{_getValue_unavailable:function(){},_setValue_unavailable:function(){},BindingType:{Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},Versioning:{None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},GetterByBindingType:[function(a,b){a[b]=this.node[this.propertyName]},
function(a,b){for(var c=this.resolvedProperty,d=0,e=c.length;d!==e;++d)a[b++]=c[d]},function(a,b){a[b]=this.resolvedProperty[this.propertyIndex]},function(a,b){this.resolvedProperty.toArray(a,b)}],SetterByBindingTypeAndVersioning:[[function(a,b){this.targetObject[this.propertyName]=a[b]},function(a,b){this.targetObject[this.propertyName]=a[b];this.targetObject.needsUpdate=!0},function(a,b){this.targetObject[this.propertyName]=a[b];this.targetObject.matrixWorldNeedsUpdate=!0}],[function(a,b){for(var c=
this.resolvedProperty,d=0,e=c.length;d!==e;++d)c[d]=a[b++]},function(a,b){for(var c=this.resolvedProperty,d=0,e=c.length;d!==e;++d)c[d]=a[b++];this.targetObject.needsUpdate=!0},function(a,b){for(var c=this.resolvedProperty,d=0,e=c.length;d!==e;++d)c[d]=a[b++];this.targetObject.matrixWorldNeedsUpdate=!0}],[function(a,b){this.resolvedProperty[this.propertyIndex]=a[b]},function(a,b){this.resolvedProperty[this.propertyIndex]=a[b];this.targetObject.needsUpdate=!0},function(a,b){this.resolvedProperty[this.propertyIndex]=
a[b];this.targetObject.matrixWorldNeedsUpdate=!0}],[function(a,b){this.resolvedProperty.fromArray(a,b)},function(a,b){this.resolvedProperty.fromArray(a,b);this.targetObject.needsUpdate=!0},function(a,b){this.resolvedProperty.fromArray(a,b);this.targetObject.matrixWorldNeedsUpdate=!0}]],getValue:function(a,b){this.bind();this.getValue(a,b)},setValue:function(a,b){this.bind();this.setValue(a,b)},bind:function(){var a=this.node,b=this.parsedPath,c=b.objectName,d=b.propertyName,e=b.propertyIndex;a||(this.node=
a=ra.findNode(this.rootNode,b.nodeName)||this.rootNode);this.getValue=this._getValue_unavailable;this.setValue=this._setValue_unavailable;if(a){if(c){var f=b.objectIndex;switch(c){case "materials":if(!a.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!a.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}a=a.material.materials;
break;case "bones":if(!a.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}a=a.skeleton.bones;for(c=0;c<a.length;c++)if(a[c].name===f){f=c;break}break;default:if(void 0===a[c]){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}a=a[c]}if(void 0!==f){if(void 0===a[f]){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,a);return}a=
a[f]}}f=a[d];if(void 0===f)console.error("THREE.PropertyBinding: Trying to update property for track: "+b.nodeName+"."+d+" but it wasn't found.",a);else{b=this.Versioning.None;void 0!==a.needsUpdate?(b=this.Versioning.NeedsUpdate,this.targetObject=a):void 0!==a.matrixWorldNeedsUpdate&&(b=this.Versioning.MatrixWorldNeedsUpdate,this.targetObject=a);c=this.BindingType.Direct;if(void 0!==e){if("morphTargetInfluences"===d){if(!a.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",
this);return}if(a.geometry.isBufferGeometry){if(!a.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}for(c=0;c<this.node.geometry.morphAttributes.position.length;c++)if(a.geometry.morphAttributes.position[c].name===e){e=c;break}}else{if(!a.geometry.morphTargets){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphTargets.",
this);return}for(c=0;c<this.node.geometry.morphTargets.length;c++)if(a.geometry.morphTargets[c].name===e){e=c;break}}}c=this.BindingType.ArrayElement;this.resolvedProperty=f;this.propertyIndex=e}else void 0!==f.fromArray&&void 0!==f.toArray?(c=this.BindingType.HasFromToArray,this.resolvedProperty=f):Array.isArray(f)?(c=this.BindingType.EntireArray,this.resolvedProperty=f):this.propertyName=d;this.getValue=this.GetterByBindingType[c];this.setValue=this.SetterByBindingTypeAndVersioning[c][b]}}else console.error("THREE.PropertyBinding: Trying to update node for track: "+
this.path+" but it wasn't found.")},unbind:function(){this.node=null;this.getValue=this._getValue_unbound;this.setValue=this._setValue_unbound}});Object.assign(ra.prototype,{_getValue_unbound:ra.prototype.getValue,_setValue_unbound:ra.prototype.setValue});Object.assign(rf.prototype,{isAnimationObjectGroup:!0,add:function(){for(var a=this._objects,b=a.length,c=this.nCachedObjects_,d=this._indicesByUUID,e=this._paths,f=this._parsedPaths,g=this._bindings,h=g.length,l=void 0,k=0,p=arguments.length;k!==
p;++k){var n=arguments[k],t=n.uuid,q=d[t];if(void 0===q){q=b++;d[t]=q;a.push(n);t=0;for(var r=h;t!==r;++t)g[t].push(new ra(n,e[t],f[t]))}else if(q<c){l=a[q];var u=--c;r=a[u];d[r.uuid]=q;a[q]=r;d[t]=u;a[u]=n;t=0;for(r=h;t!==r;++t){var y=g[t],w=y[q];y[q]=y[u];void 0===w&&(w=new ra(n,e[t],f[t]));y[u]=w}}else a[q]!==l&&console.error("THREE.AnimationObjectGroup: Different objects with the same UUID detected. Clean the caches or recreate your infrastructure when reloading scenes.")}this.nCachedObjects_=
c},remove:function(){for(var a=this._objects,b=this.nCachedObjects_,c=this._indicesByUUID,d=this._bindings,e=d.length,f=0,g=arguments.length;f!==g;++f){var h=arguments[f],l=h.uuid,k=c[l];if(void 0!==k&&k>=b){var p=b++,n=a[p];c[n.uuid]=k;a[k]=n;c[l]=p;a[p]=h;h=0;for(l=e;h!==l;++h){n=d[h];var t=n[k];n[k]=n[p];n[p]=t}}}this.nCachedObjects_=b},uncache:function(){for(var a=this._objects,b=a.length,c=this.nCachedObjects_,d=this._indicesByUUID,e=this._bindings,f=e.length,g=0,h=arguments.length;g!==h;++g){var l=
arguments[g].uuid,k=d[l];if(void 0!==k)if(delete d[l],k<c){l=--c;var p=a[l],n=--b,t=a[n];d[p.uuid]=k;a[k]=p;d[t.uuid]=l;a[l]=t;a.pop();p=0;for(t=f;p!==t;++p){var q=e[p],r=q[n];q[k]=q[l];q[l]=r;q.pop()}}else for(n=--b,t=a[n],d[t.uuid]=k,a[k]=t,a.pop(),p=0,t=f;p!==t;++p)q=e[p],q[k]=q[n],q.pop()}this.nCachedObjects_=c},subscribe_:function(a,b){var c=this._bindingsIndicesByPath,d=c[a],e=this._bindings;if(void 0!==d)return e[d];var f=this._paths,g=this._parsedPaths,h=this._objects,k=this.nCachedObjects_,
m=Array(h.length);d=e.length;c[a]=d;f.push(a);g.push(b);e.push(m);c=k;for(d=h.length;c!==d;++c)m[c]=new ra(h[c],a,b);return m},unsubscribe_:function(a){var b=this._bindingsIndicesByPath,c=b[a];if(void 0!==c){var d=this._paths,e=this._parsedPaths,f=this._bindings,g=f.length-1,h=f[g];b[a[g]]=c;f[c]=h;f.pop();e[c]=e[g];e.pop();d[c]=d[g];d.pop()}}});Object.assign(sf.prototype,{play:function(){this._mixer._activateAction(this);return this},stop:function(){this._mixer._deactivateAction(this);return this.reset()},
reset:function(){this.paused=!1;this.enabled=!0;this.time=0;this._loopCount=-1;this._startTime=null;return this.stopFading().stopWarping()},isRunning:function(){return this.enabled&&!this.paused&&0!==this.timeScale&&null===this._startTime&&this._mixer._isActiveAction(this)},isScheduled:function(){return this._mixer._isActiveAction(this)},startAt:function(a){this._startTime=a;return this},setLoop:function(a,b){this.loop=a;this.repetitions=b;return this},setEffectiveWeight:function(a){this.weight=a;
this._effectiveWeight=this.enabled?a:0;return this.stopFading()},getEffectiveWeight:function(){return this._effectiveWeight},fadeIn:function(a){return this._scheduleFading(a,0,1)},fadeOut:function(a){return this._scheduleFading(a,1,0)},crossFadeFrom:function(a,b,c){a.fadeOut(b);this.fadeIn(b);if(c){c=this._clip.duration;var d=a._clip.duration,e=c/d;a.warp(1,d/c,b);this.warp(e,1,b)}return this},crossFadeTo:function(a,b,c){return a.crossFadeFrom(this,b,c)},stopFading:function(){var a=this._weightInterpolant;
null!==a&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(a));return this},setEffectiveTimeScale:function(a){this.timeScale=a;this._effectiveTimeScale=this.paused?0:a;return this.stopWarping()},getEffectiveTimeScale:function(){return this._effectiveTimeScale},setDuration:function(a){this.timeScale=this._clip.duration/a;return this.stopWarping()},syncWith:function(a){this.time=a.time;this.timeScale=a.timeScale;return this.stopWarping()},halt:function(a){return this.warp(this._effectiveTimeScale,
0,a)},warp:function(a,b,c){var d=this._mixer,e=d.time,f=this._timeScaleInterpolant,g=this.timeScale;null===f&&(this._timeScaleInterpolant=f=d._lendControlInterpolant());d=f.parameterPositions;f=f.sampleValues;d[0]=e;d[1]=e+c;f[0]=a/g;f[1]=b/g;return this},stopWarping:function(){var a=this._timeScaleInterpolant;null!==a&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(a));return this},getMixer:function(){return this._mixer},getClip:function(){return this._clip},getRoot:function(){return this._localRoot||
this._mixer._root},_update:function(a,b,c,d){if(this.enabled){var e=this._startTime;if(null!==e){b=(a-e)*c;if(0>b||0===c)return;this._startTime=null;b*=c}b*=this._updateTimeScale(a);c=this._updateTime(b);a=this._updateWeight(a);if(0<a){b=this._interpolants;e=this._propertyBindings;for(var f=0,g=b.length;f!==g;++f)b[f].evaluate(c),e[f].accumulate(d,a)}}else this._updateWeight(a)},_updateWeight:function(a){var b=0;if(this.enabled){b=this.weight;var c=this._weightInterpolant;if(null!==c){var d=c.evaluate(a)[0];
b*=d;a>c.parameterPositions[1]&&(this.stopFading(),0===d&&(this.enabled=!1))}}return this._effectiveWeight=b},_updateTimeScale:function(a){var b=0;if(!this.paused){b=this.timeScale;var c=this._timeScaleInterpolant;if(null!==c){var d=c.evaluate(a)[0];b*=d;a>c.parameterPositions[1]&&(this.stopWarping(),0===b?this.paused=!0:this.timeScale=b)}}return this._effectiveTimeScale=b},_updateTime:function(a){var b=this.time+a;if(0===a)return b;var c=this._clip.duration,d=this.loop,e=this._loopCount;if(2200===
d)a:{if(-1===e&&(this._loopCount=0,this._setEndings(!0,!0,!1)),b>=c)b=c;else if(0>b)b=0;else break a;this.clampWhenFinished?this.paused=!0:this.enabled=!1;this._mixer.dispatchEvent({type:"finished",action:this,direction:0>a?-1:1})}else{d=2202===d;-1===e&&(0<=a?(e=0,this._setEndings(!0,0===this.repetitions,d)):this._setEndings(0===this.repetitions,!0,d));if(b>=c||0>b){var f=Math.floor(b/c);b-=c*f;e+=Math.abs(f);var g=this.repetitions-e;0>=g?(this.clampWhenFinished?this.paused=!0:this.enabled=!1,b=
0<a?c:0,this._mixer.dispatchEvent({type:"finished",action:this,direction:0<a?1:-1})):(1===g?(a=0>a,this._setEndings(a,!a,d)):this._setEndings(!1,!1,d),this._loopCount=e,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:f}))}if(d&&1===(e&1))return this.time=b,c-b}return this.time=b},_setEndings:function(a,b,c){var d=this._interpolantSettings;c?(d.endingStart=2401,d.endingEnd=2401):(d.endingStart=a?this.zeroSlopeAtStart?2401:2400:2402,d.endingEnd=b?this.zeroSlopeAtEnd?2401:2400:2402)},_scheduleFading:function(a,
b,c){var d=this._mixer,e=d.time,f=this._weightInterpolant;null===f&&(this._weightInterpolant=f=d._lendControlInterpolant());d=f.parameterPositions;f=f.sampleValues;d[0]=e;f[0]=b;d[1]=e+a;f[1]=c;return this}});te.prototype=Object.assign(Object.create(za.prototype),{constructor:te,_bindAction:function(a,b){var c=a._localRoot||this._root,d=a._clip.tracks,e=d.length,f=a._propertyBindings;a=a._interpolants;var g=c.uuid,h=this._bindingsByRootAndName,k=h[g];void 0===k&&(k={},h[g]=k);for(h=0;h!==e;++h){var m=
d[h],p=m.name,n=k[p];if(void 0===n){n=f[h];if(void 0!==n){null===n._cacheIndex&&(++n.referenceCount,this._addInactiveBinding(n,g,p));continue}n=new se(ra.create(c,p,b&&b._propertyBindings[h].binding.parsedPath),m.ValueTypeName,m.getValueSize());++n.referenceCount;this._addInactiveBinding(n,g,p)}f[h]=n;a[h].resultBuffer=n.buffer}},_activateAction:function(a){if(!this._isActiveAction(a)){if(null===a._cacheIndex){var b=(a._localRoot||this._root).uuid,c=a._clip.uuid,d=this._actionsByClip[c];this._bindAction(a,
d&&d.knownActions[0]);this._addInactiveAction(a,c,b)}b=a._propertyBindings;c=0;for(d=b.length;c!==d;++c){var e=b[c];0===e.useCount++&&(this._lendBinding(e),e.saveOriginalState())}this._lendAction(a)}},_deactivateAction:function(a){if(this._isActiveAction(a)){for(var b=a._propertyBindings,c=0,d=b.length;c!==d;++c){var e=b[c];0===--e.useCount&&(e.restoreOriginalState(),this._takeBackBinding(e))}this._takeBackAction(a)}},_initMemoryManager:function(){this._actions=[];this._nActiveActions=0;this._actionsByClip=
{};this._bindings=[];this._nActiveBindings=0;this._bindingsByRootAndName={};this._controlInterpolants=[];this._nActiveControlInterpolants=0;var a=this;this.stats={actions:{get total(){return a._actions.length},get inUse(){return a._nActiveActions}},bindings:{get total(){return a._bindings.length},get inUse(){return a._nActiveBindings}},controlInterpolants:{get total(){return a._controlInterpolants.length},get inUse(){return a._nActiveControlInterpolants}}}},_isActiveAction:function(a){a=a._cacheIndex;
return null!==a&&a<this._nActiveActions},_addInactiveAction:function(a,b,c){var d=this._actions,e=this._actionsByClip,f=e[b];void 0===f?(f={knownActions:[a],actionByRoot:{}},a._byClipCacheIndex=0,e[b]=f):(b=f.knownActions,a._byClipCacheIndex=b.length,b.push(a));a._cacheIndex=d.length;d.push(a);f.actionByRoot[c]=a},_removeInactiveAction:function(a){var b=this._actions,c=b[b.length-1],d=a._cacheIndex;c._cacheIndex=d;b[d]=c;b.pop();a._cacheIndex=null;b=a._clip.uuid;c=this._actionsByClip;d=c[b];var e=
d.knownActions,f=e[e.length-1],g=a._byClipCacheIndex;f._byClipCacheIndex=g;e[g]=f;e.pop();a._byClipCacheIndex=null;delete d.actionByRoot[(a._localRoot||this._root).uuid];0===e.length&&delete c[b];this._removeInactiveBindingsForAction(a)},_removeInactiveBindingsForAction:function(a){a=a._propertyBindings;for(var b=0,c=a.length;b!==c;++b){var d=a[b];0===--d.referenceCount&&this._removeInactiveBinding(d)}},_lendAction:function(a){var b=this._actions,c=a._cacheIndex,d=this._nActiveActions++,e=b[d];a._cacheIndex=
d;b[d]=a;e._cacheIndex=c;b[c]=e},_takeBackAction:function(a){var b=this._actions,c=a._cacheIndex,d=--this._nActiveActions,e=b[d];a._cacheIndex=d;b[d]=a;e._cacheIndex=c;b[c]=e},_addInactiveBinding:function(a,b,c){var d=this._bindingsByRootAndName,e=d[b],f=this._bindings;void 0===e&&(e={},d[b]=e);e[c]=a;a._cacheIndex=f.length;f.push(a)},_removeInactiveBinding:function(a){var b=this._bindings,c=a.binding,d=c.rootNode.uuid;c=c.path;var e=this._bindingsByRootAndName,f=e[d],g=b[b.length-1];a=a._cacheIndex;
g._cacheIndex=a;b[a]=g;b.pop();delete f[c];a:{for(var h in f)break a;delete e[d]}},_lendBinding:function(a){var b=this._bindings,c=a._cacheIndex,d=this._nActiveBindings++,e=b[d];a._cacheIndex=d;b[d]=a;e._cacheIndex=c;b[c]=e},_takeBackBinding:function(a){var b=this._bindings,c=a._cacheIndex,d=--this._nActiveBindings,e=b[d];a._cacheIndex=d;b[d]=a;e._cacheIndex=c;b[c]=e},_lendControlInterpolant:function(){var a=this._controlInterpolants,b=this._nActiveControlInterpolants++,c=a[b];void 0===c&&(c=new jd(new Float32Array(2),
new Float32Array(2),1,this._controlInterpolantsResultBuffer),c.__cacheIndex=b,a[b]=c);return c},_takeBackControlInterpolant:function(a){var b=this._controlInterpolants,c=a.__cacheIndex,d=--this._nActiveControlInterpolants,e=b[d];a.__cacheIndex=d;b[d]=a;e.__cacheIndex=c;b[c]=e},_controlInterpolantsResultBuffer:new Float32Array(1),clipAction:function(a,b){var c=b||this._root,d=c.uuid;c="string"===typeof a?Ga.findByName(c,a):a;a=null!==c?c.uuid:a;var e=this._actionsByClip[a],f=null;if(void 0!==e){f=
e.actionByRoot[d];if(void 0!==f)return f;f=e.knownActions[0];null===c&&(c=f._clip)}if(null===c)return null;b=new sf(this,c,b);this._bindAction(b,f);this._addInactiveAction(b,a,d);return b},existingAction:function(a,b){var c=b||this._root;b=c.uuid;c="string"===typeof a?Ga.findByName(c,a):a;a=this._actionsByClip[c?c.uuid:a];return void 0!==a?a.actionByRoot[b]||null:null},stopAllAction:function(){for(var a=this._actions,b=this._nActiveActions,c=this._bindings,d=this._nActiveBindings,e=this._nActiveBindings=
this._nActiveActions=0;e!==b;++e)a[e].reset();for(e=0;e!==d;++e)c[e].useCount=0;return this},update:function(a){a*=this.timeScale;for(var b=this._actions,c=this._nActiveActions,d=this.time+=a,e=Math.sign(a),f=this._accuIndex^=1,g=0;g!==c;++g)b[g]._update(d,a,e,f);a=this._bindings;b=this._nActiveBindings;for(g=0;g!==b;++g)a[g].apply(f);return this},getRoot:function(){return this._root},uncacheClip:function(a){var b=this._actions;a=a.uuid;var c=this._actionsByClip,d=c[a];if(void 0!==d){d=d.knownActions;
for(var e=0,f=d.length;e!==f;++e){var g=d[e];this._deactivateAction(g);var h=g._cacheIndex,k=b[b.length-1];g._cacheIndex=null;g._byClipCacheIndex=null;k._cacheIndex=h;b[h]=k;b.pop();this._removeInactiveBindingsForAction(g)}delete c[a]}},uncacheRoot:function(a){a=a.uuid;var b=this._actionsByClip;for(d in b){var c=b[d].actionByRoot[a];void 0!==c&&(this._deactivateAction(c),this._removeInactiveAction(c))}var d=this._bindingsByRootAndName[a];if(void 0!==d)for(var e in d)a=d[e],a.restoreOriginalState(),
this._removeInactiveBinding(a)},uncacheAction:function(a,b){a=this.existingAction(a,b);null!==a&&(this._deactivateAction(a),this._removeInactiveAction(a))}});Qd.prototype.clone=function(){return new Qd(void 0===this.value.clone?this.value:this.value.clone())};ue.prototype=Object.assign(Object.create(D.prototype),{constructor:ue,isInstancedBufferGeometry:!0,copy:function(a){D.prototype.copy.call(this,a);this.maxInstancedCount=a.maxInstancedCount;return this},clone:function(){return(new this.constructor).copy(this)}});
Object.defineProperties(ve.prototype,{count:{get:function(){return this.data.count}},array:{get:function(){return this.data.array}}});Object.assign(ve.prototype,{isInterleavedBufferAttribute:!0,setX:function(a,b){this.data.array[a*this.data.stride+this.offset]=b;return this},setY:function(a,b){this.data.array[a*this.data.stride+this.offset+1]=b;return this},setZ:function(a,b){this.data.array[a*this.data.stride+this.offset+2]=b;return this},setW:function(a,b){this.data.array[a*this.data.stride+this.offset+
3]=b;return this},getX:function(a){return this.data.array[a*this.data.stride+this.offset]},getY:function(a){return this.data.array[a*this.data.stride+this.offset+1]},getZ:function(a){return this.data.array[a*this.data.stride+this.offset+2]},getW:function(a){return this.data.array[a*this.data.stride+this.offset+3]},setXY:function(a,b,c){a=a*this.data.stride+this.offset;this.data.array[a+0]=b;this.data.array[a+1]=c;return this},setXYZ:function(a,b,c,d){a=a*this.data.stride+this.offset;this.data.array[a+
0]=b;this.data.array[a+1]=c;this.data.array[a+2]=d;return this},setXYZW:function(a,b,c,d,e){a=a*this.data.stride+this.offset;this.data.array[a+0]=b;this.data.array[a+1]=c;this.data.array[a+2]=d;this.data.array[a+3]=e;return this}});Object.defineProperty(rc.prototype,"needsUpdate",{set:function(a){!0===a&&this.version++}});Object.assign(rc.prototype,{isInterleavedBuffer:!0,onUploadCallback:function(){},setArray:function(a){if(Array.isArray(a))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");
this.count=void 0!==a?a.length/this.stride:0;this.array=a;return this},setDynamic:function(a){this.dynamic=a;return this},copy:function(a){this.array=new a.array.constructor(a.array);this.count=a.count;this.stride=a.stride;this.dynamic=a.dynamic;return this},copyAt:function(a,b,c){a*=this.stride;c*=b.stride;for(var d=0,e=this.stride;d<e;d++)this.array[a+d]=b.array[c+d];return this},set:function(a,b){void 0===b&&(b=0);this.array.set(a,b);return this},clone:function(){return(new this.constructor).copy(this)},
onUpload:function(a){this.onUploadCallback=a;return this}});we.prototype=Object.assign(Object.create(rc.prototype),{constructor:we,isInstancedInterleavedBuffer:!0,copy:function(a){rc.prototype.copy.call(this,a);this.meshPerAttribute=a.meshPerAttribute;return this}});xe.prototype=Object.assign(Object.create(L.prototype),{constructor:xe,isInstancedBufferAttribute:!0,copy:function(a){L.prototype.copy.call(this,a);this.meshPerAttribute=a.meshPerAttribute;return this}});Object.assign(tf.prototype,{linePrecision:1,
set:function(a,b){this.ray.set(a,b)},setFromCamera:function(a,b){b&&b.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(b.matrixWorld),this.ray.direction.set(a.x,a.y,.5).unproject(b).sub(this.ray.origin).normalize()):b&&b.isOrthographicCamera?(this.ray.origin.set(a.x,a.y,(b.near+b.far)/(b.near-b.far)).unproject(b),this.ray.direction.set(0,0,-1).transformDirection(b.matrixWorld)):console.error("THREE.Raycaster: Unsupported camera type.")},intersectObject:function(a,b,c){c=c||[];ye(a,this,
c,b);c.sort(uf);return c},intersectObjects:function(a,b,c){c=c||[];if(!1===Array.isArray(a))return console.warn("THREE.Raycaster.intersectObjects: objects is not an Array."),c;for(var d=0,e=a.length;d<e;d++)ye(a[d],this,c,b);c.sort(uf);return c}});Object.assign(vf.prototype,{start:function(){this.oldTime=this.startTime=("undefined"===typeof performance?Date:performance).now();this.elapsedTime=0;this.running=!0},stop:function(){this.getElapsedTime();this.autoStart=this.running=!1},getElapsedTime:function(){this.getDelta();
return this.elapsedTime},getDelta:function(){var a=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){var b=("undefined"===typeof performance?Date:performance).now();a=(b-this.oldTime)/1E3;this.oldTime=b;this.elapsedTime+=a}return a}});Object.assign(wf.prototype,{set:function(a,b,c){this.radius=a;this.phi=b;this.theta=c;return this},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.radius=a.radius;this.phi=a.phi;this.theta=a.theta;return this},
makeSafe:function(){this.phi=Math.max(1E-6,Math.min(Math.PI-1E-6,this.phi));return this},setFromVector3:function(a){this.radius=a.length();0===this.radius?this.phi=this.theta=0:(this.theta=Math.atan2(a.x,a.z),this.phi=Math.acos(J.clamp(a.y/this.radius,-1,1)));return this}});Object.assign(xf.prototype,{set:function(a,b,c){this.radius=a;this.theta=b;this.y=c;return this},clone:function(){return(new this.constructor).copy(this)},copy:function(a){this.radius=a.radius;this.theta=a.theta;this.y=a.y;return this},
setFromVector3:function(a){this.radius=Math.sqrt(a.x*a.x+a.z*a.z);this.theta=Math.atan2(a.x,a.z);this.y=a.y;return this}});Object.assign(ze.prototype,{set:function(a,b){this.min.copy(a);this.max.copy(b);return this},setFromPoints:function(a){this.makeEmpty();for(var b=0,c=a.length;b<c;b++)this.expandByPoint(a[b]);return this},setFromCenterAndSize:function(){var a=new B;return function(b,c){c=a.copy(c).multiplyScalar(.5);this.min.copy(b).sub(c);this.max.copy(b).add(c);return this}}(),clone:function(){return(new this.constructor).copy(this)},
copy:function(a){this.min.copy(a.min);this.max.copy(a.max);return this},makeEmpty:function(){this.min.x=this.min.y=Infinity;this.max.x=this.max.y=-Infinity;return this},isEmpty:function(){return this.max.x<this.min.x||this.max.y<this.min.y},getCenter:function(a){void 0===a&&(console.warn("THREE.Box2: .getCenter() target is now required"),a=new B);return this.isEmpty()?a.set(0,0):a.addVectors(this.min,this.max).multiplyScalar(.5)},getSize:function(a){void 0===a&&(console.warn("THREE.Box2: .getSize() target is now required"),
a=new B);return this.isEmpty()?a.set(0,0):a.subVectors(this.max,this.min)},expandByPoint:function(a){this.min.min(a);this.max.max(a);return this},expandByVector:function(a){this.min.sub(a);this.max.add(a);return this},expandByScalar:function(a){this.min.addScalar(-a);this.max.addScalar(a);return this},containsPoint:function(a){return a.x<this.min.x||a.x>this.max.x||a.y<this.min.y||a.y>this.max.y?!1:!0},containsBox:function(a){return this.min.x<=a.min.x&&a.max.x<=this.max.x&&this.min.y<=a.min.y&&a.max.y<=
this.max.y},getParameter:function(a,b){void 0===b&&(console.warn("THREE.Box2: .getParameter() target is now required"),b=new B);return b.set((a.x-this.min.x)/(this.max.x-this.min.x),(a.y-this.min.y)/(this.max.y-this.min.y))},intersectsBox:function(a){return a.max.x<this.min.x||a.min.x>this.max.x||a.max.y<this.min.y||a.min.y>this.max.y?!1:!0},clampPoint:function(a,b){void 0===b&&(console.warn("THREE.Box2: .clampPoint() target is now required"),b=new B);return b.copy(a).clamp(this.min,this.max)},distanceToPoint:function(){var a=
new B;return function(b){return a.copy(b).clamp(this.min,this.max).sub(b).length()}}(),intersect:function(a){this.min.max(a.min);this.max.min(a.max);return this},union:function(a){this.min.min(a.min);this.max.max(a.max);return this},translate:function(a){this.min.add(a);this.max.add(a);return this},equals:function(a){return a.min.equals(this.min)&&a.max.equals(this.max)}});ld.prototype=Object.create(H.prototype);ld.prototype.constructor=ld;ld.prototype.isImmediateRenderObject=!0;md.prototype=Object.create(Y.prototype);
md.prototype.constructor=md;md.prototype.update=function(){var a=new p,b=new p,c=new la;return function(){var d=["a","b","c"];this.object.updateMatrixWorld(!0);c.getNormalMatrix(this.object.matrixWorld);var e=this.object.matrixWorld,f=this.geometry.attributes.position,g=this.object.geometry;if(g&&g.isGeometry)for(var h=g.vertices,k=g.faces,m=g=0,p=k.length;m<p;m++)for(var n=k[m],t=0,q=n.vertexNormals.length;t<q;t++){var r=n.vertexNormals[t];a.copy(h[n[d[t]]]).applyMatrix4(e);b.copy(r).applyMatrix3(c).normalize().multiplyScalar(this.size).add(a);
f.setXYZ(g,a.x,a.y,a.z);g+=1;f.setXYZ(g,b.x,b.y,b.z);g+=1}else if(g&&g.isBufferGeometry)for(d=g.attributes.position,h=g.attributes.normal,t=g=0,q=d.count;t<q;t++)a.set(d.getX(t),d.getY(t),d.getZ(t)).applyMatrix4(e),b.set(h.getX(t),h.getY(t),h.getZ(t)),b.applyMatrix3(c).normalize().multiplyScalar(this.size).add(a),f.setXYZ(g,a.x,a.y,a.z),g+=1,f.setXYZ(g,b.x,b.y,b.z),g+=1;f.needsUpdate=!0}}();sc.prototype=Object.create(H.prototype);sc.prototype.constructor=sc;sc.prototype.dispose=function(){this.cone.geometry.dispose();
this.cone.material.dispose()};sc.prototype.update=function(){var a=new p,b=new p;return function(){this.light.updateMatrixWorld();var c=this.light.distance?this.light.distance:1E3,d=c*Math.tan(this.light.angle);this.cone.scale.set(d,d,c);a.setFromMatrixPosition(this.light.matrixWorld);b.setFromMatrixPosition(this.light.target.matrixWorld);this.cone.lookAt(b.sub(a));void 0!==this.color?this.cone.material.color.set(this.color):this.cone.material.color.copy(this.light.color)}}();tc.prototype=Object.create(Y.prototype);
tc.prototype.constructor=tc;tc.prototype.updateMatrixWorld=function(){var a=new p,b=new R,c=new R;return function(d){var e=this.bones,f=this.geometry,g=f.getAttribute("position");c.getInverse(this.root.matrixWorld);for(var h=0,k=0;h<e.length;h++){var m=e[h];m.parent&&m.parent.isBone&&(b.multiplyMatrices(c,m.matrixWorld),a.setFromMatrixPosition(b),g.setXYZ(k,a.x,a.y,a.z),b.multiplyMatrices(c,m.parent.matrixWorld),a.setFromMatrixPosition(b),g.setXYZ(k+1,a.x,a.y,a.z),k+=2)}f.getAttribute("position").needsUpdate=
!0;H.prototype.updateMatrixWorld.call(this,d)}}();uc.prototype=Object.create(va.prototype);uc.prototype.constructor=uc;uc.prototype.dispose=function(){this.geometry.dispose();this.material.dispose()};uc.prototype.update=function(){void 0!==this.color?this.material.color.set(this.color):this.material.color.copy(this.light.color)};vc.prototype=Object.create(H.prototype);vc.prototype.constructor=vc;vc.prototype.dispose=function(){this.children[0].geometry.dispose();this.children[0].material.dispose()};
vc.prototype.update=function(){var a=.5*this.light.width,b=.5*this.light.height,c=this.line.geometry.attributes.position,d=c.array;d[0]=a;d[1]=-b;d[2]=0;d[3]=a;d[4]=b;d[5]=0;d[6]=-a;d[7]=b;d[8]=0;d[9]=-a;d[10]=-b;d[11]=0;d[12]=a;d[13]=-b;d[14]=0;c.needsUpdate=!0;void 0!==this.color?this.line.material.color.set(this.color):this.line.material.color.copy(this.light.color)};wc.prototype=Object.create(H.prototype);wc.prototype.constructor=wc;wc.prototype.dispose=function(){this.children[0].geometry.dispose();
this.children[0].material.dispose()};wc.prototype.update=function(){var a=new p,b=new G,c=new G;return function(){var d=this.children[0];if(void 0!==this.color)this.material.color.set(this.color);else{var e=d.geometry.getAttribute("color");b.copy(this.light.color);c.copy(this.light.groundColor);for(var f=0,g=e.count;f<g;f++){var h=f<g/2?b:c;e.setXYZ(f,h.r,h.g,h.b)}e.needsUpdate=!0}d.lookAt(a.setFromMatrixPosition(this.light.matrixWorld).negate())}}();nd.prototype=Object.create(Y.prototype);nd.prototype.constructor=
nd;Rd.prototype=Object.create(Y.prototype);Rd.prototype.constructor=Rd;od.prototype=Object.create(Y.prototype);od.prototype.constructor=od;od.prototype.update=function(){var a=new p,b=new p,c=new la;return function(){this.object.updateMatrixWorld(!0);c.getNormalMatrix(this.object.matrixWorld);var d=this.object.matrixWorld,e=this.geometry.attributes.position,f=this.object.geometry,g=f.vertices;f=f.faces;for(var h=0,k=0,m=f.length;k<m;k++){var p=f[k],n=p.normal;a.copy(g[p.a]).add(g[p.b]).add(g[p.c]).divideScalar(3).applyMatrix4(d);
b.copy(n).applyMatrix3(c).normalize().multiplyScalar(this.size).add(a);e.setXYZ(h,a.x,a.y,a.z);h+=1;e.setXYZ(h,b.x,b.y,b.z);h+=1}e.needsUpdate=!0}}();xc.prototype=Object.create(H.prototype);xc.prototype.constructor=xc;xc.prototype.dispose=function(){this.lightPlane.geometry.dispose();this.lightPlane.material.dispose();this.targetLine.geometry.dispose();this.targetLine.material.dispose()};xc.prototype.update=function(){var a=new p,b=new p,c=new p;return function(){a.setFromMatrixPosition(this.light.matrixWorld);
b.setFromMatrixPosition(this.light.target.matrixWorld);c.subVectors(b,a);this.lightPlane.lookAt(c);void 0!==this.color?(this.lightPlane.material.color.set(this.color),this.targetLine.material.color.set(this.color)):(this.lightPlane.material.color.copy(this.light.color),this.targetLine.material.color.copy(this.light.color));this.targetLine.lookAt(c);this.targetLine.scale.z=c.length()}}();pd.prototype=Object.create(Y.prototype);pd.prototype.constructor=pd;pd.prototype.update=function(){function a(a,
g,h,k){d.set(g,h,k).unproject(e);a=c[a];if(void 0!==a)for(g=b.getAttribute("position"),h=0,k=a.length;h<k;h++)g.setXYZ(a[h],d.x,d.y,d.z)}var b,c,d=new p,e=new Ra;return function(){b=this.geometry;c=this.pointMap;e.projectionMatrix.copy(this.camera.projectionMatrix);a("c",0,0,-1);a("t",0,0,1);a("n1",-1,-1,-1);a("n2",1,-1,-1);a("n3",-1,1,-1);a("n4",1,1,-1);a("f1",-1,-1,1);a("f2",1,-1,1);a("f3",-1,1,1);a("f4",1,1,1);a("u1",.7,1.1,-1);a("u2",-.7,1.1,-1);a("u3",0,2,-1);a("cf1",-1,0,1);a("cf2",1,0,1);a("cf3",
0,-1,1);a("cf4",0,1,1);a("cn1",-1,0,-1);a("cn2",1,0,-1);a("cn3",0,-1,-1);a("cn4",0,1,-1);b.getAttribute("position").needsUpdate=!0}}();Ib.prototype=Object.create(Y.prototype);Ib.prototype.constructor=Ib;Ib.prototype.update=function(){var a=new Xa;return function(b){void 0!==b&&console.warn("THREE.BoxHelper: .update() has no longer arguments.");void 0!==this.object&&a.setFromObject(this.object);if(!a.isEmpty()){b=a.min;var c=a.max,d=this.geometry.attributes.position,e=d.array;e[0]=c.x;e[1]=c.y;e[2]=
c.z;e[3]=b.x;e[4]=c.y;e[5]=c.z;e[6]=b.x;e[7]=b.y;e[8]=c.z;e[9]=c.x;e[10]=b.y;e[11]=c.z;e[12]=c.x;e[13]=c.y;e[14]=b.z;e[15]=b.x;e[16]=c.y;e[17]=b.z;e[18]=b.x;e[19]=b.y;e[20]=b.z;e[21]=c.x;e[22]=b.y;e[23]=b.z;d.needsUpdate=!0;this.geometry.computeBoundingSphere()}}}();Ib.prototype.setFromObject=function(a){this.object=a;this.update();return this};qd.prototype=Object.create(Y.prototype);qd.prototype.constructor=qd;qd.prototype.updateMatrixWorld=function(a){var b=this.box;b.isEmpty()||(b.getCenter(this.position),
b.getSize(this.scale),this.scale.multiplyScalar(.5),H.prototype.updateMatrixWorld.call(this,a))};rd.prototype=Object.create(wa.prototype);rd.prototype.constructor=rd;rd.prototype.updateMatrixWorld=function(a){var b=-this.plane.constant;1E-8>Math.abs(b)&&(b=1E-8);this.scale.set(.5*this.size,.5*this.size,b);this.children[0].material.side=0>b?1:0;this.lookAt(this.plane.normal);H.prototype.updateMatrixWorld.call(this,a)};var Sd,Ae;Jb.prototype=Object.create(H.prototype);Jb.prototype.constructor=Jb;Jb.prototype.setDirection=
function(){var a=new p,b;return function(c){.99999<c.y?this.quaternion.set(0,0,0,1):-.99999>c.y?this.quaternion.set(1,0,0,0):(a.set(c.z,0,-c.x).normalize(),b=Math.acos(c.y),this.quaternion.setFromAxisAngle(a,b))}}();Jb.prototype.setLength=function(a,b,c){void 0===b&&(b=.2*a);void 0===c&&(c=.2*b);this.line.scale.set(1,Math.max(0,a-b),1);this.line.updateMatrix();this.cone.scale.set(c,b,c);this.cone.position.y=a;this.cone.updateMatrix()};Jb.prototype.setColor=function(a){this.line.material.color.copy(a);
this.cone.material.color.copy(a)};sd.prototype=Object.create(Y.prototype);sd.prototype.constructor=sd;E.create=function(a,b){console.log("THREE.Curve.create() has been deprecated");a.prototype=Object.create(E.prototype);a.prototype.constructor=a;a.prototype.getPoint=b;return a};Object.assign(bb.prototype,{createPointsGeometry:function(a){console.warn("THREE.CurvePath: .createPointsGeometry() has been removed. Use new THREE.Geometry().setFromPoints( points ) instead.");a=this.getPoints(a);return this.createGeometry(a)},
createSpacedPointsGeometry:function(a){console.warn("THREE.CurvePath: .createSpacedPointsGeometry() has been removed. Use new THREE.Geometry().setFromPoints( points ) instead.");a=this.getSpacedPoints(a);return this.createGeometry(a)},createGeometry:function(a){console.warn("THREE.CurvePath: .createGeometry() has been removed. Use new THREE.Geometry().setFromPoints( points ) instead.");for(var b=new P,c=0,d=a.length;c<d;c++){var e=a[c];b.vertices.push(new p(e.x,e.y,e.z||0))}return b}});Object.assign(Qa.prototype,
{fromPoints:function(a){console.warn("THREE.Path: .fromPoints() has been renamed to .setFromPoints().");this.setFromPoints(a)}});zf.prototype=Object.create(pa.prototype);Af.prototype=Object.create(pa.prototype);Be.prototype=Object.create(pa.prototype);Object.assign(Be.prototype,{initFromArray:function(){console.error("THREE.Spline: .initFromArray() has been removed.")},getControlPointsArray:function(){console.error("THREE.Spline: .getControlPointsArray() has been removed.")},reparametrizeByArcLength:function(){console.error("THREE.Spline: .reparametrizeByArcLength() has been removed.")}});
nd.prototype.setColors=function(){console.error("THREE.GridHelper: setColors() has been deprecated, pass them in the constructor instead.")};tc.prototype.update=function(){console.error("THREE.SkeletonHelper: update() no longer needs to be called.")};Object.assign(pc.prototype,{extractUrlBase:function(a){console.warn("THREE.Loader: .extractUrlBase() has been deprecated. Use THREE.LoaderUtils.extractUrlBase() instead.");return Fe.extractUrlBase(a)}});Object.assign(ze.prototype,{center:function(a){console.warn("THREE.Box2: .center() has been renamed to .getCenter().");
return this.getCenter(a)},empty:function(){console.warn("THREE.Box2: .empty() has been renamed to .isEmpty().");return this.isEmpty()},isIntersectionBox:function(a){console.warn("THREE.Box2: .isIntersectionBox() has been renamed to .intersectsBox().");return this.intersectsBox(a)},size:function(a){console.warn("THREE.Box2: .size() has been renamed to .getSize().");return this.getSize(a)}});Object.assign(Xa.prototype,{center:function(a){console.warn("THREE.Box3: .center() has been renamed to .getCenter().");
return this.getCenter(a)},empty:function(){console.warn("THREE.Box3: .empty() has been renamed to .isEmpty().");return this.isEmpty()},isIntersectionBox:function(a){console.warn("THREE.Box3: .isIntersectionBox() has been renamed to .intersectsBox().");return this.intersectsBox(a)},isIntersectionSphere:function(a){console.warn("THREE.Box3: .isIntersectionSphere() has been renamed to .intersectsSphere().");return this.intersectsSphere(a)},size:function(a){console.warn("THREE.Box3: .size() has been renamed to .getSize().");
return this.getSize(a)}});Qb.prototype.center=function(a){console.warn("THREE.Line3: .center() has been renamed to .getCenter().");return this.getCenter(a)};Object.assign(J,{random16:function(){console.warn("THREE.Math: .random16() has been deprecated. Use Math.random() instead.");return Math.random()},nearestPowerOfTwo:function(a){console.warn("THREE.Math: .nearestPowerOfTwo() has been renamed to .floorPowerOfTwo().");return J.floorPowerOfTwo(a)},nextPowerOfTwo:function(a){console.warn("THREE.Math: .nextPowerOfTwo() has been renamed to .ceilPowerOfTwo().");
return J.ceilPowerOfTwo(a)}});Object.assign(la.prototype,{flattenToArrayOffset:function(a,b){console.warn("THREE.Matrix3: .flattenToArrayOffset() has been deprecated. Use .toArray() instead.");return this.toArray(a,b)},multiplyVector3:function(a){console.warn("THREE.Matrix3: .multiplyVector3() has been removed. Use vector.applyMatrix3( matrix ) instead.");return a.applyMatrix3(this)},multiplyVector3Array:function(){console.error("THREE.Matrix3: .multiplyVector3Array() has been removed.")},applyToBuffer:function(a){console.warn("THREE.Matrix3: .applyToBuffer() has been removed. Use matrix.applyToBufferAttribute( attribute ) instead.");
return this.applyToBufferAttribute(a)},applyToVector3Array:function(){console.error("THREE.Matrix3: .applyToVector3Array() has been removed.")}});Object.assign(R.prototype,{extractPosition:function(a){console.warn("THREE.Matrix4: .extractPosition() has been renamed to .copyPosition().");return this.copyPosition(a)},flattenToArrayOffset:function(a,b){console.warn("THREE.Matrix4: .flattenToArrayOffset() has been deprecated. Use .toArray() instead.");return this.toArray(a,b)},getPosition:function(){var a;
return function(){void 0===a&&(a=new p);console.warn("THREE.Matrix4: .getPosition() has been removed. Use Vector3.setFromMatrixPosition( matrix ) instead.");return a.setFromMatrixColumn(this,3)}}(),setRotationFromQuaternion:function(a){console.warn("THREE.Matrix4: .setRotationFromQuaternion() has been renamed to .makeRotationFromQuaternion().");return this.makeRotationFromQuaternion(a)},multiplyToArray:function(){console.warn("THREE.Matrix4: .multiplyToArray() has been removed.")},multiplyVector3:function(a){console.warn("THREE.Matrix4: .multiplyVector3() has been removed. Use vector.applyMatrix4( matrix ) instead.");
return a.applyMatrix4(this)},multiplyVector4:function(a){console.warn("THREE.Matrix4: .multiplyVector4() has been removed. Use vector.applyMatrix4( matrix ) instead.");return a.applyMatrix4(this)},multiplyVector3Array:function(){console.error("THREE.Matrix4: .multiplyVector3Array() has been removed.")},rotateAxis:function(a){console.warn("THREE.Matrix4: .rotateAxis() has been removed. Use Vector3.transformDirection( matrix ) instead.");a.transformDirection(this)},crossVector:function(a){console.warn("THREE.Matrix4: .crossVector() has been removed. Use vector.applyMatrix4( matrix ) instead.");
return a.applyMatrix4(this)},translate:function(){console.error("THREE.Matrix4: .translate() has been removed.")},rotateX:function(){console.error("THREE.Matrix4: .rotateX() has been removed.")},rotateY:function(){console.error("THREE.Matrix4: .rotateY() has been removed.")},rotateZ:function(){console.error("THREE.Matrix4: .rotateZ() has been removed.")},rotateByAxis:function(){console.error("THREE.Matrix4: .rotateByAxis() has been removed.")},applyToBuffer:function(a){console.warn("THREE.Matrix4: .applyToBuffer() has been removed. Use matrix.applyToBufferAttribute( attribute ) instead.");
return this.applyToBufferAttribute(a)},applyToVector3Array:function(){console.error("THREE.Matrix4: .applyToVector3Array() has been removed.")},makeFrustum:function(a,b,c,d,e,f){console.warn("THREE.Matrix4: .makeFrustum() has been removed. Use .makePerspective( left, right, top, bottom, near, far ) instead.");return this.makePerspective(a,b,d,c,e,f)}});Ia.prototype.isIntersectionLine=function(a){console.warn("THREE.Plane: .isIntersectionLine() has been renamed to .intersectsLine().");return this.intersectsLine(a)};
ca.prototype.multiplyVector3=function(a){console.warn("THREE.Quaternion: .multiplyVector3() has been removed. Use is now vector.applyQuaternion( quaternion ) instead.");return a.applyQuaternion(this)};Object.assign(sb.prototype,{isIntersectionBox:function(a){console.warn("THREE.Ray: .isIntersectionBox() has been renamed to .intersectsBox().");return this.intersectsBox(a)},isIntersectionPlane:function(a){console.warn("THREE.Ray: .isIntersectionPlane() has been renamed to .intersectsPlane().");return this.intersectsPlane(a)},
isIntersectionSphere:function(a){console.warn("THREE.Ray: .isIntersectionSphere() has been renamed to .intersectsSphere().");return this.intersectsSphere(a)}});Object.assign(ta.prototype,{area:function(){console.warn("THREE.Triangle: .area() has been renamed to .getArea().");return this.getArea()},barycoordFromPoint:function(a,b){console.warn("THREE.Triangle: .barycoordFromPoint() has been renamed to .getBarycoord().");return this.getBarycoord(a,b)},midpoint:function(a){console.warn("THREE.Triangle: .midpoint() has been renamed to .getMidpoint().");
return this.getMidpoint(a)},normal:function(a){console.warn("THREE.Triangle: .normal() has been renamed to .getNormal().");return this.getNormal(a)},plane:function(a){console.warn("THREE.Triangle: .plane() has been renamed to .getPlane().");return this.getPlane(a)}});Object.assign(ta,{barycoordFromPoint:function(a,b,c,d,e){console.warn("THREE.Triangle: .barycoordFromPoint() has been renamed to .getBarycoord().");return ta.getBarycoord(a,b,c,d,e)},normal:function(a,b,c,d){console.warn("THREE.Triangle: .normal() has been renamed to .getNormal().");
return ta.getNormal(a,b,c,d)}});Object.assign(jb.prototype,{extractAllPoints:function(a){console.warn("THREE.Shape: .extractAllPoints() has been removed. Use .extractPoints() instead.");return this.extractPoints(a)},extrude:function(a){console.warn("THREE.Shape: .extrude() has been removed. Use ExtrudeGeometry() instead.");return new wb(this,a)},makeGeometry:function(a){console.warn("THREE.Shape: .makeGeometry() has been removed. Use ShapeGeometry() instead.");return new yb(this,a)}});Object.assign(B.prototype,
{fromAttribute:function(a,b,c){console.warn("THREE.Vector2: .fromAttribute() has been renamed to .fromBufferAttribute().");return this.fromBufferAttribute(a,b,c)},distanceToManhattan:function(a){console.warn("THREE.Vector2: .distanceToManhattan() has been renamed to .manhattanDistanceTo().");return this.manhattanDistanceTo(a)},lengthManhattan:function(){console.warn("THREE.Vector2: .lengthManhattan() has been renamed to .manhattanLength().");return this.manhattanLength()}});Object.assign(p.prototype,
{setEulerFromRotationMatrix:function(){console.error("THREE.Vector3: .setEulerFromRotationMatrix() has been removed. Use Euler.setFromRotationMatrix() instead.")},setEulerFromQuaternion:function(){console.error("THREE.Vector3: .setEulerFromQuaternion() has been removed. Use Euler.setFromQuaternion() instead.")},getPositionFromMatrix:function(a){console.warn("THREE.Vector3: .getPositionFromMatrix() has been renamed to .setFromMatrixPosition().");return this.setFromMatrixPosition(a)},getScaleFromMatrix:function(a){console.warn("THREE.Vector3: .getScaleFromMatrix() has been renamed to .setFromMatrixScale().");
return this.setFromMatrixScale(a)},getColumnFromMatrix:function(a,b){console.warn("THREE.Vector3: .getColumnFromMatrix() has been renamed to .setFromMatrixColumn().");return this.setFromMatrixColumn(b,a)},applyProjection:function(a){console.warn("THREE.Vector3: .applyProjection() has been removed. Use .applyMatrix4( m ) instead.");return this.applyMatrix4(a)},fromAttribute:function(a,b,c){console.warn("THREE.Vector3: .fromAttribute() has been renamed to .fromBufferAttribute().");return this.fromBufferAttribute(a,
b,c)},distanceToManhattan:function(a){console.warn("THREE.Vector3: .distanceToManhattan() has been renamed to .manhattanDistanceTo().");return this.manhattanDistanceTo(a)},lengthManhattan:function(){console.warn("THREE.Vector3: .lengthManhattan() has been renamed to .manhattanLength().");return this.manhattanLength()}});Object.assign(W.prototype,{fromAttribute:function(a,b,c){console.warn("THREE.Vector4: .fromAttribute() has been renamed to .fromBufferAttribute().");return this.fromBufferAttribute(a,
b,c)},lengthManhattan:function(){console.warn("THREE.Vector4: .lengthManhattan() has been renamed to .manhattanLength().");return this.manhattanLength()}});Object.assign(P.prototype,{computeTangents:function(){console.error("THREE.Geometry: .computeTangents() has been removed.")},computeLineDistances:function(){console.error("THREE.Geometry: .computeLineDistances() has been removed. Use THREE.Line.computeLineDistances() instead.")}});Object.assign(H.prototype,{getChildByName:function(a){console.warn("THREE.Object3D: .getChildByName() has been renamed to .getObjectByName().");
return this.getObjectByName(a)},renderDepth:function(){console.warn("THREE.Object3D: .renderDepth has been removed. Use .renderOrder, instead.")},translate:function(a,b){console.warn("THREE.Object3D: .translate() has been removed. Use .translateOnAxis( axis, distance ) instead.");return this.translateOnAxis(b,a)},getWorldRotation:function(){console.error("THREE.Object3D: .getWorldRotation() has been removed. Use THREE.Object3D.getWorldQuaternion( target ) instead.")}});Object.defineProperties(H.prototype,
{eulerOrder:{get:function(){console.warn("THREE.Object3D: .eulerOrder is now .rotation.order.");return this.rotation.order},set:function(a){console.warn("THREE.Object3D: .eulerOrder is now .rotation.order.");this.rotation.order=a}},useQuaternion:{get:function(){console.warn("THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.")},set:function(){console.warn("THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.")}}});
Object.defineProperties(Jc.prototype,{objects:{get:function(){console.warn("THREE.LOD: .objects has been renamed to .levels.");return this.levels}}});Object.defineProperty(Kc.prototype,"useVertexTexture",{get:function(){console.warn("THREE.Skeleton: useVertexTexture has been removed.")},set:function(){console.warn("THREE.Skeleton: useVertexTexture has been removed.")}});Object.defineProperty(E.prototype,"__arcLengthDivisions",{get:function(){console.warn("THREE.Curve: .__arcLengthDivisions is now .arcLengthDivisions.");
return this.arcLengthDivisions},set:function(a){console.warn("THREE.Curve: .__arcLengthDivisions is now .arcLengthDivisions.");this.arcLengthDivisions=a}});Z.prototype.setLens=function(a,b){console.warn("THREE.PerspectiveCamera.setLens is deprecated. Use .setFocalLength and .filmGauge for a photographic setup.");void 0!==b&&(this.filmGauge=b);this.setFocalLength(a)};Object.defineProperties(X.prototype,{onlyShadow:{set:function(){console.warn("THREE.Light: .onlyShadow has been removed.")}},shadowCameraFov:{set:function(a){console.warn("THREE.Light: .shadowCameraFov is now .shadow.camera.fov.");
this.shadow.camera.fov=a}},shadowCameraLeft:{set:function(a){console.warn("THREE.Light: .shadowCameraLeft is now .shadow.camera.left.");this.shadow.camera.left=a}},shadowCameraRight:{set:function(a){console.warn("THREE.Light: .shadowCameraRight is now .shadow.camera.right.");this.shadow.camera.right=a}},shadowCameraTop:{set:function(a){console.warn("THREE.Light: .shadowCameraTop is now .shadow.camera.top.");this.shadow.camera.top=a}},shadowCameraBottom:{set:function(a){console.warn("THREE.Light: .shadowCameraBottom is now .shadow.camera.bottom.");
this.shadow.camera.bottom=a}},shadowCameraNear:{set:function(a){console.warn("THREE.Light: .shadowCameraNear is now .shadow.camera.near.");this.shadow.camera.near=a}},shadowCameraFar:{set:function(a){console.warn("THREE.Light: .shadowCameraFar is now .shadow.camera.far.");this.shadow.camera.far=a}},shadowCameraVisible:{set:function(){console.warn("THREE.Light: .shadowCameraVisible has been removed. Use new THREE.CameraHelper( light.shadow.camera ) instead.")}},shadowBias:{set:function(a){console.warn("THREE.Light: .shadowBias is now .shadow.bias.");
this.shadow.bias=a}},shadowDarkness:{set:function(){console.warn("THREE.Light: .shadowDarkness has been removed.")}},shadowMapWidth:{set:function(a){console.warn("THREE.Light: .shadowMapWidth is now .shadow.mapSize.width.");this.shadow.mapSize.width=a}},shadowMapHeight:{set:function(a){console.warn("THREE.Light: .shadowMapHeight is now .shadow.mapSize.height.");this.shadow.mapSize.height=a}}});Object.defineProperties(L.prototype,{length:{get:function(){console.warn("THREE.BufferAttribute: .length has been deprecated. Use .count instead.");
return this.array.length}},copyIndicesArray:function(){console.error("THREE.BufferAttribute: .copyIndicesArray() has been removed.")}});Object.assign(D.prototype,{addIndex:function(a){console.warn("THREE.BufferGeometry: .addIndex() has been renamed to .setIndex().");this.setIndex(a)},addDrawCall:function(a,b,c){void 0!==c&&console.warn("THREE.BufferGeometry: .addDrawCall() no longer supports indexOffset.");console.warn("THREE.BufferGeometry: .addDrawCall() is now .addGroup().");this.addGroup(a,b)},
clearDrawCalls:function(){console.warn("THREE.BufferGeometry: .clearDrawCalls() is now .clearGroups().");this.clearGroups()},computeTangents:function(){console.warn("THREE.BufferGeometry: .computeTangents() has been removed.")},computeOffsets:function(){console.warn("THREE.BufferGeometry: .computeOffsets() has been removed.")}});Object.defineProperties(D.prototype,{drawcalls:{get:function(){console.error("THREE.BufferGeometry: .drawcalls has been renamed to .groups.");return this.groups}},offsets:{get:function(){console.warn("THREE.BufferGeometry: .offsets has been renamed to .groups.");
return this.groups}}});Object.assign(Ta.prototype,{getArrays:function(){console.error("THREE.ExtrudeBufferGeometry: .getArrays() has been removed.")},addShapeList:function(){console.error("THREE.ExtrudeBufferGeometry: .addShapeList() has been removed.")},addShape:function(){console.error("THREE.ExtrudeBufferGeometry: .addShape() has been removed.")}});Object.defineProperties(Qd.prototype,{dynamic:{set:function(){console.warn("THREE.Uniform: .dynamic has been removed. Use object.onBeforeRender() instead.")}},
onUpdate:{value:function(){console.warn("THREE.Uniform: .onUpdate() has been removed. Use object.onBeforeRender() instead.");return this}}});Object.defineProperties(I.prototype,{wrapAround:{get:function(){console.warn("THREE.Material: .wrapAround has been removed.")},set:function(){console.warn("THREE.Material: .wrapAround has been removed.")}},wrapRGB:{get:function(){console.warn("THREE.Material: .wrapRGB has been removed.");return new G}},shading:{get:function(){console.error("THREE."+this.type+
": .shading has been removed. Use the boolean .flatShading instead.")},set:function(a){console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead.");this.flatShading=1===a}}});Object.defineProperties(Ka.prototype,{metal:{get:function(){console.warn("THREE.MeshPhongMaterial: .metal has been removed. Use THREE.MeshStandardMaterial instead.");return!1},set:function(){console.warn("THREE.MeshPhongMaterial: .metal has been removed. Use THREE.MeshStandardMaterial instead")}}});
Object.defineProperties(Fa.prototype,{derivatives:{get:function(){console.warn("THREE.ShaderMaterial: .derivatives has been moved to .extensions.derivatives.");return this.extensions.derivatives},set:function(a){console.warn("THREE. ShaderMaterial: .derivatives has been moved to .extensions.derivatives.");this.extensions.derivatives=a}}});Object.assign(ae.prototype,{animate:function(a){console.warn("THREE.WebGLRenderer: .animate() is now .setAnimationLoop().");this.setAnimationLoop(a)},getCurrentRenderTarget:function(){console.warn("THREE.WebGLRenderer: .getCurrentRenderTarget() is now .getRenderTarget().");
return this.getRenderTarget()},getMaxAnisotropy:function(){console.warn("THREE.WebGLRenderer: .getMaxAnisotropy() is now .capabilities.getMaxAnisotropy().");return this.capabilities.getMaxAnisotropy()},getPrecision:function(){console.warn("THREE.WebGLRenderer: .getPrecision() is now .capabilities.precision.");return this.capabilities.precision},resetGLState:function(){console.warn("THREE.WebGLRenderer: .resetGLState() is now .state.reset().");return this.state.reset()},supportsFloatTextures:function(){console.warn("THREE.WebGLRenderer: .supportsFloatTextures() is now .extensions.get( 'OES_texture_float' ).");
return this.extensions.get("OES_texture_float")},supportsHalfFloatTextures:function(){console.warn("THREE.WebGLRenderer: .supportsHalfFloatTextures() is now .extensions.get( 'OES_texture_half_float' ).");return this.extensions.get("OES_texture_half_float")},supportsStandardDerivatives:function(){console.warn("THREE.WebGLRenderer: .supportsStandardDerivatives() is now .extensions.get( 'OES_standard_derivatives' ).");return this.extensions.get("OES_standard_derivatives")},supportsCompressedTextureS3TC:function(){console.warn("THREE.WebGLRenderer: .supportsCompressedTextureS3TC() is now .extensions.get( 'WEBGL_compressed_texture_s3tc' ).");
return this.extensions.get("WEBGL_compressed_texture_s3tc")},supportsCompressedTexturePVRTC:function(){console.warn("THREE.WebGLRenderer: .supportsCompressedTexturePVRTC() is now .extensions.get( 'WEBGL_compressed_texture_pvrtc' ).");return this.extensions.get("WEBGL_compressed_texture_pvrtc")},supportsBlendMinMax:function(){console.warn("THREE.WebGLRenderer: .supportsBlendMinMax() is now .extensions.get( 'EXT_blend_minmax' ).");return this.extensions.get("EXT_blend_minmax")},supportsVertexTextures:function(){console.warn("THREE.WebGLRenderer: .supportsVertexTextures() is now .capabilities.vertexTextures.");
return this.capabilities.vertexTextures},supportsInstancedArrays:function(){console.warn("THREE.WebGLRenderer: .supportsInstancedArrays() is now .extensions.get( 'ANGLE_instanced_arrays' ).");return this.extensions.get("ANGLE_instanced_arrays")},enableScissorTest:function(a){console.warn("THREE.WebGLRenderer: .enableScissorTest() is now .setScissorTest().");this.setScissorTest(a)},initMaterial:function(){console.warn("THREE.WebGLRenderer: .initMaterial() has been removed.")},addPrePlugin:function(){console.warn("THREE.WebGLRenderer: .addPrePlugin() has been removed.")},
addPostPlugin:function(){console.warn("THREE.WebGLRenderer: .addPostPlugin() has been removed.")},updateShadowMap:function(){console.warn("THREE.WebGLRenderer: .updateShadowMap() has been removed.")},setFaceCulling:function(){console.warn("THREE.WebGLRenderer: .setFaceCulling() has been removed.")}});Object.defineProperties(ae.prototype,{shadowMapEnabled:{get:function(){return this.shadowMap.enabled},set:function(a){console.warn("THREE.WebGLRenderer: .shadowMapEnabled is now .shadowMap.enabled.");
this.shadowMap.enabled=a}},shadowMapType:{get:function(){return this.shadowMap.type},set:function(a){console.warn("THREE.WebGLRenderer: .shadowMapType is now .shadowMap.type.");this.shadowMap.type=a}},shadowMapCullFace:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMapCullFace has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMapCullFace has been removed. Set Material.shadowSide instead.")}}});Object.defineProperties($e.prototype,
{cullFace:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.cullFace has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.cullFace has been removed. Set Material.shadowSide instead.")}},renderReverseSided:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderReverseSided has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderReverseSided has been removed. Set Material.shadowSide instead.")}},
renderSingleSided:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderSingleSided has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderSingleSided has been removed. Set Material.shadowSide instead.")}}});Object.defineProperties(kb.prototype,{wrapS:{get:function(){console.warn("THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS.");return this.texture.wrapS},set:function(a){console.warn("THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS.");
this.texture.wrapS=a}},wrapT:{get:function(){console.warn("THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT.");return this.texture.wrapT},set:function(a){console.warn("THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT.");this.texture.wrapT=a}},magFilter:{get:function(){console.warn("THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter.");return this.texture.magFilter},set:function(a){console.warn("THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter.");this.texture.magFilter=
a}},minFilter:{get:function(){console.warn("THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter.");return this.texture.minFilter},set:function(a){console.warn("THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter.");this.texture.minFilter=a}},anisotropy:{get:function(){console.warn("THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy.");return this.texture.anisotropy},set:function(a){console.warn("THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy.");this.texture.anisotropy=
a}},offset:{get:function(){console.warn("THREE.WebGLRenderTarget: .offset is now .texture.offset.");return this.texture.offset},set:function(a){console.warn("THREE.WebGLRenderTarget: .offset is now .texture.offset.");this.texture.offset=a}},repeat:{get:function(){console.warn("THREE.WebGLRenderTarget: .repeat is now .texture.repeat.");return this.texture.repeat},set:function(a){console.warn("THREE.WebGLRenderTarget: .repeat is now .texture.repeat.");this.texture.repeat=a}},format:{get:function(){console.warn("THREE.WebGLRenderTarget: .format is now .texture.format.");
return this.texture.format},set:function(a){console.warn("THREE.WebGLRenderTarget: .format is now .texture.format.");this.texture.format=a}},type:{get:function(){console.warn("THREE.WebGLRenderTarget: .type is now .texture.type.");return this.texture.type},set:function(a){console.warn("THREE.WebGLRenderTarget: .type is now .texture.type.");this.texture.type=a}},generateMipmaps:{get:function(){console.warn("THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps.");return this.texture.generateMipmaps},
set:function(a){console.warn("THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps.");this.texture.generateMipmaps=a}}});Object.defineProperties(bf.prototype,{standing:{set:function(){console.warn("THREE.WebVRManager: .standing has been removed.")}}});qc.prototype.load=function(a){console.warn("THREE.Audio: .load has been deprecated. Use THREE.AudioLoader instead.");var b=this;(new ne).load(a,function(a){b.setBuffer(a)});return this};re.prototype.getData=function(){console.warn("THREE.AudioAnalyser: .getData() is now .getFrequencyData().");
return this.getFrequencyData()};kd.prototype.updateCubeMap=function(a,b){console.warn("THREE.CubeCamera: .updateCubeMap() is now .update().");return this.update(a,b)};k.WebGLRenderTargetCube=Lb;k.WebGLRenderTarget=kb;k.WebGLRenderer=ae;k.ShaderLib=tb;k.UniformsLib=K;k.UniformsUtils=Ba;k.ShaderChunk=S;k.FogExp2=Vb;k.Fog=Wb;k.Scene=vd;k.Sprite=Ic;k.LOD=Jc;k.SkinnedMesh=xd;k.Skeleton=Kc;k.Bone=wd;k.Mesh=va;k.LineSegments=Y;k.LineLoop=yd;k.Line=wa;k.Points=Xb;k.Group=Ub;k.VideoTexture=be;k.DataTexture=
lb;k.CompressedTexture=Yb;k.CubeTexture=Za;k.CanvasTexture=Sb;k.DepthTexture=Lc;k.Texture=ea;k.CompressedTextureLoader=lf;k.DataTextureLoader=fe;k.CubeTextureLoader=ge;k.TextureLoader=Ad;k.ObjectLoader=nf;k.MaterialLoader=Pd;k.BufferGeometryLoader=ie;k.DefaultLoadingManager=ya;k.LoadingManager=ee;k.JSONLoader=je;k.ImageLoader=fd;k.ImageBitmapLoader=ke;k.FontLoader=of;k.FileLoader=La;k.Loader=pc;k.LoaderUtils=Fe;k.Cache=Kb;k.AudioLoader=ne;k.SpotLightShadow=Cd;k.SpotLight=Dd;k.PointLight=Ed;k.RectAreaLight=
Id;k.HemisphereLight=Bd;k.DirectionalLightShadow=Fd;k.DirectionalLight=Gd;k.AmbientLight=Hd;k.LightShadow=Hb;k.Light=X;k.StereoCamera=pf;k.PerspectiveCamera=Z;k.OrthographicCamera=Mb;k.CubeCamera=kd;k.ArrayCamera=Hc;k.Camera=Ra;k.AudioListener=oe;k.PositionalAudio=qe;k.AudioContext=pe;k.AudioAnalyser=re;k.Audio=qc;k.VectorKeyframeTrack=oc;k.StringKeyframeTrack=Jd;k.QuaternionKeyframeTrack=id;k.NumberKeyframeTrack=nc;k.ColorKeyframeTrack=Md;k.BooleanKeyframeTrack=Kd;k.PropertyMixer=se;k.PropertyBinding=
ra;k.KeyframeTrack=ja;k.AnimationUtils=na;k.AnimationObjectGroup=rf;k.AnimationMixer=te;k.AnimationClip=Ga;k.Uniform=Qd;k.InstancedBufferGeometry=ue;k.BufferGeometry=D;k.Geometry=P;k.InterleavedBufferAttribute=ve;k.InstancedInterleavedBuffer=we;k.InterleavedBuffer=rc;k.InstancedBufferAttribute=xe;k.Face3=Ya;k.Object3D=H;k.Raycaster=tf;k.Layers=Wd;k.EventDispatcher=za;k.Clock=vf;k.QuaternionLinearInterpolant=Ld;k.LinearInterpolant=jd;k.DiscreteInterpolant=Od;k.CubicInterpolant=Nd;k.Interpolant=Ea;
k.Triangle=ta;k.Math=J;k.Spherical=wf;k.Cylindrical=xf;k.Plane=Ia;k.Frustum=td;k.Sphere=Ha;k.Ray=sb;k.Matrix4=R;k.Matrix3=la;k.Box3=Xa;k.Box2=ze;k.Line3=Qb;k.Euler=mb;k.Vector4=W;k.Vector3=p;k.Vector2=B;k.Quaternion=ca;k.Color=G;k.ImmediateRenderObject=ld;k.VertexNormalsHelper=md;k.SpotLightHelper=sc;k.SkeletonHelper=tc;k.PointLightHelper=uc;k.RectAreaLightHelper=vc;k.HemisphereLightHelper=wc;k.GridHelper=nd;k.PolarGridHelper=Rd;k.FaceNormalsHelper=od;k.DirectionalLightHelper=xc;k.CameraHelper=pd;
k.BoxHelper=Ib;k.Box3Helper=qd;k.PlaneHelper=rd;k.ArrowHelper=Jb;k.AxesHelper=sd;k.Shape=jb;k.Path=Qa;k.ShapePath=le;k.Font=me;k.CurvePath=bb;k.Curve=E;k.ShapeUtils=$a;k.WebGLUtils=af;k.WireframeGeometry=Zb;k.ParametricGeometry=Mc;k.ParametricBufferGeometry=$b;k.TetrahedronGeometry=Oc;k.TetrahedronBufferGeometry=ac;k.OctahedronGeometry=Pc;k.OctahedronBufferGeometry=ub;k.IcosahedronGeometry=Qc;k.IcosahedronBufferGeometry=bc;k.DodecahedronGeometry=Rc;k.DodecahedronBufferGeometry=cc;k.PolyhedronGeometry=
Nc;k.PolyhedronBufferGeometry=xa;k.TubeGeometry=Sc;k.TubeBufferGeometry=dc;k.TorusKnotGeometry=Tc;k.TorusKnotBufferGeometry=ec;k.TorusGeometry=Uc;k.TorusBufferGeometry=fc;k.TextGeometry=Zc;k.TextBufferGeometry=gc;k.SphereGeometry=$c;k.SphereBufferGeometry=xb;k.RingGeometry=ad;k.RingBufferGeometry=hc;k.PlaneGeometry=Fc;k.PlaneBufferGeometry=rb;k.LatheGeometry=bd;k.LatheBufferGeometry=ic;k.ShapeGeometry=yb;k.ShapeBufferGeometry=zb;k.ExtrudeGeometry=wb;k.ExtrudeBufferGeometry=Ta;k.EdgesGeometry=jc;k.ConeGeometry=
cd;k.ConeBufferGeometry=dd;k.CylinderGeometry=Ab;k.CylinderBufferGeometry=ab;k.CircleGeometry=ed;k.CircleBufferGeometry=kc;k.BoxGeometry=Nb;k.BoxBufferGeometry=pb;k.ShadowMaterial=Bb;k.SpriteMaterial=ib;k.RawShaderMaterial=lc;k.ShaderMaterial=Fa;k.PointsMaterial=Ja;k.MeshPhysicalMaterial=Cb;k.MeshStandardMaterial=Ua;k.MeshPhongMaterial=Ka;k.MeshToonMaterial=Db;k.MeshNormalMaterial=Eb;k.MeshLambertMaterial=Fb;k.MeshDepthMaterial=fb;k.MeshDistanceMaterial=gb;k.MeshBasicMaterial=ua;k.LineDashedMaterial=
Gb;k.LineBasicMaterial=T;k.Material=I;k.Float64BufferAttribute=Dc;k.Float32BufferAttribute=z;k.Uint32BufferAttribute=ob;k.Int32BufferAttribute=Cc;k.Uint16BufferAttribute=nb;k.Int16BufferAttribute=Bc;k.Uint8ClampedBufferAttribute=Ac;k.Uint8BufferAttribute=zc;k.Int8BufferAttribute=yc;k.BufferAttribute=L;k.ArcCurve=mc;k.CatmullRomCurve3=pa;k.CubicBezierCurve=Ma;k.CubicBezierCurve3=Va;k.EllipseCurve=Da;k.LineCurve=ia;k.LineCurve3=Na;k.QuadraticBezierCurve=Oa;k.QuadraticBezierCurve3=Wa;k.SplineCurve=Pa;
k.REVISION="94";k.MOUSE={LEFT:0,MIDDLE:1,RIGHT:2};k.CullFaceNone=0;k.CullFaceBack=1;k.CullFaceFront=2;k.CullFaceFrontBack=3;k.FrontFaceDirectionCW=0;k.FrontFaceDirectionCCW=1;k.BasicShadowMap=0;k.PCFShadowMap=1;k.PCFSoftShadowMap=2;k.FrontSide=0;k.BackSide=1;k.DoubleSide=2;k.FlatShading=1;k.SmoothShading=2;k.NoColors=0;k.FaceColors=1;k.VertexColors=2;k.NoBlending=0;k.NormalBlending=1;k.AdditiveBlending=2;k.SubtractiveBlending=3;k.MultiplyBlending=4;k.CustomBlending=5;k.AddEquation=100;k.SubtractEquation=
101;k.ReverseSubtractEquation=102;k.MinEquation=103;k.MaxEquation=104;k.ZeroFactor=200;k.OneFactor=201;k.SrcColorFactor=202;k.OneMinusSrcColorFactor=203;k.SrcAlphaFactor=204;k.OneMinusSrcAlphaFactor=205;k.DstAlphaFactor=206;k.OneMinusDstAlphaFactor=207;k.DstColorFactor=208;k.OneMinusDstColorFactor=209;k.SrcAlphaSaturateFactor=210;k.NeverDepth=0;k.AlwaysDepth=1;k.LessDepth=2;k.LessEqualDepth=3;k.EqualDepth=4;k.GreaterEqualDepth=5;k.GreaterDepth=6;k.NotEqualDepth=7;k.MultiplyOperation=0;k.MixOperation=
1;k.AddOperation=2;k.NoToneMapping=0;k.LinearToneMapping=1;k.ReinhardToneMapping=2;k.Uncharted2ToneMapping=3;k.CineonToneMapping=4;k.UVMapping=300;k.CubeReflectionMapping=301;k.CubeRefractionMapping=302;k.EquirectangularReflectionMapping=303;k.EquirectangularRefractionMapping=304;k.SphericalReflectionMapping=305;k.CubeUVReflectionMapping=306;k.CubeUVRefractionMapping=307;k.RepeatWrapping=1E3;k.ClampToEdgeWrapping=1001;k.MirroredRepeatWrapping=1002;k.NearestFilter=1003;k.NearestMipMapNearestFilter=
1004;k.NearestMipMapLinearFilter=1005;k.LinearFilter=1006;k.LinearMipMapNearestFilter=1007;k.LinearMipMapLinearFilter=1008;k.UnsignedByteType=1009;k.ByteType=1010;k.ShortType=1011;k.UnsignedShortType=1012;k.IntType=1013;k.UnsignedIntType=1014;k.FloatType=1015;k.HalfFloatType=1016;k.UnsignedShort4444Type=1017;k.UnsignedShort5551Type=1018;k.UnsignedShort565Type=1019;k.UnsignedInt248Type=1020;k.AlphaFormat=1021;k.RGBFormat=1022;k.RGBAFormat=1023;k.LuminanceFormat=1024;k.LuminanceAlphaFormat=1025;k.RGBEFormat=
1023;k.DepthFormat=1026;k.DepthStencilFormat=1027;k.RGB_S3TC_DXT1_Format=33776;k.RGBA_S3TC_DXT1_Format=33777;k.RGBA_S3TC_DXT3_Format=33778;k.RGBA_S3TC_DXT5_Format=33779;k.RGB_PVRTC_4BPPV1_Format=35840;k.RGB_PVRTC_2BPPV1_Format=35841;k.RGBA_PVRTC_4BPPV1_Format=35842;k.RGBA_PVRTC_2BPPV1_Format=35843;k.RGB_ETC1_Format=36196;k.RGBA_ASTC_4x4_Format=37808;k.RGBA_ASTC_5x4_Format=37809;k.RGBA_ASTC_5x5_Format=37810;k.RGBA_ASTC_6x5_Format=37811;k.RGBA_ASTC_6x6_Format=37812;k.RGBA_ASTC_8x5_Format=37813;k.RGBA_ASTC_8x6_Format=
37814;k.RGBA_ASTC_8x8_Format=37815;k.RGBA_ASTC_10x5_Format=37816;k.RGBA_ASTC_10x6_Format=37817;k.RGBA_ASTC_10x8_Format=37818;k.RGBA_ASTC_10x10_Format=37819;k.RGBA_ASTC_12x10_Format=37820;k.RGBA_ASTC_12x12_Format=37821;k.LoopOnce=2200;k.LoopRepeat=2201;k.LoopPingPong=2202;k.InterpolateDiscrete=2300;k.InterpolateLinear=2301;k.InterpolateSmooth=2302;k.ZeroCurvatureEnding=2400;k.ZeroSlopeEnding=2401;k.WrapAroundEnding=2402;k.TrianglesDrawMode=0;k.TriangleStripDrawMode=1;k.TriangleFanDrawMode=2;k.LinearEncoding=
3E3;k.sRGBEncoding=3001;k.GammaEncoding=3007;k.RGBEEncoding=3002;k.LogLuvEncoding=3003;k.RGBM7Encoding=3004;k.RGBM16Encoding=3005;k.RGBDEncoding=3006;k.BasicDepthPacking=3200;k.RGBADepthPacking=3201;k.TangentSpaceNormalMap=0;k.ObjectSpaceNormalMap=1;k.CubeGeometry=Nb;k.Face4=function(a,b,c,d,e,f,g){console.warn("THREE.Face4 has been removed. A THREE.Face3 will be created instead.");return new Ya(a,b,c,e,f,g)};k.LineStrip=0;k.LinePieces=1;k.MeshFaceMaterial=function(a){console.warn("THREE.MeshFaceMaterial has been removed. Use an Array instead.");
return a};k.MultiMaterial=function(a){void 0===a&&(a=[]);console.warn("THREE.MultiMaterial has been removed. Use an Array instead.");a.isMultiMaterial=!0;a.materials=a;a.clone=function(){return a.slice()};return a};k.PointCloud=function(a,b){console.warn("THREE.PointCloud has been renamed to THREE.Points.");return new Xb(a,b)};k.Particle=function(a){console.warn("THREE.Particle has been renamed to THREE.Sprite.");return new Ic(a)};k.ParticleSystem=function(a,b){console.warn("THREE.ParticleSystem has been renamed to THREE.Points.");
return new Xb(a,b)};k.PointCloudMaterial=function(a){console.warn("THREE.PointCloudMaterial has been renamed to THREE.PointsMaterial.");return new Ja(a)};k.ParticleBasicMaterial=function(a){console.warn("THREE.ParticleBasicMaterial has been renamed to THREE.PointsMaterial.");return new Ja(a)};k.ParticleSystemMaterial=function(a){console.warn("THREE.ParticleSystemMaterial has been renamed to THREE.PointsMaterial.");return new Ja(a)};k.Vertex=function(a,b,c){console.warn("THREE.Vertex has been removed. Use THREE.Vector3 instead.");
return new p(a,b,c)};k.DynamicBufferAttribute=function(a,b){console.warn("THREE.DynamicBufferAttribute has been removed. Use new THREE.BufferAttribute().setDynamic( true ) instead.");return(new L(a,b)).setDynamic(!0)};k.Int8Attribute=function(a,b){console.warn("THREE.Int8Attribute has been removed. Use new THREE.Int8BufferAttribute() instead.");return new yc(a,b)};k.Uint8Attribute=function(a,b){console.warn("THREE.Uint8Attribute has been removed. Use new THREE.Uint8BufferAttribute() instead.");return new zc(a,
b)};k.Uint8ClampedAttribute=function(a,b){console.warn("THREE.Uint8ClampedAttribute has been removed. Use new THREE.Uint8ClampedBufferAttribute() instead.");return new Ac(a,b)};k.Int16Attribute=function(a,b){console.warn("THREE.Int16Attribute has been removed. Use new THREE.Int16BufferAttribute() instead.");return new Bc(a,b)};k.Uint16Attribute=function(a,b){console.warn("THREE.Uint16Attribute has been removed. Use new THREE.Uint16BufferAttribute() instead.");return new nb(a,b)};k.Int32Attribute=
function(a,b){console.warn("THREE.Int32Attribute has been removed. Use new THREE.Int32BufferAttribute() instead.");return new Cc(a,b)};k.Uint32Attribute=function(a,b){console.warn("THREE.Uint32Attribute has been removed. Use new THREE.Uint32BufferAttribute() instead.");return new ob(a,b)};k.Float32Attribute=function(a,b){console.warn("THREE.Float32Attribute has been removed. Use new THREE.Float32BufferAttribute() instead.");return new z(a,b)};k.Float64Attribute=function(a,b){console.warn("THREE.Float64Attribute has been removed. Use new THREE.Float64BufferAttribute() instead.");
return new Dc(a,b)};k.ClosedSplineCurve3=zf;k.SplineCurve3=Af;k.Spline=Be;k.AxisHelper=function(a){console.warn("THREE.AxisHelper has been renamed to THREE.AxesHelper.");return new sd(a)};k.BoundingBoxHelper=function(a,b){console.warn("THREE.BoundingBoxHelper has been deprecated. Creating a THREE.BoxHelper instead.");return new Ib(a,b)};k.EdgesHelper=function(a,b){console.warn("THREE.EdgesHelper has been removed. Use THREE.EdgesGeometry instead.");return new Y(new jc(a.geometry),new T({color:void 0!==
b?b:16777215}))};k.WireframeHelper=function(a,b){console.warn("THREE.WireframeHelper has been removed. Use THREE.WireframeGeometry instead.");return new Y(new Zb(a.geometry),new T({color:void 0!==b?b:16777215}))};k.XHRLoader=function(a){console.warn("THREE.XHRLoader has been renamed to THREE.FileLoader.");return new La(a)};k.BinaryTextureLoader=function(a){console.warn("THREE.BinaryTextureLoader has been renamed to THREE.DataTextureLoader.");return new fe(a)};k.GeometryUtils={merge:function(a,b,c){console.warn("THREE.GeometryUtils: .merge() has been moved to Geometry. Use geometry.merge( geometry2, matrix, materialIndexOffset ) instead.");
if(b.isMesh){b.matrixAutoUpdate&&b.updateMatrix();var d=b.matrix;b=b.geometry}a.merge(b,d,c)},center:function(a){console.warn("THREE.GeometryUtils: .center() has been moved to Geometry. Use geometry.center() instead.");return a.center()}};k.ImageUtils={crossOrigin:void 0,loadTexture:function(a,b,c,d){console.warn("THREE.ImageUtils.loadTexture has been deprecated. Use THREE.TextureLoader() instead.");var e=new Ad;e.setCrossOrigin(this.crossOrigin);a=e.load(a,c,void 0,d);b&&(a.mapping=b);return a},
loadTextureCube:function(a,b,c,d){console.warn("THREE.ImageUtils.loadTextureCube has been deprecated. Use THREE.CubeTextureLoader() instead.");var e=new ge;e.setCrossOrigin(this.crossOrigin);a=e.load(a,c,void 0,d);b&&(a.mapping=b);return a},loadCompressedTexture:function(){console.error("THREE.ImageUtils.loadCompressedTexture has been removed. Use THREE.DDSLoader instead.")},loadCompressedTextureCube:function(){console.error("THREE.ImageUtils.loadCompressedTextureCube has been removed. Use THREE.DDSLoader instead.")}};
k.Projector=function(){console.error("THREE.Projector has been moved to /examples/js/renderers/Projector.js.");this.projectVector=function(a,b){console.warn("THREE.Projector: .projectVector() is now vector.project().");a.project(b)};this.unprojectVector=function(a,b){console.warn("THREE.Projector: .unprojectVector() is now vector.unproject().");a.unproject(b)};this.pickingRay=function(){console.error("THREE.Projector: .pickingRay() is now raycaster.setFromCamera().")}};k.CanvasRenderer=function(){console.error("THREE.CanvasRenderer has been moved to /examples/js/renderers/CanvasRenderer.js");
this.domElement=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");this.clear=function(){};this.render=function(){};this.setClearColor=function(){};this.setSize=function(){}};k.SceneUtils={createMultiMaterialObject:function(){console.error("THREE.SceneUtils has been moved to /examples/js/utils/SceneUtils.js")},detach:function(){console.error("THREE.SceneUtils has been moved to /examples/js/utils/SceneUtils.js")},attach:function(){console.error("THREE.SceneUtils has been moved to /examples/js/utils/SceneUtils.js")}};
k.LensFlare=function(){console.error("THREE.LensFlare has been moved to /examples/js/objects/Lensflare.js")};Object.defineProperty(k,"__esModule",{value:!0})});
},{}],17:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],18:[function(require,module,exports){
// This module creates a THREE material from the options object provided into the Objects class.
// Users can do this in one of three ways:

// - provide a preset THREE.Material in the `material` parameter
// - specify a `material` string, `color`, and/or `opacity` as modifications of the default material
// - provide none of these parameters, to use the default material

var utils = require("../Utils/Utils.js");
var THREE = require("../three.js");

var defaults = {
	material: 'MeshBasicMaterial',
	color: 'black',
	opacity: 1
};


function material (options) {

	var output;

	if (options) {

		options = utils._validate(options, defaults);

		// check if user provided material object
		if (options.material && options.material.isMaterial) output = options.material;

		// check if user provided any material parameters. create new material object based on that.
		else if (options.material || options.color || options.opacity){
		    output = new THREE[options.material]({color: options.color, transparent: options.opacity<1});
		}

		// if neither, return default material
		else output = generateDefaultMaterial();

		output.opacity = options.opacity;

	}

	// if no options, return default
	else output = generateDefaultMaterial();

	function generateDefaultMaterial(){
		return new THREE[defaults.material]({color: defaults.color});
	}

	return output
}

module.exports = exports = material;

},{"../Utils/Utils.js":3,"../three.js":16}],19:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"../three.js":16,"./constants.js":17,"./validate.js":20,"dup":3}],20:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}]},{},[1]);
