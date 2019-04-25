var utils = require("../utils/utils.js");
var material = require("../utils/material.js");
var Objects = require('./objects.js');

function Sphere(obj){

	obj = utils._validate(obj,  Objects.prototype._defaults.sphere);
	var geometry = new THREE.SphereBufferGeometry( obj.radius, obj.sides, obj.sides );
	var mat = material(obj)
	var output = new THREE.Mesh( geometry, mat );

	if (obj.units === 'meters') output = Objects.prototype._makeGroup(output, obj);
    Objects.prototype._addMethods(output);
    return output
}


module.exports = exports = Sphere;