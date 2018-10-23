'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var rbush = _interopDefault(require('geojson-rbush'));
var lineSegment = _interopDefault(require('@turf/line-segment'));
var nearestPointOnLine = _interopDefault(require('@turf/nearest-point-on-line'));
var booleanPointOnLine = _interopDefault(require('@turf/boolean-point-on-line'));
var invariant = require('@turf/invariant');
var meta = require('@turf/meta');
var helpers = require('@turf/helpers');

var pSlice = Array.prototype.slice;

function isArguments(object) {
    return Object.prototype.toString.call(object) === '[object Arguments]';
}

function deepEqual(actual, expected, opts) {
    if (!opts) opts = {};
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
        return true;

    } else if (actual instanceof Date && expected instanceof Date) {
        return actual.getTime() === expected.getTime();

        // 7.3. Other pairs that do not both pass typeof value == 'object',
        // equivalence is determined by ==.
    } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
        return opts.strict ? actual === expected : actual === expected;

        // 7.4. For all other Object pairs, including Array objects, equivalence is
        // determined by having the same number of owned properties (as verified
        // with Object.prototype.hasOwnProperty.call), the same set of keys
        // (although not necessarily the same order), equivalent values for every
        // corresponding key, and an identical 'prototype' property. Note: this
        // accounts for both named and indexed properties on Arrays.
    } else {
        return objEquiv(actual, expected, opts);
    }
}

function isUndefinedOrNull(value) {
    return value === null || value === undefined;
}

function isBuffer(x) {
    if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
    if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
        return false;
    }
    if (x.length > 0 && typeof x[0] !== 'number') return false;
    return true;
}

function objEquiv(a, b, opts) {
    var i, key;
    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
        return false;
    // an identical 'prototype' property.
    if (a.prototype !== b.prototype) return false;
    //~~~I've managed to break Object.keys through screwy arguments passing.
    //   Converting to array solves the problem.
    if (isArguments(a)) {
        if (!isArguments(b)) {
            return false;
        }
        a = pSlice.call(a);
        b = pSlice.call(b);
        return deepEqual(a, b, opts);
    }
    if (isBuffer(a)) {
        if (!isBuffer(b)) {
            return false;
        }
        if (a.length !== b.length) return false;
        for (i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
    try {
        var ka = Object.keys(a),
            kb = Object.keys(b);
    } catch (e) { //happens when one is a string literal and the other isn't
        return false;
    }
    // having the same number of owned properties (keys incorporates
    // hasOwnProperty)
    if (ka.length !== kb.length)
        return false;
    //the same set of keys (although not necessarily the same order),
    ka.sort();
    kb.sort();
    //~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
        if (ka[i] !== kb[i])
            return false;
    }
    //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
        key = ka[i];
        if (!deepEqual(a[key], b[key], opts)) return false;
    }
    return typeof a === typeof b;
}

/**
 * Takes any LineString or Polygon and returns the overlapping lines between both features.
 *
 * @name lineOverlap
 * @param {Geometry|Feature<LineString|MultiLineString|Polygon|MultiPolygon>} line1 any LineString or Polygon
 * @param {Geometry|Feature<LineString|MultiLineString|Polygon|MultiPolygon>} line2 any LineString or Polygon
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.tolerance=0] Tolerance distance to match overlapping line segments (in kilometers)
 * @returns {FeatureCollection<LineString>} lines(s) that are overlapping between both features
 * @example
 * var line1 = turf.lineString([[115, -35], [125, -30], [135, -30], [145, -35]]);
 * var line2 = turf.lineString([[115, -25], [125, -30], [135, -30], [145, -25]]);
 *
 * var overlapping = turf.lineOverlap(line1, line2);
 *
 * //addToMap
 * var addToMap = [line1, line2, overlapping]
 */
function lineOverlap(line1, line2, options) {
    // Optional parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');
    var tolerance = options.tolerance || 0;

    // Containers
    var features = [];

    // Create Spatial Index
    var tree = rbush();
    tree.load(lineSegment(line1));
    var overlapSegment;

    // Line Intersection

    // Iterate over line segments
    meta.segmentEach(line2, function (segment) {
        var doesOverlaps = false;

        // Iterate over each segments which falls within the same bounds
        meta.featureEach(tree.search(segment), function (match) {
            if (doesOverlaps === false) {
                var coordsSegment = invariant.getCoords(segment).sort();
                var coordsMatch = invariant.getCoords(match).sort();

                // Segment overlaps feature
                if (deepEqual(coordsSegment, coordsMatch)) {
                    doesOverlaps = true;
                    // Overlaps already exists - only append last coordinate of segment
                    if (overlapSegment) overlapSegment = concatSegment(overlapSegment, segment);
                    else overlapSegment = segment;
                // Match segments which don't share nodes (Issue #901)
                } else if (
                    (tolerance === 0) ?
                        booleanPointOnLine(coordsSegment[0], match) && booleanPointOnLine(coordsSegment[1], match) :
                        nearestPointOnLine(match, coordsSegment[0]).properties.dist <= tolerance &&
                        nearestPointOnLine(match, coordsSegment[1]).properties.dist <= tolerance) {
                    doesOverlaps = true;
                    if (overlapSegment) overlapSegment = concatSegment(overlapSegment, segment);
                    else overlapSegment = segment;
                } else if (
                    (tolerance === 0) ?
                        booleanPointOnLine(coordsMatch[0], segment) && booleanPointOnLine(coordsMatch[1], segment) :
                        nearestPointOnLine(segment, coordsMatch[0]).properties.dist <= tolerance &&
                        nearestPointOnLine(segment, coordsMatch[1]).properties.dist <= tolerance) {
                    // Do not define (doesOverlap = true) since more matches can occur within the same segment
                    // doesOverlaps = true;
                    if (overlapSegment) overlapSegment = concatSegment(overlapSegment, match);
                    else overlapSegment = match;
                }
            }
        });

        // Segment doesn't overlap - add overlaps to results & reset
        if (doesOverlaps === false && overlapSegment) {
            features.push(overlapSegment);
            overlapSegment = undefined;
        }
    });
    // Add last segment if exists
    if (overlapSegment) features.push(overlapSegment);

    return helpers.featureCollection(features);
}


/**
 * Concat Segment
 *
 * @private
 * @param {Feature<LineString>} line LineString
 * @param {Feature<LineString>} segment 2-vertex LineString
 * @returns {Feature<LineString>} concat linestring
 */
function concatSegment(line, segment) {
    var coords = invariant.getCoords(segment);
    var lineCoords = invariant.getCoords(line);
    var start = lineCoords[0];
    var end = lineCoords[lineCoords.length - 1];
    var geom = line.geometry.coordinates;

    if (deepEqual(coords[0], start)) geom.unshift(coords[1]);
    else if (deepEqual(coords[0], end)) geom.push(coords[1]);
    else if (deepEqual(coords[1], start)) geom.unshift(coords[0]);
    else if (deepEqual(coords[1], end)) geom.push(coords[0]);
    return line;
}

module.exports = lineOverlap;
module.exports.default = lineOverlap;
