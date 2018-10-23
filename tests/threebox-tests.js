var test = require('tape');
Threebox = require("../src/Threebox.js");
THREE = require("../src/three94.js");

window.runTests = function (instance) {
    test('project / unproject', function(t) {
        var coord, projected, expected;
        
        coord = [0,0,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(0,0,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));


        coord = [30,30,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(-42.66666666666666,-44.76149152845563,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [30,-30,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(-42.66666666666666,44.76149152845563,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [-30,30,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(-42.66666666666666,-44.76149152845563,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [-30,-30,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(-42.66666666666666,44.76149152845563,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        t.end();
    });

    test('project / unproject extened lat/lng range', function(t) {
        var coord, projected, expected;
        
        coord = [180,0,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(-255.99999999999997,9.046911093940669e-15,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [-180,0,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(255.99999999999997,9.046911093940669e-15,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [0,90,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(0,-3042.073317352722,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));


        coord = [0, 85.051129,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(0,-256,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [0, -85.051129,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(0,256,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));


        coord = [300,0,0];
        projected = instance.projectToWorld(coord);
        unprojected = instance.unprojectFromWorld(projected);
        expected = new THREE.Vector3(-426.66666666666663,9.046911093940669e-15,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        // coord = [0,120];
        // projected = instance.projectToWorld(coord);
        // Should fail on invalid value
        // expected = new THREE.Vector3(0,0,0);
        // vector3Equals(t, projected, expected);

        t.end();
    });

    
    test('project with altitude', function(t) {
        var coord, projected, expected;
        
        coord = [0,0,10000];
        projected = instance.projectToWorld(coord);
        expected = new THREE.Vector3(0,0,0.12776044915782905);
        vector3Equals(t, projected, expected);


        coord = [0,0,-10000];
        projected = instance.projectToWorld(coord);
        expected = new THREE.Vector3(0,0,-0.12776044915782905);
        vector3Equals(t, projected, expected);

        t.end();
    });


    test('project / unproject invalid input', function(t) {
        // TODO: Check for null/undefined/NaN values
        t.end();
    });
}

function vector3Equals(t, input, expected, allowableError, epsilon) {
    // Check that two Vector3s are equal to each other, allowing for a certain percentage of error due to floating point math
    if (allowableError === undefined) allowableError = 0.0000001;
    if (epsilon === undefined) epsilon = 0.00000000000001;
    var dX, dY, dZ;
    dX = Math.abs(input.x - expected.x) / (expected.x === 0 ? 1 : expected.x);
    dY = Math.abs(input.y - expected.y) / (expected.y === 0 ? 1 : expected.y);
    dZ = Math.abs(input.z - expected.z) / (expected.z === 0 ? 1 : expected.z);
    
    if (dX < epsilon) dX = 0;
    if (dY < epsilon) dY = 0;
    if (dZ < epsilon) dZ = 0;

    if(dX > allowableError || dY > allowableError || dZ > allowableError) {
        t.fail("Vector3 Equivalence failed: (" +  input.x + ", " + input.y + ", " + input.z + ") expected: (" +  expected.x + ", " + expected.y + ", " + expected.z + ")");
        console.log(dY);
    }
    t.pass("ok Vector3 equivalence");
}


function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
};