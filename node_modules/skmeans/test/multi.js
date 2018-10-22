const skmeans = require("../main.js");

var data = [];
for(let i=0;i<2000;i++) {
	var r = Math.random();
	if(r>=0 && r<0.33) data.push([r,r*2]);
	else if(r>=0.33 && r<0.66) data.push([r+4,2*(r+4)]);
	else data.push([r+9,2*(r+9)]);
}

var res = skmeans(data,3,"kmrand");
console.log(res.it,res.centroids);

var res = skmeans(data,3,"kmpp");
console.log(res.it,res.centroids);
