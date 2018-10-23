'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var GeojsonEquality = _interopDefault(require('geojson-equality'));
var cleanCoords = _interopDefault(require('@turf/clean-coords'));
var invariant = require('@turf/invariant');

/**
 * Determine whether two geometries of the same type have identical X,Y coordinate values.
 * See http://edndoc.esri.com/arcsde/9.0/general_topics/understand_spatial_relations.htm
 *
 * @name booleanEqual
 * @param {Geometry|Feature} feature1 GeoJSON input
 * @param {Geometry|Feature} feature2 GeoJSON input
 * @returns {boolean} true if the objects are equal, false otherwise
 * @example
 * var pt1 = turf.point([0, 0]);
 * var pt2 = turf.point([0, 0]);
 * var pt3 = turf.point([1, 1]);
 *
 * turf.booleanEqual(pt1, pt2);
 * //= true
 * turf.booleanEqual(pt2, pt3);
 * //= false
 */
function booleanEqual(feature1, feature2) {
    // validation
    if (!feature1) throw new Error('feature1 is required');
    if (!feature2) throw new Error('feature2 is required');
    var type1 = invariant.getType(feature1);
    var type2 = invariant.getType(feature2);
    if (type1 !== type2) return false;

    var equality = new GeojsonEquality({precision: 6});
    return equality.compare(cleanCoords(feature1), cleanCoords(feature2));
}

module.exports = booleanEqual;
module.exports.default = booleanEqual;
