// modify the three.js library for floating-point precision


function threebox(map){

	var basePlaneDimension = this.basePlaneDimension = 512;

	var xmlHttp;

	var renderer, scene, camera;
	var geometry, material, mesh, loader;

	var aircraft;

	init();
	animate();

	map.on('move', function(){
		updateCamera();
	})

	function init() {

		renderer = new THREE.WebGLRenderer( { alpha: true, antialias:true} );
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.shadowMap.enabled = true;
		document.querySelector('.mapboxgl-canvas-container').appendChild( renderer.domElement );


		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera( 28, window.innerWidth / window.innerHeight, 0.000001, 5000000000);
		camera.matrixAutoUpdate = false;
		scene.add( new THREE.AmbientLight( 0x999999 ) );

		var lights = [];
		lights[ 0 ] = new THREE.PointLight( 0x999999, 1, 0 );
		lights[ 1 ] = new THREE.PointLight( 0x999999, 1, 0 );
		lights[ 2 ] = new THREE.PointLight( 0x999999, 1, 0 );

		lights[ 0 ].position.set( 0, 200, 0 );
		lights[ 1 ].position.set( 100, 200, 100 );
		lights[ 2 ].position.set( - 100, - 200, - 100 );

		//scene.add( lights[ 0 ] );
		scene.add( lights[ 1 ] );
		scene.add( lights[ 2 ] );
	}

	var world = new THREE.Group();
	world.position.x = world.position.y = this.basePlaneDimension/2
	world.matrixAutoUpdate = false;


	scene.add( world );
	updateCamera();


	this.world = world;
	this.scene = scene;
	this.camera = camera;

	// var geometry = new THREE.SphereBufferGeometry( 0.1, 32, 32 );
	// var material = new THREE.MeshPhongMaterial( {color: 0xabcdef, wireframe:false} );
	// var sphere = new THREE.Mesh( geometry, material );
	//  	sphere.scale.set(64,64,64);
	// //sphere.position.z=100

	// world.add( sphere );

	//var planeDimension = basePlaneDimension;
	// var geometry = new THREE.PlaneGeometry( planeDimension, planeDimension);
	// var material = new THREE.MeshBasicMaterial( {color: 0xffff00, wireframe:true} );
	// var plane = new THREE.Mesh( geometry, material );
	//world.add( plane );

	window.addEventListener( 'resize', onWindowResize, false );

	function onWindowResize() {
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	    renderer.setSize( window.innerWidth, window.innerHeight );
	}



	function prettyPrint(uglymatrix){
		for (var s=0;s<4;s++){
			var quartet=[uglymatrix[s],
			uglymatrix[s+4],
			uglymatrix[s+8],
			uglymatrix[s+12]];
			console.log(quartet.map(function(num){return num.toFixed(4)}))
		}
		console.log('done')
	}

	function makePerspectiveMatrix(fovy, aspect, near, far) {
		var out = new THREE.Matrix4();
		var f = 1.0 / Math.tan(fovy / 2),
	    nf = 1 / (near - far);
		out.elements[0] = f / aspect;
		out.elements[1] = 0;
		out.elements[2] = 0;
		out.elements[3] = 0;
		out.elements[4] = 0;
		out.elements[5] = f;
		out.elements[6] = 0;
		out.elements[7] = 0;
		out.elements[8] = 0;
		out.elements[9] = 0;
		out.elements[10] = (far + near) * nf;
		out.elements[11] = -1;
		out.elements[12] = 0;
		out.elements[13] = 0;
		out.elements[14] = (2 * far * near) * nf;
		out.elements[15] = 0;
		return out;
	}

	function updateCamera(){

	    if(!camera) {
	    	console.log('nocamera')
	    	return;
	    }

	    const fov = 0.6435011087932844;
	    var cameraToCenterDistance = 0.5 / Math.tan(fov / 2) * map.transform.height;
	    const halfFov = fov / 2;
	    const groundAngle = Math.PI / 2 + map.transform._pitch;
	    const topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);

	    // Calculate z distance of the farthest fragment that should be rendered.
	    const furthestDistance = Math.cos(Math.PI / 2 - map.transform._pitch) * topHalfSurfaceDistance + cameraToCenterDistance;

	    // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
	    const farZ = furthestDistance * 1.01;

	    var cameraProjectionMatrix = new THREE.Matrix4;
	    camera.projectionMatrix = makePerspectiveMatrix(fov, map.transform.width / map.transform.height, 1, farZ);
	    camera.projectionMatrix;

	    var cameraModelMatrix = new THREE.Matrix4();
	    var cameraFlipY = new THREE.Matrix4().makeScale(1,-1,1);
	    var cameraTranslateZ = new THREE.Matrix4().makeTranslation(0,0,-cameraToCenterDistance);
	    var cameraRotateX = new THREE.Matrix4().makeRotationX(map.transform._pitch);
	    var cameraRotateZ = new THREE.Matrix4().makeRotationZ(map.transform.angle);

	    camera
	    	.projectionMatrix
	    	.multiply(cameraFlipY)
	    	.multiply(cameraTranslateZ)
	    	.multiply(cameraRotateX)
	    	.multiply(cameraRotateZ);


		if(world) {

			zoomPow =  map.transform.scale; 
			// Handle scaling and translation of objects in the map in the world's matrix transform, not the camera
			var scale = new THREE.Matrix4;
			var translateCenter = new THREE.Matrix4;
			var translateMap = new THREE.Matrix4;
			scale.makeScale(zoomPow, zoomPow , zoomPow );
			translateCenter.makeTranslation(basePlaneDimension/2, basePlaneDimension / 2, 0);
			translateMap.makeTranslation(-map.transform.x, -map.transform.y, 0);
			world.matrix = new THREE.Matrix4;
			world.matrix
				.premultiply(translateCenter)
				.premultiply(scale)
				.premultiply(translateMap);
	    }

	    //prettyPrint(camera.projectionMatrix)
	}

	var previousFrame;

	function animateObjects(){

		requestAnimationFrame(animateObjects)
		var now = Date.now();

		var dimensions = ['X','Y','Z'];

		//iterate through objects in queue. count in reverse so we can cull objects without frame shifting
		for (var a = utilities.objectsToAnimate.length-1; a>=0; a--){
			
			var object = utilities.objectsToAnimate[a];

			//focus on first item in queue
			var item = object.animationQueue[0];

			if (!item ){

				// if this was the last animation for the object, cull the whole object from the master animation queue
				utilities.objectsToAnimate.splice(a,1)
				return;
			}

			var options = item.parameters;

			// cull expired animations
			if (options.expiration<now) {
				console.log('culled')

				object.animationQueue.splice(0,1);

				// set the start time of the next animation
				object.animationQueue[0].parameters.start = Date.now();

				return
			}


			var sinceLastTick = (now-previousFrame)/1000;

			if (item.type === 'set'){

				var timeProgress = (Date.now()-options.start);
				var newPosition, newRotation;

				if (options.positionPerMs) {
					newPosition = options.startPosition.map(function(px, index){
						return px+options.positionPerMs[index]*timeProgress
					})
				}
				if (options.rotationPerMs) {
					newRotation = options.startRotation.map(function(rad, index){
						return rad+options.rotationPerMs[index]*timeProgress
					})
				}

				object._setObject({position: newPosition, rotation:newRotation});

			}

			// handle continuous animations
			if (item.type === 'continuous'){

				if (options.position){

					object.translateX(options.position[0]/sinceLastTick);
					object.translateY(options.position[1]/sinceLastTick);
					object.translateZ(options.position[2]/sinceLastTick);

				}

				if (options.rotation){

					object.rotateX(options.rotation[0]/sinceLastTick);
					object.rotateY(options.rotation[1]/sinceLastTick);
					object.rotateZ(options.rotation[2]/sinceLastTick);

				}
			}

			if (item.type === 'followPath'){

				var timeProgress = (Date.now()-options.start) / 1000;
				var lineGeojson = options.geometry;
				var acceleration = options.acceleration;
				var turnSpeed = options.turnSpeed;

				//var fractionalProgress = Math.pow(1*Math.round(1*(timeProgress)) / totalDuration, easing);

				// default to duration for time
				var distanceProgress = options.speed*timeProgress+ 0.5 * acceleration * Math.pow(timeProgress,2);//totalDistance*fractionalProgress
				var currentLngLat = turf.along(lineGeojson, distanceProgress, 'meters').geometry.coordinates;
				var nextPosition = utilities.project(currentLngLat);


				var toTurn;

				// if we need to track heading
				if (options.trackHeading){
					//opposite/adjacent
					var angle = (Math.atan2((nextPosition[1]-object.position.y),(nextPosition[0]-object.position.x))+0.5*Math.PI).toFixed(4);
					var angleDelta = angle-object.rotation.z;

					// if object needs to turn, turn it by up to the allowed turnSpeed
					if (angleDelta !== 0) {
						var xTurn = 0;
						var yTurn = 0;
						var zTurn = Math.sign(angleDelta) * Math.min(Math.abs(angleDelta), turnSpeed) * sinceLastTick;
						toTurn = [xTurn, yTurn, object.rotation.z+zTurn];
					}

				}

				else {
					if (options.rotation){
						console.log('rotation present!')
					}
				}

				object._setObject({position: currentLngLat, rotation:toTurn});

				//if finished, flag this for removal next time around
				if (distanceProgress >= options.distance) options.expiration = Date.now();

			}

			if (item.type === 'circle'){

				var timeProgress = (Date.now()-options.start) / 1000;
				var period = options.period;
				var radius = options.radius;
				var center = options.center;

				var angle = utilities.radify((360 * timeProgress / period) );
				var destination = turf.destination(center, radius/1000, angle, 'kilometers');
				var coords = destination.geometry.coordinates;
				coords[2] = 500;
				object._setObject({position:coords, rotation:[0,0,angle/100]})
			}

		}

		previousFrame = now;

	}

	animateObjects();

	function animate() {
		requestAnimationFrame( animate );
		renderer.render( scene, camera );
		updateCamera()
	}
}

