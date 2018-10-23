"use strict";

/*jshint esversion: 6 */

var Distance = require("./distance.js"),
    ClusterInit = require("./kinit.js"),
    eudist = Distance.eudist,
    mandist = Distance.mandist,
    dist = Distance.dist,
    kmrand = ClusterInit.kmrand,
    kmpp = ClusterInit.kmpp;

var MAX = 10000;

/**
 * Inits an array with values
 */
function init(len, val, v) {
	v = v || [];
	for (var i = 0; i < len; i++) {
		v[i] = val;
	}return v;
}

function skmeans(data, k, initial, maxit) {
	var ks = [],
	    old = [],
	    idxs = [],
	    dist = [];
	var conv = false,
	    it = maxit || MAX;
	var len = data.length,
	    vlen = data[0].length,
	    multi = vlen > 0;
	var count = [];

	if (!initial) {
		var _idxs = {};
		while (ks.length < k) {
			var idx = Math.floor(Math.random() * len);
			if (!_idxs[idx]) {
				_idxs[idx] = true;
				ks.push(data[idx]);
			}
		}
	} else if (initial == "kmrand") {
		ks = kmrand(data, k);
	} else if (initial == "kmpp") {
		ks = kmpp(data, k);
	} else {
		ks = initial;
	}

	do {
		// Reset k count
		init(k, 0, count);

		// For each value in data, find the nearest centroid
		for (var i = 0; i < len; i++) {
			var min = Infinity,
			    _idx = 0;
			for (var j = 0; j < k; j++) {
				// Multidimensional or unidimensional
				var dist = multi ? eudist(data[i], ks[j]) : Math.abs(data[i] - ks[j]);
				if (dist <= min) {
					min = dist;
					_idx = j;
				}
			}
			idxs[i] = _idx; // Index of the selected centroid for that value
			count[_idx]++; // Number of values for this centroid
		}

		// Recalculate centroids
		var sum = [],
		    old = [],
		    dif = 0;
		for (var _j = 0; _j < k; _j++) {
			// Multidimensional or unidimensional
			sum[_j] = multi ? init(vlen, 0, sum[_j]) : 0;
			old[_j] = ks[_j];
		}

		// If multidimensional
		if (multi) {
			for (var _j2 = 0; _j2 < k; _j2++) {
				ks[_j2] = [];
			} // Sum values and count for each centroid
			for (var _i = 0; _i < len; _i++) {
				var _idx2 = idxs[_i],
				    // Centroid for that item
				vsum = sum[_idx2],
				    // Sum values for this centroid
				vect = data[_i]; // Current vector

				// Accumulate value on the centroid for current vector
				for (var h = 0; h < vlen; h++) {
					vsum[h] += vect[h];
				}
			}
			// Calculate the average for each centroid
			conv = true;
			for (var _j3 = 0; _j3 < k; _j3++) {
				var ksj = ks[_j3],
				    // Current centroid
				sumj = sum[_j3],
				    // Accumulated centroid values
				oldj = old[_j3],
				    // Old centroid value
				cj = count[_j3]; // Number of elements for this centroid

				// New average
				for (var _h = 0; _h < vlen; _h++) {
					ksj[_h] = sumj[_h] / cj || 0; // New centroid
				}

				// Find if centroids have moved
				if (conv) {
					for (var _h2 = 0; _h2 < vlen; _h2++) {
						if (oldj[_h2] != ksj[_h2]) {
							conv = false;
							break;
						}
					}
				}
			}
		}
		// If unidimensional
		else {
				// Sum values and count for each centroid
				for (var _i2 = 0; _i2 < len; _i2++) {
					var _idx3 = idxs[_i2];
					sum[_idx3] += data[_i2];
				}
				// Calculate the average for each centroid
				for (var _j4 = 0; _j4 < k; _j4++) {
					ks[_j4] = sum[_j4] / count[_j4] || 0; // New centroid
				}
				// Find if centroids have moved
				conv = true;
				for (var _j5 = 0; _j5 < k; _j5++) {
					if (old[_j5] != ks[_j5]) {
						conv = false;
						break;
					}
				}
			}

		conv = conv || --it <= 0;
	} while (!conv);

	return {
		it: MAX - it,
		k: k,
		idxs: idxs,
		centroids: ks
	};
}

module.exports = skmeans;
//# sourceMappingURL=main.js.map
