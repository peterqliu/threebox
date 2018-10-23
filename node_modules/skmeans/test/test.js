const skmeans = require("../main.js");

function testUni() {
	var data = [];
	for(let i=0;i<1000;i++) {
		var r = Math.random();
		if(r>=0 && r<0.33) data.push(r);
		else if(r>=0.33 && r<0.66) data.push(r+4);
		else data.push(r+9);
	}

	var its = 10000;

	var ti = Date.now();
	for(var i=0;i<its;i++) {
		var res = skmeans(data,3);
	}
	var tf = Date.now();
	console.log("Unidimensional",1000*its/(tf-ti) + " ops/sec");
}

function testMulti() {
	var data = [];
	for(let i=0;i<1000;i++) {
		var r = Math.random();
		if(r>=0 && r<0.33) data.push([r,r*2]);
		else if(r>=0.33 && r<0.66) data.push([r+4,2*(r+4)]);
		else data.push([r+9,2*(r+9)]);
	}

	var its = 10000;

	var ti = Date.now();
	for(var i=0;i<its;i++) {
		var res = skmeans(data,3);
	}
	var tf = Date.now();
	console.log("Multidimensional",1000*its/(tf-ti) + " ops/sec");
}

testUni();
testMulti();