var utilities = {

	//lnglat-meters to pixels
	project: function(coords){
		var basePlaneDimension = 512;
		// coord setup
		var merc = new sm({
			size: basePlaneDimension
		});

		var rawPx = merc.px(coords,0);

		var pxCoords = [rawPx[0] - basePlaneDimension/2, rawPx[1] - basePlaneDimension/2];
		
		//z dimension
		var height = coords[2] || 0;
		var pixelsPerMeter = Math.abs(basePlaneDimension * Math.cos(coords[1]*Math.PI/180)/40075000 );
		pxCoords.push( height * pixelsPerMeter )

		return pxCoords

	},

	//gimme radians
	radify: function(deg){

		if (typeof deg === 'object'){
			return deg.map(function(degree){
				return Math.PI*2*degree/360
			})
		}

		else return Math.PI*2*deg/360
	},

	//gimme degrees
	degreeify: function(rad){
		return 360*rad/(Math.PI*2)
	},

	objectsToAnimate : []
}

threebox.prototype.addObject = function (lnglat, obj){

	var position = utilities.project(lnglat);
	obj.position.x = position[0];
	obj.position.y = position[1];
	obj.position.z = position[2];

	obj.animationQueue = [];
	obj.coordinates = lnglat;


	obj.set = function(state, options){

		//if duration is set, animate to the new state
		if ( options && options.duration > 0 ){
			var entry = {
				type:'set',
				parameters: {
					start: Date.now(),
					expiration: Date.now()+options.duration,
					duration: options.duration
				}
			}

			if (state.rotation) {
				var c = obj.rotation
				entry.parameters.startRotation = [c.x, c.y, c.z];
				entry.parameters.rotationPerMs = [c.x, c.y, c.z].map(function(radian, index){
					return (utilities.radify(state.rotation[index])-radian)/(options.duration);
				})
			}
			if (state.position) {
				entry.parameters.startPosition = obj.coordinates;
				entry.parameters.positionPerMs = obj.coordinates.map(function(px, index){
					return (state.position[index]-px)/(options.duration);
				});
			}

			if (this.animationQueue.length===0) utilities.objectsToAnimate.push(this);

			this.animationQueue
				.push(entry);	
		}


		//if no duration set, stop existing animations and go to that state immediately
		else {

			this.stop();
			state.rotation = utilities.radify(state.rotation);
			this._setObject(state);

		}

		return this

	};

	obj.stop = function(){
		this.animationQueue = [];
		return this;
	}

	obj.setSpeed = function(options){

		var now = Date.now();
		if (options.duration) options.expiration = now + options.duration;
		var animationEntry = {object:this, type: 'continuous', parameters:options};

		if (this.animationQueue.length === 0) utilities.objectsToAnimate.push(this);
		this.animationQueue.push({type: 'continuous', parameters:options});

		return this

	};

	obj.followPath = function (coordinates, options){

		//var easing = options.easing || 1;

		//var totalDuration = (totalDistance / lineGeojson.properties.speed) * 1000;

		var lineGeojson = turf.lineString(coordinates);
		var entry = {
			type: 'followPath', 
			parameters:{
				start: Date.now(), 
				distance: turf.lineDistance(lineGeojson, 'meters'), 
				geometry:lineGeojson,
				speed: options.speed || 10,
				acceleration:  options.acceleration || 0,
				trackHeading: true,
				turnSpeed: utilities.radify(options.turnSpeed) || utilities.radify(3600)
			}
		};

		if (this.animationQueue.length===0) utilities.objectsToAnimate.push(this);

		this.animationQueue
			.push(entry);

		return this;

	};

	obj.circlePoint = function(options){

		// radius, duration, start angle
		options.start = Date.now();

		var entry = {
			type: 'circle',
			parameters: options
		}

		if (this.animationQueue.length === 0) utilities.objectsToAnimate.push(this);

		this.animationQueue
			.push(entry);

		return this;
	}

	obj._setObject = function (options){

		var p = options.position;
		var r = options.rotation;

		if (p) {
			this.coordinates = p;
			var c = utilities.project(p);

			this.position.set(c[0],c[1], c[2])

		}

		if (r) {

			this.rotation.set(r[0],r[1],r[2])

		}
	};

	//add object to scene
	this.world.add( obj );

	return obj;
}

threebox.prototype.removeObject = function(obj){
	this.world.remove(obj);
};
