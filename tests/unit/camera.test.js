function cameraTest(instance){

    var mesh = new THREE.Mesh();
    var group 

    test('OBJECT _makeGroup from one object', function(t){
        group = instance.objects._makeGroup(mesh, {foo: true});

        t.equal(group.userData.foo, true);
        t.equal(group.type, 'Group');
        t.equal(group.children.length, 1);
        t.end();

    });

}

    
