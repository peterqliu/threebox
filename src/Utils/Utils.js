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