const THREE = require("../three94.js");    // Modified version to use 64-bit double precision floats for matrix math
const ThreeboxConstants = require("../constants.js");
const utils = require("../Utils/Utils.js");
const ValueGenerator = require("../Utils/ValueGenerator.js");
const OBJLoader = require("../Loaders/OBJLoader.js");
const MTLLoader = require("../Loaders/MTLLoader.js");

function SymbolLayer3D(parent, options) {

    if(options === undefined) return console.error("Invalid options provided to SymbolLayer3D");
    // TODO: Better error handling here

    if(options.scale === undefined) options.scale = 1.0;
    if(options.rotation === undefined) options.rotation = 0;
    if(options.scaleWithMapProjection === undefined) options.scaleWithMapProjection = true;
    if(options.key === undefined || options.key === '' || (typeof options.key === 'object' && options.key.property === undefined && options.key.generator === undefined)) {
        options.key = { generator: (v,i) => i };
        console.warn("Using array index for SymbolLayer3D key property.");
    }

    this.parent = parent;

    this.id = options.id;
    this.keyGen = ValueGenerator(options.key);
    if (typeof options.source === "string")
        this.sourcePath = options.source;
    else
        this.source = options.source;

    this.modelDirectoryGen = ValueGenerator(options.modelDirectory);
    this.modelNameGen = ValueGenerator(options.modelName);
    this.rotationGen = ValueGenerator(options.rotation);
    this.scaleGen = ValueGenerator(options.scale);
    this.models = Object.create(null);
    this.features = Object.create(null);
    this.scaleWithMapProjection = options.scaleWithMapProjection;

    this.loaded = false;

    if(this.sourcePath) {
        // Load source and models
        const sourceLoader = new THREE.FileLoader();

        sourceLoader.load(this.sourcePath, data => {

            this.source = JSON.parse(data);
            // TODO: Handle invalid GeoJSON

            this._initialize();

        }, () => (null), error => {
            return console.error("Could not load SymbolLayer3D source file.")
        });
    }
    else {
        this._initialize();
    }
}

SymbolLayer3D.prototype = {

    updateSourceData: function(source, absolute) {

        var oldFeatures = {}

        if (!source.features) return console.error("updateSourceData expects a GeoJSON FeatureCollection with a 'features' property");
        
        source.features.forEach((feature, i) => {
            const key = this.keyGen(feature,i); // TODO: error handling
            if (key in this.features) {
                // Update
                this.features[key].geojson = feature;
                oldFeatures[key] = feature;
            }
            else {
                // Create
                const modelDirectory = this.modelDirectoryGen(feature,i);
                const modelName = this.modelNameGen(feature,i);

                // TODO: Handle loading of new models
                this.features[key] = {
                    geojson: feature,
                    model: modelDirectory + modelName
                }
            }
        });

        this._addOrUpdateFeatures(this.features)

        if(absolute) {
            // Check for any features that are not have not been updated and remove them from the scene
            for(key in this.features) {
                if(!key in oldFeatures) {
                    this.removeFeature(key);
                }
            }
        }

        this.source = source;

    },

    removeFeature: function(key) {
        this.parent.remove(this.features[key].rawObject);
        delete this.features[key];
    },

    _initialize: function() {
        var modelNames = [];

        // Determine how to load the models
        if(!this.modelNameGen)
            return console.error("Invalid model name definition provided to SymbolLayer3D");
        if(!this.modelDirectoryGen)
            return console.error("Invalid model directory definition provided to SymbolLayer3D");


        // Add features to a map
        this.source.features.forEach((f,i) => {
            const key = this.keyGen(f,i); // TODO: error handling
            if(this.features[key] !== undefined) console.warn("Features with duplicate key: " + key);

            const modelDirectory = this.modelDirectoryGen(f,i);
            const modelName = this.modelNameGen(f,i);
            this.features[key] = {
                geojson: f,
                model: modelDirectory + modelName
            }

            modelNames.push({directory: modelDirectory, name: modelName});
        });

        // Filter out only unique models
        modelNames.forEach(m => this.models[(m.directory + m.name)] = { directory: m.directory, name: m.name, loaded: false });

        
        // And load models asynchronously
        var remaining = Object.keys(this.models).length;
        console.log("Loading " + remaining + " models", this.models);
        const modelComplete = (m) => {
            console.log("Model complete!", m);
            //if(this.models[m].loaded) 
            if(--remaining === 0) {
                this.loaded = true;
                this._addOrUpdateFeatures(this.features);
            }
        }

        for (m in this.models) {
            // TODO: Support formats other than OBJ/MTL
            const objLoader = new OBJLoader();
            const materialLoader = new MTLLoader();

            var loadObject = ((modelName) => { return (materials) => {
                // Closure madness!
                if(materials) {
                    materials.preload();

                    for(material in (materials.materials)) {
                        materials.materials[material].shininess /= 50;  // Shininess exported by Blender is way too high
                    }
                    
                    objLoader.setMaterials( materials );
                }
                objLoader.setPath(this.models[modelName].directory);
                
                console.log("Loading model ", modelName);

                objLoader.load(this.models[modelName].name + ".obj", obj => {
                    this.models[modelName].obj = obj;
                    this.models[modelName].isMesh = obj.isMesh;
                    this.models[modelName].loaded = true;

                    modelComplete(modelName);
                }, () => (null), error => {
                    console.error("Could not load SymbolLayer3D model file.");    
                } );

            }})(m);

            materialLoader.setPath(this.models[m].directory);
            materialLoader.load(this.models[m].name + ".mtl", loadObject, () => (null), error => {
                console.warn("No material file found for SymbolLayer3D model " + m);
                loadObject();
            });
        }
    },
    _addOrUpdateFeatures: function(features) {
        for (key in features) {
            const f = features[key];
            const position = f.geojson.geometry.coordinates;
            const scale = this.scaleGen(f.geojson);

            const rotation = this.rotationGen(f.geojson);

            var obj;
            if (!f.rawObject) {
                // Need to create a scene graph object and add it to the scene
                if(f.model && this.models[f.model] && this.models[f.model].obj && this.models[f.model].loaded)
                    obj = this.models[f.model].obj.clone();
                else {
                    console.warn("Model not loaded: " + f.model);
                    obj = new THREE.Group();    // Temporary placeholder if the model doesn't exist and/or will be loaded later
                }

                f.rawObject = obj;

                this.parent.addAtCoordinate(obj, position, {scaleToLatitude: this.scaleWithMapProjection, preScale: scale});
                //this.features[key] = f;
            }
            else {
                obj = f.rawObject;
                this.parent.moveToCoordinate(obj, position, {scaleToLatitude: this.scaleWithMapProjection, preScale: scale});
            }

            obj.rotation.copy(rotation);
        }
    }
}

module.exports = exports = SymbolLayer3D;