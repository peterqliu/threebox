'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var turfBBox = _interopDefault(require('@turf/bbox'));
var invariant = require('@turf/invariant');
var helpers = require('@turf/helpers');

/**
 * Converts (Multi)LineString(s) to Polygon(s).
 *
 * @name lineToPolygon
 * @param {FeatureCollection|Feature<LineString|MultiLineString>} lines Features to convert
 * @param {Object} [options={}] Optional parameters
 * @param {Object} [options.properties={}] translates GeoJSON properties to Feature
 * @param {boolean} [options.autoComplete=true] auto complete linestrings (matches first & last coordinates)
 * @param {boolean} [options.orderCoords=true] sorts linestrings to place outer ring at the first position of the coordinates
 * @returns {Feature<Polygon|MultiPolygon>} converted to Polygons
 * @example
 * var line = turf.lineString([[125, -30], [145, -30], [145, -20], [125, -20], [125, -30]]);
 *
 * var polygon = turf.lineToPolygon(line);
 *
 * //addToMap
 * var addToMap = [polygon];
 */
function lineToPolygon(lines, options) {
    // Optional parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');
    var properties = options.properties;
    var autoComplete = options.autoComplete;
    var orderCoords = options.orderCoords;

    // validation
    if (!lines) throw new Error('lines is required');

    // default params
    autoComplete = (autoComplete !== undefined) ? autoComplete : true;
    orderCoords = (orderCoords !== undefined) ? orderCoords : true;
    var type = invariant.getType(lines);

    switch (type) {
    case 'FeatureCollection':
    case 'GeometryCollection':
        var coords = [];
        var features = (lines.features) ? lines.features : lines.geometries;
        features.forEach(function (line) {
            coords.push(invariant.getCoords(lineStringToPolygon(line, {}, autoComplete, orderCoords)));
        });
        return helpers.multiPolygon(coords, properties);
    }
    return lineStringToPolygon(lines, properties, autoComplete, orderCoords);
}

/**
 * LineString to Polygon
 *
 * @private
 * @param {Feature<LineString|MultiLineString>} line line
 * @param {Object} [properties] translates GeoJSON properties to Feature
 * @param {boolean} [autoComplete=true] auto complete linestrings
 * @param {boolean} [orderCoords=true] sorts linestrings to place outer ring at the first position of the coordinates
 * @returns {Feature<Polygon>} line converted to Polygon
 */
function lineStringToPolygon(line, properties, autoComplete, orderCoords) {
    properties = properties || line.properties || {};
    var coords = invariant.getCoords(line);
    var type = invariant.getType(line);

    if (!coords.length) throw new Error('line must contain coordinates');

    switch (type) {
    case 'LineString':
        if (autoComplete) coords = autoCompleteCoords(coords);
        return helpers.polygon([coords], properties);
    case 'MultiLineString':
        var multiCoords = [];
        var largestArea = 0;

        coords.forEach(function (coord) {
            if (autoComplete) coord = autoCompleteCoords(coord);

            // Largest LineString to be placed in the first position of the coordinates array
            if (orderCoords) {
                var area = calculateArea(turfBBox(helpers.lineString(coord)));
                if (area > largestArea) {
                    multiCoords.unshift(coord);
                    largestArea = area;
                } else multiCoords.push(coord);
            } else {
                multiCoords.push(coord);
            }
        });
        return helpers.polygon(multiCoords, properties);
    default:
        throw new Error('geometry type ' + type + ' is not supported');
    }
}

/**
 * Auto Complete Coords - matches first & last coordinates
 *
 * @private
 * @param {Array<Array<number>>} coords Coordinates
 * @returns {Array<Array<number>>} auto completed coordinates
 */
function autoCompleteCoords(coords) {
    var first = coords[0];
    var x1 = first[0];
    var y1 = first[1];
    var last = coords[coords.length - 1];
    var x2 = last[0];
    var y2 = last[1];
    if (x1 !== x2 || y1 !== y2) {
        coords.push(first);
    }
    return coords;
}

/**
 * area - quick approximate area calculation (used to sort)
 *
 * @private
 * @param {Array<number>} bbox BBox [west, south, east, north]
 * @returns {number} very quick area calculation
 */
function calculateArea(bbox) {
    var west = bbox[0];
    var south = bbox[1];
    var east = bbox[2];
    var north = bbox[3];
    return Math.abs(west - east) * Math.abs(south - north);
}

module.exports = lineToPolygon;
module.exports.default = lineToPolygon;
