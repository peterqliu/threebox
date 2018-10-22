"use strict";

(function() {
  var root = this
  var previous_skmeans = root.skmeans;
	var skmeans = require('./main.js');

	if( typeof exports !== 'undefined' ) {
    if( typeof module !== 'undefined' && module.exports ) {
      exports = module.exports = skmeans;
    }
    exports.skmeans = skmeans;
  }

	if(typeof window !== 'undefined') {
    window.skmeans = skmeans;
  }

}).call(this);
