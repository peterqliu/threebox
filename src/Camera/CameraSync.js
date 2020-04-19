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
	.on('pitch', function() {
            _this.setupCamera();
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
