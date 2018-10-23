const skmeans = require("../main.js");
const data = require("./data/well-separated.js");

var method = process.argv[2] || null;
var res = skmeans(data,3,method);
console.error(res);
var out = data.map((d,i)=>{
	return {
		cluster: "CLUSTER_"+res.idxs[i],
		x:d[0],
		y:d[1]
	}
});

res.centroids.forEach((k,i)=>{
	out.push({
		cluster: "K_"+i,
		x:k[0],
		y:k[1]
	})
});

console.log(JSON.stringify(out,null,2));
