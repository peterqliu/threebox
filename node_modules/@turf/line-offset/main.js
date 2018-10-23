'use strict';

var meta = require('@turf/meta');
var invariant = require('@turf/invariant');
var helpers = require('@turf/helpers');

/**
 * https://github.com/rook2pawn/node-intersection
 *
 * Author @rook2pawn
 */

/**
 * AB
 *
 * @private
 * @param {Array<Array<number>>} segment - 2 vertex line segment
 * @returns {Array<number>} coordinates [x, y]
 */
function ab(segment) {
    var start = segment[0];
    var end = segment[1];
    return [end[0] - start[0], end[1] - start[1]];
}

/**
 * Cross Product
 *
 * @private
 * @param {Array<number>} v1 coordinates [x, y]
 * @param {Array<number>} v2 coordinates [x, y]
 * @returns {Array<number>} Cross Product
 */
function crossProduct(v1, v2) {
    return (v1[0] * v2[1]) - (v2[0] * v1[1]);
}

/**
 * Add
 *
 * @private
 * @param {Array<number>} v1 coordinates [x, y]
 * @param {Array<number>} v2 coordinates [x, y]
 * @returns {Array<number>} Add
 */
function add(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1]];
}

/**
 * Sub
 *
 * @private
 * @param {Array<number>} v1 coordinates [x, y]
 * @param {Array<number>} v2 coordinates [x, y]
 * @returns {Array<number>} Sub
 */
function sub(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1]];
}

/**
 * scalarMult
 *
 * @private
 * @param {number} s scalar
 * @param {Array<number>} v coordinates [x, y]
 * @returns {Array<number>} scalarMult
 */
function scalarMult(s, v) {
    return [s * v[0], s * v[1]];
}

/**
 * Intersect Segments
 *
 * @private
 * @param {Array<number>} a coordinates [x, y]
 * @param {Array<number>} b coordinates [x, y]
 * @returns {Array<number>} intersection
 */
function intersectSegments(a, b) {
    var p = a[0];
    var r = ab(a);
    var q = b[0];
    var s = ab(b);

    var cross = crossProduct(r, s);
    var qmp = sub(q, p);
    var numerator = crossProduct(qmp, s);
    var t = numerator / cross;
    var intersection = add(p, scalarMult(t, r));
    return intersection;
}

/**
 * Is Parallel
 *
 * @private
 * @param {Array<number>} a coordinates [x, y]
 * @param {Array<number>} b coordinates [x, y]
 * @returns {boolean} true if a and b are parallel (or co-linear)
 */
function isParallel(a, b) {
    var r = ab(a);
    var s = ab(b);
    return (crossProduct(r, s) === 0);
}

/**
 * Intersection
 *
 * @private
 * @param {Array<number>} a coordinates [x, y]
 * @param {Array<number>} b coordinates [x, y]
 * @returns {Array<number>|boolean} true if a and b are parallel (or co-linear)
 */
function intersection(a, b) {
    if (isParallel(a, b)) return false;
    return intersectSegments(a, b);
}

/**
 * Takes a {@link LineString|line} and returns a {@link LineString|line} at offset by the specified distance.
 *
 * @name lineOffset
 * @param {Geometry|Feature<LineString|MultiLineString>} geojson input GeoJSON
 * @param {number} distance distance to offset the line (can be of negative value)
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.units='kilometers'] can be degrees, radians, miles, kilometers, inches, yards, meters
 * @returns {Feature<LineString|MultiLineString>} Line offset from the input line
 * @example
 * var line = turf.lineString([[-83, 30], [-84, 36], [-78, 41]], { "stroke": "#F00" });
 *
 * var offsetLine = turf.lineOffset(line, 2, {units: 'miles'});
 *
 * //addToMap
 * var addToMap = [offsetLine, line]
 * offsetLine.properties.stroke = "#00F"
 */
function lineOffset(geojson, distance, options) {
    // Optional parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');
    var units = options.units;

    // Valdiation
    if (!geojson) throw new Error('geojson is required');
    if (distance === undefined || distance === null || isNaN(distance)) throw new Error('distance is required');

    var type = invariant.getType(geojson);
    var properties = geojson.properties;

    switch (type) {
    case 'LineString':
        return lineOffsetFeature(geojson, distance, units);
    case 'MultiLineString':
        var coords = [];
        meta.flattenEach(geojson, function (feature) {
            coords.push(lineOffsetFeature(feature, distance, units).geometry.coordinates);
        });
        return helpers.multiLineString(coords, properties);
    default:
        throw new Error('geometry ' + type + ' is not supported');
    }
}

/**
 * Line Offset
 *
 * @private
 * @param {Geometry|Feature<LineString>} line input line
 * @param {number} distance distance to offset the line (can be of negative value)
 * @param {string} [units=kilometers] units
 * @returns {Feature<LineString>} Line offset from the input line
 */
function lineOffsetFeature(line, distance, units) {
    var segments = [];
    var offsetDegrees = helpers.lengthToDegrees(distance, units);
    var coords = invariant.getCoords(line);
    var finalCoords = [];
    coords.forEach(function (currentCoords, index) {
        if (index !== coords.length - 1) {
            var segment = processSegment(currentCoords, coords[index + 1], offsetDegrees);
            segments.push(segment);
            if (index > 0) {
                var seg2Coords = segments[index - 1];
                var intersects = intersection(segment, seg2Coords);

                // Handling for line segments that aren't straight
                if (intersects !== false) {
                    seg2Coords[1] = intersects;
                    segment[0] = intersects;
                }

                finalCoords.push(seg2Coords[0]);
                if (index === coords.length - 2) {
                    finalCoords.push(segment[0]);
                    finalCoords.push(segment[1]);
                }
            }
            // Handling for lines that only have 1 segment
            if (coords.length === 2) {
                finalCoords.push(segment[0]);
                finalCoords.push(segment[1]);
            }
        }
    });
    return helpers.lineString(finalCoords, line.properties);
}

/**
 * Process Segment
 * Inspiration taken from http://stackoverflow.com/questions/2825412/draw-a-parallel-line
 *
 * @private
 * @param {Array<number>} point1 Point coordinates
 * @param {Array<number>} point2 Point coordinates
 * @param {number} offset Offset
 * @returns {Array<Array<number>>} offset points
 */
function processSegment(point1, point2, offset) {
    var L = Math.sqrt((point1[0] - point2[0]) * (point1[0] - point2[0]) + (point1[1] - point2[1]) * (point1[1] - point2[1]));

    var out1x = point1[0] + offset * (point2[1] - point1[1]) / L;
    var out2x = point2[0] + offset * (point2[1] - point1[1]) / L;
    var out1y = point1[1] + offset * (point1[0] - point2[0]) / L;
    var out2y = point2[1] + offset * (point1[0] - point2[0]) / L;
    return [[out1x, out1y], [out2x, out2y]];
}

module.exports = lineOffset;
module.exports.default = lineOffset;
