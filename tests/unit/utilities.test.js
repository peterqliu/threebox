function utilitiesTest(instance){

    test('PROJECTION project / unproject', function(t) {
        
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

    test('PROJECTION project / unproject extended lat/lng range', function(t) {
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

        t.end();
    });


    test('PROJECTION with altitude', function(t) {
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

    test('PROJECTION projectedUnitsPerMeter', function(t) {

        var pupm1 = instance.projectedUnitsPerMeter(10);
        var pupm2 = instance.projectedUnitsPerMeter(-35);

        t.equals(pupm1, 0.000012973136002133537);
        t.equals(pupm2, 0.000015596670978062768);

        t.end();
    });


    // test('PROJECTION project / unproject invalid input', function(t) {
    //     // TODO: Check for null/undefined/NaN values
    //     t.end();
    // });


    test('NORMALIZEVERTICES', function(t){
        
        var input = [new THREE.Vector3(100, 101, 102), new THREE.Vector3(103, 104, 105)];
        var normalized = instance.utils.normalizeVertices(input);

        t.deepEqual(normalized.center, {x: 101.5, y: 102.5, z: 103.5});
        t.deepEqual(normalized.vertices, [{x: -1.5, y: -1.5, z: -1.5}, {x: 1.5, y: 1.5, z: 1.5}]);
        t.end();
    })

    var defaults = {
        foo: 'bar',
        biz: false
    }

    test('VALIDATOR empty input', function(t) {
        var output = instance.utils._validate({}, defaults);
        t.deepEqual(output, defaults);
        t.end();
    });

    test('VALIDATOR does not overwrite unknown props', function(t) {
        var output = instance.utils._validate({a:true}, defaults);
        t.deepEqual(output, {
            foo: 'bar',
            biz: false,
            a: true
        });
        t.end();
    });  

    test('VALIDATOR missing required params throw error', function(t) {
        var output = instance.utils._validate({}, {b: null});
        t.error(output, 'proper error');
        t.end();
    });     
}
