'use strict';

var invariant = require('@turf/invariant');
var helpers = require('@turf/helpers');

/**
 * Converts a {@link Polygon} to {@link LineString|(Multi)LineString} or {@link MultiPolygon} to a {@link FeatureCollection} of {@link LineString|(Multi)LineString}.
 *
 * @name polygonToLine
 * @param {Feature<Polygon|MultiPolygon>} polygon Feature to convert
 * @param {Object} [options={}] Optional parameters
 * @param {Object} [options.properties={}] translates GeoJSON properties to Feature
 * @returns {FeatureCollection|Feature<LineString|MultiLinestring>} converted (Multi)Polygon to (Multi)LineString
 * @example
 * var poly = turf.polygon([[[125, -30], [145, -30], [145, -20], [125, -20], [125, -30]]]);
 *
 * var line = turf.polygonToLine(poly);
 *
 * //addToMap
 * var addToMap = [line];
 */
function polygonToLine(polygon, options) {
    // Optional parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');
    var properties = options.properties;

    // Variables
    var geom = invariant.getType(polygon);
    var coords = invariant.getCoords(polygon);
    properties = properties || polygon.properties || {};

    if (!coords.length) throw new Error('polygon must contain coordinates');

    switch (geom) {
    case 'Polygon':
        return coordsToLine(coords, properties);
    case 'MultiPolygon':
        var lines = [];
        coords.forEach(function (coord) {
            lines.push(coordsToLine(coord, properties));
        });
        return helpers.featureCollection(lines);
    default:
        throw new Error('geom ' + geom + ' not supported');
    }
}

function coordsToLine(coords, properties) {
    if (coords.length > 1) return helpers.multiLineString(coords, properties);
    return helpers.lineString(coords[0], properties);
}

module.exports = polygonToLine;
module.exports.default = polygonToLine;
