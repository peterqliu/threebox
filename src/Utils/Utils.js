var THREE = require("../three94.js");    // Modified version to use 64-bit double precision floats for matrix math

function prettyPrintMatrix(uglymatrix){
    for (var s=0;s<4;s++){
        var quartet=[uglymatrix[s],
        uglymatrix[s+4],
        uglymatrix[s+8],
        uglymatrix[s+12]];
        console.log(quartet.map(function(num){return num.toFixed(4)}))
    }
}

function makePerspectiveMatrix(fovy, aspect, near, far) {
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
}

//gimme radians
function radify(deg){

    if (typeof deg === 'object'){
        return deg.map(function(degree){
            return Math.PI*2*degree/360
        })
    }

    else return Math.PI*2*deg/360
}

//gimme degrees
function degreeify(rad){
    return 360*rad/(Math.PI*2)
}

module.exports.prettyPrintMatrix = prettyPrintMatrix;
module.exports.makePerspectiveMatrix = makePerspectiveMatrix;
module.exports.radify = radify;
module.exports.degreeify = degreeify;