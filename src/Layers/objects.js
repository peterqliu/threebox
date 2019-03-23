var utils = require("../Utils/Utils.js");
var material = require("../Helpers/material.js");

const OBJLoader = require("../Loaders/OBJLoader.js");
const MTLLoader = require("../Loaders/MTLLoader.js");
const AnimationManager = require("../Animation/AnimationManager.js");


function Objects(){
	// this.map = map;
	// this.world = world;
}

Objects.prototype = {

	self: this,

	sphere: function(obj){

		obj = utils._validate(obj, this._defaults.sphere);

		var unitRatio = {
			scene: 1,
			meters: utils.projectedUnitsPerMeter(obj.position[1])
		}
		var geometry = new THREE.SphereGeometry( obj.radius * unitRatio[obj.units], obj.segments, obj.segments );
		var mat = material(obj)

		var mesh = new THREE.Mesh( geometry, mat );
        var group = this._makeGroup(mesh, obj);
        this._addMethods(group);
        // this.setCoords(obj.position);
        return group
	},

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

        var options = options || {};
		// var group = this._makeGroup(line, options);
        // this._addMethods(group, false);
        line.position.copy(normalized.position)

  		return line  
	},

	boneTube: function(obj){
		var geometry = new THREE.CylinderBufferGeometry( 1, 1, 2, 32, 10 );
		// var material = new THREE.MeshStandardMaterial( {color: 'steelblue'} );
		// var cylinder = new THREE.Mesh( geometry, material );

		// return cylinder

		// create the skin indices and skin weights

		var position = geometry.attributes.position;

		var vertex = new THREE.Vector3();

		var skinIndices = [];
		var skinWeights = [];

		for ( var i = 0; i < position.count; i ++ ) {

			vertex.fromBufferAttribute( position, i );

			// compute skinIndex and skinWeight based on some configuration data

			var y = ( vertex.y + 2 );

			var skinIndex = Math.floor( y / 2 );
			var skinWeight = ( y % 2 ) / 2;

			skinIndices.push( skinIndex, skinIndex + 1, 0, 0 );
			skinWeights.push( 1 - skinWeight, skinWeight, 0, 0 );

		}

		geometry.addAttribute( 'skinIndex', new THREE.Uint16BufferAttribute( skinIndices, 4 ) );
		geometry.addAttribute( 'skinWeight', new THREE.Float32BufferAttribute( skinWeights, 4 ) );

		var bones = [];

		var shoulder = new THREE.Bone();
		var elbow = new THREE.Bone();
		var hand = new THREE.Bone();

		shoulder.add( elbow );
		elbow.add( hand );

		bones.push( shoulder );
		bones.push( elbow );
		bones.push( hand );

		shoulder.position.y = -5;
		elbow.position.y = 0;
		hand.position.y = 5;

		// create skinned mesh and skeleton

		var mesh = new THREE.SkinnedMesh( geometry, material );
		var skeleton = new THREE.Skeleton( bones );
		console.log(skeleton)

		// see example from THREE.Skeleton

		var rootBone = skeleton.bones[ 0 ];
		mesh.add( rootBone );

		// bind the skeleton to the mesh

		mesh.bind( skeleton );

		// move the bones and manipulate the model

		skeleton.bones[ 0 ].rotation.x = -0.1;
		skeleton.bones[ 1 ].rotation.x = 0.2;
		
		mesh.scale.set(10,10,10)

		console.log(mesh)
		return mesh
	},

	tube: function(obj){

		obj = utils._validate(obj, this._defaults.tube);
       	
        var straightProject = utils.lnglatsToWorld(obj.geometry);
		var normalized = utils.normalizeVertices(straightProject);

        var spline = new THREE.CatmullRomCurve3(normalized.vertices);

        var extrudeSettings = {
            steps: spline.points.length * obj.smoothen-1,
            bevelEnabled: false,
            extrudePath: spline
        };

        // define cross-section geometry

        var crossSection = [];
        var count = obj.segments;

        for ( var i = 0; i < count; i ++ ) {
            var l = obj.radius;
            var a = 2 * i / count * Math.PI;
            crossSection.push( new THREE.Vector2 ( Math.cos( a ) * l, Math.sin( a ) * l ) );
        }

        crossSection = new THREE.Shape( crossSection );

        // assemble geometry from spline and cross section

        var geometry = new THREE.ExtrudeBufferGeometry( crossSection, extrudeSettings );
		var mat = material(obj);

        var mesh = new THREE.Mesh( geometry, mat );

        var options = options || {};
        var group = this._makeGroup(mesh, options);
        this._addMethods(group, true);
        mesh.position.copy(normalized.position);
        geometry.dispose();

        return group
	},

	extrusion: function(options){

	},

	loadObj: function(options, cb){

	    if(options === undefined) return console.error("Invalid options provided to loadObj()");

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

            	var r = utils.types.rotation(options.model, [0, 0, 0]);
            	var s = utils.types.scale(options.model, [1, 1, 1]);

            	obj = obj.children[0];
            	obj.rotation.set(r[0] + Math.PI/2, r[1] + Math.PI, r[2]);
            	obj.scale.set(s[0], s[1], s[2]);

            	var projScaleGroup = new THREE.Group();
            	projScaleGroup.add(obj)
		        var userScaleGroup = root._makeGroup(projScaleGroup, options);
		        root._addMethods(userScaleGroup);

                cb(userScaleGroup);

            }, () => (null), error => {
                console.error("Could not load model file.");    
            } );

        };
	},

	Object3D: function(obj, options) {
		options = utils._validate(options, 'material');

		var group = this._makeGroup(obj, options);
		obj = this._addMethods(group);
		return obj
	},


	// // duplicates an Object3D with THREE's .clone() method, but also restores threebox helper methods
	// clone: function(obj) {
	// 	var dupe = new (this.constructor).copy(this); 
	// 	dupe.userData = obj.userData;
	// 	this._addMethods(dupe);
	// 	return dupe
	// },

	_addMethods: function(obj, static){

		var root = this;

		if (static) {

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

		        if (obj.userData.anchor) {
		            console.warn('setCoords: Only objects with point geometries can be moved with this method. To set this in a new location, add a new object with the new line/polygon coordinates.')
		            // return;
		        }

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
	        if (!static) obj.set({position:obj.coordinates});
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
			scaleToLatitude: false
		},

		sphere: {
			position: [0,0,0],
			radius: 1,
			segments: 20,
			units: 'scene'
		},

		tube: {                
			geometry: null,
            radius: 1,
            segments:6,
            smoothen: 2,
			scaleToLatitude: false
        },

        extrusion:{
        	footprint: null,
        	base: 0,
        	top: 100,
        	color:'black',
			material: 'MeshLambertMaterial',
			scaleToLatitude: false
        },

        loadObj:{
        	position: [0,0,0],
        	model: null,
			scaleToLatitude: false
        },

        Object3D: {
        	scaleToLatitude: false
        }
	},

	geometries:{
		line: ['LineString'],
		tube: ['LineString'],
		sphere: ['Point'],
	}
}

module.exports = exports = Objects;