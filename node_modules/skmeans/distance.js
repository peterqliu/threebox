module.exports = {
	/**
	 * Euclidean distance
	 */
	eudist(v1,v2,sqrt) {
		var len = v1.length;
		var sum = 0;

		for(let i=0;i<len;i++) {
			var d = (v1[i]||0) - (v2[i]||0);
			sum += d*d;
		}
		// Square root not really needed
		return sqrt? Math.sqrt(sum) : sum;
	},

	mandist(v1,v2,sqrt) {
		var len = v1.length;
		var sum = 0;

		for(let i=0;i<len;i++) {
			sum += Math.abs((v1[i]||0) - (v2[i]||0));
		}

		// Square root not really needed
		return sqrt? Math.sqrt(sum) : sum;
	},

	/**
	 * Unidimensional distance
	 */
	dist(v1,v2,sqrt) {
		var d = Math.abs(v1-v2);
		return sqrt? d : d*d;
	}

}
