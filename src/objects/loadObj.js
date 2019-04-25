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