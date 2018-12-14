var THREE = require("../three.js");
var ThreeboxConstants = require("../../src/constants.js");
var turf = require("@turf/turf");


var utils = {

    prettyPrintMatrix: function(uglymatrix){
        for (var s=0;s<4;s++){
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

    projectToWorld: function(coords){

        // Spherical mercator forward projection, re-scaling to WORLD_SIZE

        var projected = [
            -ThreeboxConstants.MERCATOR_A * coords[0] * ThreeboxConstants.DEG2RAD * ThreeboxConstants.PROJECTION_WORLD_SIZE,
            -ThreeboxConstants.MERCATOR_A * Math.log(Math.tan((Math.PI*0.25) + (0.5 * coords[1] * ThreeboxConstants.DEG2RAD))) * ThreeboxConstants.PROJECTION_WORLD_SIZE
        ];
     
        var pixelsPerMeter = this.projectedUnitsPerMeter(coords[1]);

        //z dimension

        var height = coords[2] || 0;
        projected.push( height * pixelsPerMeter );

        var result = new THREE.Vector3(projected[0], projected[1], projected[2]);

        return result;
    },

    projectedUnitsPerMeter: function(latitude) {
        return Math.abs(ThreeboxConstants.WORLD_SIZE * (1 / Math.cos(latitude*Math.PI/180))/ThreeboxConstants.EARTH_CIRCUMFERENCE);
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

    unprojectFromWorld: function (pixel) {

        var unprojected = [
            -pixel.x / (ThreeboxConstants.MERCATOR_A * ThreeboxConstants.DEG2RAD * ThreeboxConstants.PROJECTION_WORLD_SIZE),
            2*(Math.atan(Math.exp(pixel.y/(ThreeboxConstants.PROJECTION_WORLD_SIZE*(-ThreeboxConstants.MERCATOR_A))))-Math.PI/4)/ThreeboxConstants.DEG2RAD
        ];

        var pixelsPerMeter = this.projectedUnitsPerMeter(unprojected[1]);

        //z dimension
        var height = pixel.z || 0;
        unprojected.push( height / pixelsPerMeter );

        return unprojected;
    },

    _flipMaterialSides: function(obj) {

    },

    //convert a line/polygon to meter coordinates, normalized to the first coordinate
    lnglatToMeters: function(coords){

        var self = this;
        var ref = false;
        const data = turf.lineString(coords);

        turf.coordEach(data, function(a){
            var inputPoint = a;
            var output = reproject(inputPoint);

            a.length = 0;
            a.push(output[0], output[1], output[2])

        })

        function reproject(point){

            point[2] = typeof point[2] === 'number' ? point[2] : 0;
            var projectedPoint;

            if (!ref) {
                ref = [point[0], point[1], point[2]];
                projectedPoint = [0,0,0];
            }

            else {
                var reference = turf.point(ref);
                var pt = turf.point(point);
                var bearing = self.radify(turf.bearing(reference, pt)-180);
                var distance = turf.distance(reference, pt, {units:'meters'});
                var deltaX = Math.sin(bearing) * distance;
                var deltaY = Math.cos(bearing) * distance;
                var deltaZ = point[2] - ref[2];
                projectedPoint = [deltaX, deltaY, deltaZ]
            }

            return projectedPoint

        }

        return {coordinates: data.geometry.coordinates, anchor: ref}
    },

    //convert a line/polygon to Vector3's

    lnglatsToWorld: function(coords){
        vector3 = coords.map(
            function(pt){
                var p = utils.projectToWorld(pt)
                var v3 = new THREE.Vector3(p.x, p.y, p.z)
                return v3
            }
        );

        return vector3
    },
    pathDistance(spline){

        var totalDistance = 0;
        var points = spline.points

        for (p in points){
            if (points[p+1]) {
                var segmentDistance = points[p].distanceTo(points[p+1])
                totalDistance += segmentDistance
            }
        }

        return totalDistance
    },

    exposedMethods: ['projectToWorld', 'projectedUnitsPerMeter']
}

module.exports = exports = utils