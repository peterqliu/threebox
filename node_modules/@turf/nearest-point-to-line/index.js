"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var invariant_1 = require("@turf/invariant");
var point_to_line_distance_1 = require("@turf/point-to-line-distance");
var meta_1 = require("@turf/meta");
var objectAssign = require("object-assign");
/**
 * Returns the closest {@link Point|point}, of a {@link FeatureCollection|collection} of points, to a {@link LineString|line}.
 * The returned point has a `dist` property indicating its distance to the line.
 *
 * @name nearestPointToLine
 * @param {FeatureCollection|GeometryCollection<Point>} points Point Collection
 * @param {Feature|Geometry<LineString>} line Line Feature
 * @param {Object} [options] Optional parameters
 * @param {string} [options.units='kilometers'] unit of the output distance property, can be degrees, radians, miles, or kilometers
 * @param {Object} [options.properties={}] Translate Properties to Point
 * @returns {Feature<Point>} the closest point
 * @example
 * var pt1 = turf.point([0, 0]);
 * var pt2 = turf.point([0.5, 0.5]);
 * var points = turf.featureCollection([pt1, pt2]);
 * var line = turf.lineString([[1,1], [-1,1]]);
 *
 * var nearest = turf.nearestPointToLine(points, line);
 *
 * //addToMap
 * var addToMap = [nearest, line];
 */
function nearestPointToLine(points, line, options) {
    if (options === void 0) { options = {}; }
    var units = options.units;
    var properties = options.properties || {};
    // validation
    var pts = normalize(points);
    if (!pts.features.length)
        throw new Error('points must contain features');
    if (!line)
        throw new Error('line is required');
    if (invariant_1.getType(line) !== 'LineString')
        throw new Error('line must be a LineString');
    var dist = Infinity;
    var pt = null;
    meta_1.featureEach(pts, function (point) {
        var d = point_to_line_distance_1.default(point, line, { units: units });
        if (d < dist) {
            dist = d;
            pt = point;
        }
    });
    /**
     * Translate Properties to final Point, priorities:
     * 1. options.properties
     * 2. inherent Point properties
     * 3. dist custom properties created by NearestPointToLine
     */
    if (pt)
        pt.properties = objectAssign({ dist: dist }, pt.properties, properties);
    return pt;
}
/**
 * Convert Collection to FeatureCollection
 *
 * @private
 * @param {FeatureCollection|GeometryCollection} points Points
 * @returns {FeatureCollection<Point>} points
 */
function normalize(points) {
    var features = [];
    var type = points.geometry ? points.geometry.type : points.type;
    switch (type) {
        case 'GeometryCollection':
            meta_1.geomEach(points, function (geom) {
                if (geom.type === 'Point')
                    features.push({ type: 'Feature', properties: {}, geometry: geom });
            });
            return { type: 'FeatureCollection', features: features };
        case 'FeatureCollection':
            points.features = points.features.filter(function (feature) {
                return feature.geometry.type === 'Point';
            });
            return points;
        default:
            throw new Error('points must be a Point Collection');
    }
}
exports.default = nearestPointToLine;
