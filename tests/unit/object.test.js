function objectTest(instance){

    var mesh = new THREE.Mesh();
    var group 

    test('OBJECT _makeGroup from one object', function(t){
        group = instance.objects._makeGroup(mesh, {foo: true});

        t.equal(group.userData.foo, true);
        t.equal(group.type, 'Group');
        t.equal(group.children.length, 1);
        t.end();

    });

    test('OBJECT _makeGroup from multiple objects', function(t){
        var mesh2 = new THREE.Mesh();
        group = instance.objects._makeGroup([mesh, mesh2], {foo: false});

        t.equal(group.userData.foo, false);
        t.equal(group.type, 'Group');
        t.equal(group.children.length, 2);
        t.end();

    })

    test('OBJECT _addMethods static', function(t){

        group = instance.objects._makeGroup(mesh, {});
        var addedMethods = instance.objects._addMethods(group, true);
        
        t.equal(addedMethods.setCoords, undefined);
        t.equal(addedMethods.type, 'Group');
        t.end();

    })

    test('OBJECT _addMethods dynamic', function(t){

        group = instance.objects._makeGroup(mesh, {});
        var addedMethods = instance.objects._addMethods(group);
        
        t.equal(typeof addedMethods.setCoords, 'function');
        t.equal(typeof addedMethods.followPath, 'function');
        t.deepEqual(addedMethods.coordinates, [0,0,0]);
        t.equal(addedMethods.type, 'Group');
        t.end();

    })

    test('OBJECT _addMethods dynamic', function(t){

        group = instance.objects._makeGroup(mesh, {});
        var addedMethods = instance.objects._addMethods(group);
        
        t.equal(typeof addedMethods.setCoords, 'function');
        t.equal(typeof addedMethods.followPath, 'function');
        t.deepEqual(addedMethods.coordinates, [0,0,0]);
        t.equal(addedMethods.type, 'Group');
        t.end();

    })

    test('OBJECT setCoords updates both position and scale', function(t){

        group = instance.objects._makeGroup(mesh, {scaleToLatitude:true});
        var group = instance.objects._addMethods(group);
        var newPosition = [0,-20];
        var scaleFactor = instance.projectedUnitsPerMeter(newPosition[1]);

        group
            .setCoords(newPosition)
            .add();

        vector3Equals(t, group.position, instance.projectToWorld(newPosition));
        t.equal(group.scale.x, scaleFactor);
        t.deepEqual(group.coordinates, newPosition)
        t.end();

    })

    // test('OBJECT SPHERE default settings', function(t) {   

    //     var sphere = instance.sphere();
    //     var defaults = instance.objects._defaults;
    //     var object = sphere.children[0];

    //     t.equal(object.geometry.type, 'SphereGeometry');
    //     t.end();
    // });

    // test('OBJECT scaleToLatitude works', function(t) {   

    //     var sphere = instance.sphere({scaleToLatitude: true});
    //     console.log(sphere)
    //     // var object = sphere.children[0];

    //     // t.equal(object.geometry.type, 'SphereGeometry');
    //     t.end();
    // });
}

    
