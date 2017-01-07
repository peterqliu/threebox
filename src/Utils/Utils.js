var THREE = require("../three64.js");    // Modified version to use 64-bit double precision floats for matrix math

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
    out.elements[0] = f / aspect;
    out.elements[1] = 0;
    out.elements[2] = 0;
    out.elements[3] = 0;
    out.elements[4] = 0;
    out.elements[5] = f;
    out.elements[6] = 0;
    out.elements[7] = 0;
    out.elements[8] = 0;
    out.elements[9] = 0;
    out.elements[10] = (far + near) * nf;
    out.elements[11] = -1;
    out.elements[12] = 0;
    out.elements[13] = 0;
    out.elements[14] = (2 * far * near) * nf;
    out.elements[15] = 0;
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