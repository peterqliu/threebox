const THREE = require("../three64.js");    // Modified version to use 64-bit double precision floats for matrix math
const ThreeboxConstants = require("../constants.js");
const utils = require("../Utils/Utils.js");
const ValueGenerator = require("../Utils/ValueGenerator.js");
const OBJLoader = require("../Loaders/OBJLoader.js");

console.log(THREE);

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
    this.sourcePath = options.source;
    this.modelPathGen = ValueGenerator(options.model);
    this.rotationGen = ValueGenerator(options.rotation);
    this.scaleGen = ValueGenerator(options.scale);
    this.source = undefined;
    this.models = Object.create(null);
    this.features = Object.create(null);
    this.scaleWithMapProjection = options.scaleWithMapProjection;

    this.loaded = false;

    // Load source and models
    const sourceLoader = new THREE.FileLoader();

    sourceLoader.load(this.sourcePath, data => {

        this.source = JSON.parse(data);
        // TODO: Handle invalid GeoJSON

        var modelNames = [];

        // Determine how to load the models
        if(!this.modelPathGen)
            return console.error("Invalid model name definition provided to SymbolLayer3D");

        // Add features to a map
        this.source.features.forEach((f,i) => {
            const key = this.keyGen(f,i); // TODO: error handling
            if(this.features[key] !== undefined) console.warn("Features with duplicate key: " + key);
            this.features[key] = {
                geojson: f,
                model: this.modelPathGen(f,i)
            }

            modelNames.push(this.modelPathGen(f,i));
        });

        // Filter out only unique models
        modelNames.forEach(m => this.models[m] = { loaded: false });

        // And load models asynchronously
        var remaining = Object.keys(this.models).length;
        const modelComplete = (m) => {
            console.log("Model complete: " + m);
            if(this.models[m].loaded) this._addFeaturesToScene(m);
            if(--remaining === 0) {
                this.loaded = true;
            }
        }

        for (m in this.models) {
            var loader;
            const ext = m.substring(m.length-3).toLowerCase();
            if(ext === 'obj') loader = new OBJLoader();
            else {
                console.warn("Not loading model with extension: " + ext);
                modelComplete(m);
            }

            loader.load(m, obj => {
                console.log(obj);
                this.models[m].obj = obj;
                this.models[m].isMesh = obj.isMesh;
                this.models[m].loaded = true;

                modelComplete(m);

            }, () => (null), error => {
                console.error("Could not load SymbolLayer3D source file.");
                modelComplete(m);
            })

        }

    }, () => (null), error => {
        return console.error("Could not load SymbolLayer3D source file.")
    });
}

SymbolLayer3D.prototype = {
    updateSourceData: function(source, partial) {

    },
    _addFeaturesToScene: function(model) {
        for( feature in this.features) {
            var f = this.features[feature];
            if (f.model !== model) continue;
            console.log("Adding feature");
            console.log(f);

            //console.log(this.models[model]);
            const obj = this.models[model].obj.clone();
            console.log(obj);
            // geometry.computeFaceNormals();
            // geometry.computeVertexNormals();
            const position = f.geojson.geometry.coordinates;
            console.log(position);
            
            const scale = this.scaleGen(f.geojson);
            var rotation = this.rotationGen(f.geojson);
            console.log(rotation);
            obj.rotation.copy(rotation);

            console.log(obj.rotation);

            // Add the model to the threebox scenegraph at a specific geographic coordinate
            this.parent.addAtCoordinate(obj, position, {scaleToLatitude: this.scaleWithMapProjection, preScale: scale});
        }
    }

}

module.exports = exports = SymbolLayer3D;