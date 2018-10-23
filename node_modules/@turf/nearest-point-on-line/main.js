'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var bearing = _interopDefault(require('@turf/bearing'));
var distance = _interopDefault(require('@turf/distance'));
var destination = _interopDefault(require('@turf/destination'));
var lineIntersects = _interopDefault(require('@turf/line-intersect'));
var meta = require('@turf/meta');
var helpers = require('@turf/helpers');
var invariant = require('@turf/invariant');

/**
 * Takes a {@link Point} and a {@link LineString} and calculates the closest Point on the (Multi)LineString.
 *
 * @name nearestPointOnLine
 * @param {Geometry|Feature<LineString|MultiLineString>} lines lines to snap to
 * @param {Geometry|Feature<Point>|number[]} pt point to snap from
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.units='kilometers'] can be degrees, radians, miles, or kilometers
 * @returns {Feature<Point>} closest point on the `line` to `point`. The properties object will contain three values: `index`: closest point was found on nth line part, `dist`: distance between pt and the closest point, `location`: distance along the line between start and the closest point.
 * @example
 * var line = turf.lineString([
 *     [-77.031669, 38.878605],
 *     [-77.029609, 38.881946],
 *     [-77.020339, 38.884084],
 *     [-77.025661, 38.885821],
 *     [-77.021884, 38.889563],
 *     [-77.019824, 38.892368]
 * ]);
 * var pt = turf.point([-77.037076, 38.884017]);
 *
 * var snapped = turf.nearestPointOnLine(line, pt, {units: 'miles'});
 *
 * //addToMap
 * var addToMap = [line, pt, snapped];
 * snapped.properties['marker-color'] = '#00f';
 */
function nearestPointOnLine(lines, pt, options) {
    // Optional parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');

    // validation
    var type = (lines.geometry) ? lines.geometry.type : lines.type;
    if (type !== 'LineString' && type !== 'MultiLineString') {
        throw new Error('lines must be LineString or MultiLineString');
    }

    var closestPt = helpers.point([Infinity, Infinity], {
        dist: Infinity
    });

    var length = 0.0;
    meta.flattenEach(lines, function (line) {
        var coords = invariant.getCoords(line);

        for (var i = 0; i < coords.length - 1; i++) {
            //start
            var start = helpers.point(coords[i]);
            start.properties.dist = distance(pt, start, options);
            //stop
            var stop = helpers.point(coords[i + 1]);
            stop.properties.dist = distance(pt, stop, options);
            // sectionLength
            var sectionLength = distance(start, stop, options);
            //perpendicular
            var heightDistance = Math.max(start.properties.dist, stop.properties.dist);
            var direction = bearing(start, stop);
            var perpendicularPt1 = destination(pt, heightDistance, direction + 90, options);
            var perpendicularPt2 = destination(pt, heightDistance, direction - 90, options);
            var intersect = lineIntersects(
                helpers.lineString([perpendicularPt1.geometry.coordinates, perpendicularPt2.geometry.coordinates]),
                helpers.lineString([start.geometry.coordinates, stop.geometry.coordinates])
            );
            var intersectPt = null;
            if (intersect.features.length > 0) {
                intersectPt = intersect.features[0];
                intersectPt.properties.dist = distance(pt, intersectPt, options);
                intersectPt.properties.location = length + distance(start, intersectPt, options);
            }

            if (start.properties.dist < closestPt.properties.dist) {
                closestPt = start;
                closestPt.properties.index = i;
                closestPt.properties.location = length;
            }
            if (stop.properties.dist < closestPt.properties.dist) {
                closestPt = stop;
                closestPt.properties.index = i + 1;
                closestPt.properties.location = length + sectionLength;
            }
            if (intersectPt && intersectPt.properties.dist < closestPt.properties.dist) {
                closestPt = intersectPt;
                closestPt.properties.index = i;
            }
            // update length
            length += sectionLength;
        }

    });

    return closestPt;
}

module.exports = nearestPointOnLine;
module.exports.default = nearestPointOnLine;
