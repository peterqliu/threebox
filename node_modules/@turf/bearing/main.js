'use strict';

var invariant = require('@turf/invariant');
var helpers = require('@turf/helpers');

//http://en.wikipedia.org/wiki/Haversine_formula
//http://www.movable-type.co.uk/scripts/latlong.html

/**
 * Takes two {@link Point|points} and finds the geographic bearing between them,
 * i.e. the angle measured in degrees from the north line (0 degrees)
 *
 * @name bearing
 * @param {Coord} start starting Point
 * @param {Coord} end ending Point
 * @param {Object} [options={}] Optional parameters
 * @param {boolean} [options.final=false] calculates the final bearing if true
 * @returns {number} bearing in decimal degrees, between -180 and 180 degrees (positive clockwise)
 * @example
 * var point1 = turf.point([-75.343, 39.984]);
 * var point2 = turf.point([-75.534, 39.123]);
 *
 * var bearing = turf.bearing(point1, point2);
 *
 * //addToMap
 * var addToMap = [point1, point2]
 * point1.properties['marker-color'] = '#f00'
 * point2.properties['marker-color'] = '#0f0'
 * point1.properties.bearing = bearing
 */
function bearing(start, end, options) {
    // Optional parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');
    var final = options.final;

    // Reverse calculation
    if (final === true) return calculateFinalBearing(start, end);

    var coordinates1 = invariant.getCoord(start);
    var coordinates2 = invariant.getCoord(end);

    var lon1 = helpers.degreesToRadians(coordinates1[0]);
    var lon2 = helpers.degreesToRadians(coordinates2[0]);
    var lat1 = helpers.degreesToRadians(coordinates1[1]);
    var lat2 = helpers.degreesToRadians(coordinates2[1]);
    var a = Math.sin(lon2 - lon1) * Math.cos(lat2);
    var b = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

    return helpers.radiansToDegrees(Math.atan2(a, b));
}

/**
 * Calculates Final Bearing
 *
 * @private
 * @param {Coord} start starting Point
 * @param {Coord} end ending Point
 * @returns {number} bearing
 */
function calculateFinalBearing(start, end) {
    // Swap start & end
    var bear = bearing(end, start);
    bear = (bear + 180) % 360;
    return bear;
}

module.exports = bearing;
module.exports.default = bearing;
