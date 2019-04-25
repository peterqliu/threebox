function materialTest(instance){

    var material;

    test('MATERIAL default type, color, opacity', function(t) {        
        material = instance.material();
        t.equal(material.type, 'MeshBasicMaterial');
        t.deepEqual(material.color, { r: 0, g: 0, b: 0 });
        t.equal(material.opacity, 1);
        t.end();
    });

    test('MATERIAL custom type', function(t) { 
        material = instance.material({material:'MeshPhysicalMaterial'});
        t.equal(material.opacity, 1);
        t.equal(material.type, 'MeshPhysicalMaterial');
        t.deepEqual(material.color, { r: 0, g: 0, b: 0 });
        t.end();
    });

    test('MATERIAL custom color', function(t) { 
        material = instance.material({color:'red'});
        t.equal(material.opacity, 1);
        t.equal(material.type, 'MeshBasicMaterial');
        t.deepEqual(material.color, { r: 1, g: 0, b: 0 });
        t.end();
    });

    test('MATERIAL custom opacity', function(t) { 
        material = instance.material({opacity:0.5});
        t.equal(material.opacity, 0.5);
        t.equal(material.type, 'MeshBasicMaterial');
        t.deepEqual(material.color, { r: 0, g: 0, b: 0 });
        t.end();
    });

    test('MATERIAL custom color, opacity, type', function(t) { 
        allCustom = instance.material({
            material: 'MeshBasicMaterial', 
            opacity: 0.5, 
            color: 'blue'
        });
        t.equal(allCustom.opacity, 0.5);
        t.equal(allCustom.type, 'MeshBasicMaterial');
        t.deepEqual(allCustom.color, { r: 0, g: 0, b: 1 });
        t.end();
    });

    test('MATERIAL when THREE.Material provided, other material params ignored except opacity', function(t) { 
        threeMaterial = instance.material({
            material: new THREE.MeshBasicMaterial({color: 'cyan'}), 
            opacity: 0.5, 
            color: 'blue'
        });

        t.equal(threeMaterial.opacity, 0.5);
        t.equal(threeMaterial.type, 'MeshBasicMaterial');
        t.deepEqual(threeMaterial.color, { r: 0, g: 1, b: 1 });
        t.end();
    });
}

    
