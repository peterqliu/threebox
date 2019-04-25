function validateTest(instance){

    var v = instance.utils.Validator;

    // Coords validation

    test('VALIDATE invalid Coords', function(t){

        t.error(v.Coords(true), 'error');
        t.error(v.Coords(['a']), 'error');
        t.error(v.Coords([1]), 'error');
        t.error(v.Coords([3, false]), 'error');

        t.end();

    });

    test('VALIDATE valid Coords', function(t){

        t.deepEqual(v.Coords([22,33]), [22,33]);
        t.deepEqual(v.Coords([22,33,-10]), [22,33, -10]);
        t.end();

    });

    // Line validation

    test('VALIDATE invalid Line', function(t){

        t.error(v.Line([[1,2], [false, 4]]), 'error');
        t.end();

    });

    test('VALIDATE valid Line', function(t){

        t.deepEqual(v.Line([[-100, 20], [22,33]]), [[-100, 20], [22,33]]);
        t.end();

    });

    // Rotation validation
    
    test('VALIDATE invalid Rotation', function(t){

        t.error(v.Rotation('rotate'), 'error');
        t.end();

    });

    test('VALIDATE valid Rotation', function(t){

        t.deepEqual(v.Rotation(40), {z:40});
        t.deepEqual(v.Rotation({x:20, y:10, z:90}), {x:20, y:10, z:90});

        t.end();

    });

    // Scale validation
    
    test('VALIDATE invalid Scale', function(t){

        t.error(v.Scale('scale'), 'error');
        t.end();

    });

    test('VALIDATE valid Scale', function(t){

        t.deepEqual(v.Scale(22), {x:22, y:22, z:22});
        t.deepEqual(v.Scale({x:20, y:10, z:90}), {x:20, y:10, z:90});

        t.end();

    });
}

    
