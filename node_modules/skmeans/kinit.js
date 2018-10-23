const
	Distance = require("./distance.js"),
	eudist = Distance.eudist,
	dist = Distance.dist;

module.exports = {
	kmrand(data,k) {
		var map = {}, ks = [], t = k<<2;
		var len = data.length;
		var multi = data[0].length>0;

		while(ks.length<k && (t--)>0) {
			let d = data[Math.floor(Math.random()*len)];
			let key = multi? d.join("_") : `${d}`;
			if(!map[key]) {
				map[key] = true;
				ks.push(d);
			}
		}

		if(ks.length<k) throw new Error("Error initializating clusters");
		else return ks;
	},

	/**
	 * K-means++ initial centroid selection
	 */
	kmpp(data,k) {
		var distance = data[0].length? eudist : dist;
		var ks = [], len = data.length;
		var multi = data[0].length>0;
		var map = {};

		// First random centroid
		var c = data[Math.floor(Math.random()*len)];
		var key = multi? c.join("_") : `${c}`;
		ks.push(c);
		map[key] = true;

		// Retrieve next centroids
		while(ks.length<k) {
			// Min Distances between current centroids and data points
			let dists = [], lk = ks.length;
			let dsum = 0, prs = [];

			for(let i=0;i<len;i++) {
				let min = Infinity;
				for(let j=0;j<lk;j++) {
					let dist = distance(data[i],ks[j]);
					if(dist<=min) min = dist;
				}
				dists[i] = min;
			}

			// Sum all min distances
			for(let i=0;i<len;i++) {
				dsum += dists[i]
			}

			// Probabilities and cummulative prob (cumsum)
			for(let i=0;i<len;i++) {
				prs[i] = {i:i, v:data[i],	pr:dists[i]/dsum, cs:0}
			}

			// Sort Probabilities
			prs.sort((a,b)=>a.pr-b.pr);

			// Cummulative Probabilities
			prs[0].cs = prs[0].pr;
			for(let i=1;i<len;i++) {
				prs[i].cs = prs[i-1].cs + prs[i].pr;
			}

			// Randomize
			let rnd = Math.random();

			// Gets only the items whose cumsum >= rnd
			let idx = 0;
			while(idx<len-1 && prs[idx++].cs<rnd);
			ks.push(prs[idx-1].v);
			/*
			let done = false;
			while(!done) {
				// this is our new centroid
				c = prs[idx-1].v
				key = multi? c.join("_") : `${c}`;
				if(!map[key]) {
					map[key] = true;
					ks.push(c);
					done = true;
				}
				else {
					idx++;
				}
			}
			*/
		}

		return ks;
	}

}
