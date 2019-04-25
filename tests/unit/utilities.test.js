function utilitiesTest(instance){

    test('PROJECTION project / unproject', function(t) {
        
        var coord, projected, expected;
        
        coord = [0,0,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(0,0,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [30,30,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(-85333.33333333333, -89522.98305691125, 0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [30,-30,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(-85333.33333333333, -89522.9830569113, 0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [-30,30,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(-85333.33333333333, -89522.9830569113, 0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [-30,-30,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(-85333.33333333333, 89522.9830569113, 0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        t.end();
    });

    test('PROJECTION project / unproject extended lat/lng range', function(t) {
        var coord, projected, expected;
        
        coord = [180,0,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(-511999.99999999994,1.8093822187881337e-11,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [-180,0,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(511999.99999999994,1.8093822187881337e-11,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [0,90,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(0,-3042.073317352722,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));


        coord = [0, 85.051129,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(0, -512000.00726036413, 0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        coord = [0, -85.051129,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(0, -512000.00726036413, 0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));


        coord = [300,0,0];
        var projected = instance.projectToWorld(coord);
        var unprojected = instance.unprojectFromWorld(projected);
        var expected = new THREE.Vector3(-853333.3333333333,1.8093822187881337e-11,0);
        vector3Equals(t, projected, expected);
        vector3Equals(t, new THREE.Vector3(unprojected), new THREE.Vector3(expected));

        t.end();
    });


    test('PROJECTION with altitude', function(t) {
        var coord, projected, expected;
        
        coord = [0,0,10000];
        var projected = instance.projectToWorld(coord);
        var expected = new THREE.Vector3(0,0,255.52089831565812);
        vector3Equals(t, projected, expected);


        coord = [0,0,-10000];
        var projected = instance.projectToWorld(coord);
        var expected = new THREE.Vector3(0,0,-255.52089831565812);
        vector3Equals(t, projected, expected);

        t.end();
    });

    test('PROJECTION projectedUnitsPerMeter', function(t) {

        var pupm1 = instance.projectedUnitsPerMeter(10);
        var pupm2 = instance.projectedUnitsPerMeter(-35);

        t.equals(pupm1, 0.025946272004267072);
        t.equals(pupm2, 0.03119334195612554);

        t.end();
    });


    // test('PROJECTION project / unproject invalid input', function(t) {
    //     // TODO: Check for null/undefined/NaN values
    //     t.end();
    // });


    test('NORMALIZEVERTICES', function(t){
        
        var input = [
            new THREE.Vector3(100, 101, 102), 
            new THREE.Vector3(103, 104, 105)
        ];
        
        var normalized = instance.utils.normalizeVertices(input);

        t.deepEqual(
            normalized.position, 
            {
                x: 101.5, 
                y: 102.5, 
                z: 103.5
            }
        );

        t.deepEqual(
            normalized.vertices, 
            [
                {x: -1.5, y: -1.5, z: -1.5}, 
                {x: 1.5, y: 1.5, z: 1.5}
            ]
        );

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
