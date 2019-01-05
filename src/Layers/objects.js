var utils = require("../Utils/Utils.js");
const ValueGenerator = require("../Utils/ValueGenerator.js");
const OBJLoader = require("../Loaders/OBJLoader.js");
const MTLLoader = require("../Loaders/MTLLoader.js");
const AnimationManager = require("../Animation/AnimationManager.js");


function Objects(map, world, animationManager){

	this.map = map;
	this.world = world;
	// this.animationManager = animationManager;
}





Objects.prototype = {

	self: this,

	sphere: function(obj){

		obj = this.objects._validate(obj, 'sphere');

		var geometry = new THREE.SphereGeometry( obj.radius, obj.segments, obj.segments );
		var material = new THREE[obj.material]( {color: obj.color} );
		var mesh = new THREE.Mesh( geometry, material );

        var group = this.objects._makeGroup(mesh);
        this.objects._addMethods(group);

        return group
	},

	line: function(obj){

		obj = this.objects._validate(obj, 'line');

		var meterProjectedCoords = utils.lnglatToMeters(obj.geometry);
		var coords = meterProjectedCoords.coordinates;

        var spline = coords.map(
        	function(pt){
        		var v3 = new THREE.Vector3(pt[0], pt[1], pt[2])
        		return v3
        	}
        );

		spline = new THREE.CatmullRomCurve3(spline);

        var geometry = spline.getPoints()
        geometry = new THREE.BufferGeometry().setFromPoints(geometry)


        // var materialType = 'Line'+ obj.material.surface + 'Material';
        var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
        var mesh = new THREE.Line( geometry, material );

        mesh.coordinates = meterProjectedCoords.anchor

        this.objects._addMethods(mesh);
        mesh.setCoords(mesh.coordinates, {scaleToLatitude:true});
        return mesh  
	},

	tube: function(obj){

		obj = this.objects._validate(obj, 'tube');

		var meterProjectedCoords = utils.lnglatToMeters(obj.geometry);

		var coords = meterProjectedCoords.coordinates;
       	
        var spline = coords.map(
        	function(pt){
        		var v3 = new THREE.Vector3(pt[0], pt[1], pt[2])
        		return v3
        	}
        );

        spline = new THREE.CatmullRomCurve3(spline);
        var pts = [], count = obj.segments;

        for ( var i = 0; i < count; i ++ ) {

            var l = obj.radius;
            var a = 2 * i / count * Math.PI;
            pts.push( new THREE.Vector2 ( Math.cos( a ) * l, Math.sin( a ) * l ) );

        }

        var shape = new THREE.Shape( pts );

        var extrudeSettings = {
            steps: coords.length * obj.extrusion.smoothen,
            bevelEnabled: false,
            extrudePath: spline
        };

        var geometry = new THREE.ExtrudeBufferGeometry( shape, extrudeSettings );
        var material = new THREE[obj.material](obj.material);

        var mesh = new THREE.Mesh( geometry, material );


        var group = this.objects._makeGroup(mesh);
        this.objects._addMethods(group);
        group.coordinates = meterProjectedCoords.anchor;

        group.setCoords(group.coordinates, {scaleToLatitude:true});

        return group
             
	},

	extrusion: function(options){

	},

	loadObj: function(options, cb){

	    if(options === undefined) return console.error("Invalid options provided to SymbolLayer3D");
	    // TODO: Better error handling here

	    if(options.scale === undefined) options.scale = 1.0;
	    if(options.rotation === undefined) options.rotation = 0;
	    if(options.scaleWithMapProjection === undefined) options.scaleWithMapProjection = true;
	    if(options.key === undefined || options.key === '' || (typeof options.key === 'object' && options.key.property === undefined && options.key.generator === undefined)) {
	        options.key = { generator: (v,i) => i };
	        console.warn("Using array index for SymbolLayer3D key property.");
	    }

	    this.id = options.id;
	    this.keyGen = ValueGenerator(options.key);
	    if (typeof options.source === "string") this.sourcePath = options.source;
	    else this.source = options.source;

	    this.loaded = false;

        

        const modelComplete = (m) => {
            console.log("Model complete!", m);

            if(--remaining === 0) this.loaded = true;
        }

        

        // TODO: Support formats other than OBJ/MTL
        const objLoader = new OBJLoader();
        const materialLoader = new MTLLoader();
        materialLoader.load(options.model.mtl, loadObject, () => (null), error => {
            console.warn("No material file found for SymbolLayer3D model " + m);
        });

        var root = this;

        function loadObject(materials) {

            if(materials) {
                materials.preload();
                objLoader.setMaterials( materials );
            }
            
            objLoader.load(options.model.obj, obj => {

            	obj.rotation.set(options.rotation.x + Math.PI/2, options.rotation.y, options.rotation.z)

		        var group = root.objects._makeGroup(obj);
		        root.objects._addMethods(group);

                cb(group);

            }, () => (null), error => {
                console.error("Could not load model file.");    
            } );

        };
	},

	Object3D: function(obj, options) {
		var group = this.objects._makeGroup(obj);
		obj = this.objects._addMethods(group);
		return obj
	},

	_addMethods: function(obj){

		var root = this;

		if (!obj.coordinates) obj.coordinates = [0,0,0];

	     // Bestow this mesh with animation superpowers and keeps track of its movements in the global animation queue
	    root.animationManager.enroll(obj); 
		
		obj.setCoords = function(lnglat, options){

	        /** Place the given object on the map, centered around the provided longitude and latitude
	            The object's internal coordinates are assumed to be in meter-offset format, meaning
	            1 unit represents 1 meter distance away from the provided coordinate.
	        */

	        if (obj.userData.anchor) {
	            console.warn('setCoords: Only objects with point geometries can be moved with this method. To set this in a new location, add a new object with the new line/polygon coordinates.')
	            // return;
	        }

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

	        obj.userData.preScale = options.preScale;

	        if(options.scaleToLatitude) {
	            // Scale the model so that its units are interpreted as meters at the given latitude
	            var pixelsPerMeter = utils.projectedUnitsPerMeter(lnglat[1]);
	            options.preScale.multiplyScalar(pixelsPerMeter);
	        }	

	        obj.coordinates = lnglat;

	        obj.scale.copy(options.preScale);
        	obj.set({position:lnglat})
	        

	        return obj;

		}

		obj.setRotation = function(xyz) {
			var radians = {
				x: utils.radify(xyz.x) || obj.parent.rotation.x,
				y: utils.radify(xyz.y) || obj.parent.rotation.y,
				z: utils.radify(xyz.z) || obj.parent.rotation.z
			}

			obj._setObject({rotation: radians})
		}

		obj.add = function(){

	        root.world.add(obj);

	        if (obj.userData.preScale) obj.scale.copy(obj.userData.preScale);

	        obj.set({position:obj.coordinates})

	        return obj;
		}

		obj.remove = function(){
			root.world.remove(obj);
			root.map.repaint = true;
		}

		return obj
	},

	_makeGroup: function(obj){
        var geoGroup = new THREE.Group();
        geoGroup.userData.isGeoGroup = true;

        var isArrayOfObjects = obj.length;

        if (isArrayOfObjects){
        	for (o of obj) geoGroup.add(o)
        }

    	else geoGroup.add(obj);

        utils._flipMaterialSides(obj);

        return geoGroup
	},

	animationManager: new AnimationManager(this.map),

	_validate: function(options, objType){
		var defaults = this._defaults[objType];
		var validatedOutput = {};

		for (key of Object.keys(defaults)){

			if (defaults[key] === null && !options[key]) {
				console.error(key + ' is required for all instances of threebox.'+objType+'()')
				return;
			}

			else validatedOutput[key] = options[key] || defaults[key]
		}

		return validatedOutput
	},

	_defaults: {

		line: {
			geometry: null,
			color: 'black'
		},

		sphere: {
			radius: 50,
			segments: 8,
			color: 'black',
			material: 'MeshLambertMaterial'
		},

		tube: {                
			geometry: null,
            radius: 20,
            segments:6,
            extrusion:{
                smoothen: 2
            },
			color: 'black',
			material: 'MeshLambertMaterial'
        },

        extrusion:{
        	footprint: null,
        	base: 0,
        	top: 100,
        	color:'black',
			material: 'MeshLambertMaterial'
        },

        loadObj:{
        	position: [0,0,0],
        	model: null,
        	rotation:{
        		x: 0,
        		y: 0,
        		z: 0
        	}
        }
	},

	geometries:{
		line: ['LineString'],
		tube: ['LineString'],
		sphere: ['Point'],
	}
}

module.exports = exports = Objects;