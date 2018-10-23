'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var turfJsts = require('turf-jsts');
var area = _interopDefault(require('@turf/area'));
var helpers = require('@turf/helpers');
var invariant = require('@turf/invariant');
var meta = require('@turf/meta');

/**
 * Finds the difference between two {@link Polygon|polygons} by clipping the second polygon from the first.
 *
 * @name difference
 * @param {Feature<Polygon|MultiPolygon>} polygon1 input Polygon feature
 * @param {Feature<Polygon|MultiPolygon>} polygon2 Polygon feature to difference from polygon1
 * @returns {Feature<Polygon|MultiPolygon>|null} a Polygon or MultiPolygon feature showing the area of `polygon1` excluding the area of `polygon2` (if empty returns `null`)
 * @example
 * var polygon1 = turf.polygon([[
 *   [128, -26],
 *   [141, -26],
 *   [141, -21],
 *   [128, -21],
 *   [128, -26]
 * ]], {
 *   "fill": "#F00",
 *   "fill-opacity": 0.1
 * });
 * var polygon2 = turf.polygon([[
 *   [126, -28],
 *   [140, -28],
 *   [140, -20],
 *   [126, -20],
 *   [126, -28]
 * ]], {
 *   "fill": "#00F",
 *   "fill-opacity": 0.1
 * });
 *
 * var difference = turf.difference(polygon1, polygon2);
 *
 * //addToMap
 * var addToMap = [polygon1, polygon2, difference];
 */
function difference(polygon1, polygon2) {
    var geom1 = invariant.getGeom(polygon1);
    var geom2 = invariant.getGeom(polygon2);
    var properties = polygon1.properties || {};

    // Issue #721 - JSTS can't handle empty polygons
    geom1 = removeEmptyPolygon(geom1);
    geom2 = removeEmptyPolygon(geom2);
    if (!geom1) return null;
    if (!geom2) return helpers.feature(geom1, properties);

    // JSTS difference operation
    var reader = new turfJsts.GeoJSONReader();
    var a = reader.read(geom1);
    var b = reader.read(geom2);
    var differenced = turfJsts.OverlayOp.difference(a, b);
    if (differenced.isEmpty()) return null;
    var writer = new turfJsts.GeoJSONWriter();
    var geom = writer.write(differenced);

    return helpers.feature(geom, properties);
}

/**
 * Detect Empty Polygon
 *
 * @private
 * @param {Geometry<Polygon|MultiPolygon>} geom Geometry Object
 * @returns {Geometry<Polygon|MultiPolygon>|null} removed any polygons with no areas
 */
function removeEmptyPolygon(geom) {
    switch (geom.type) {
    case 'Polygon':
        if (area(geom) > 1) return geom;
        return null;
    case 'MultiPolygon':
        var coordinates = [];
        meta.flattenEach(geom, function (feature$$1) {
            if (area(feature$$1) > 1) coordinates.push(feature$$1.geometry.coordinates);
        });
        if (coordinates.length) return {type: 'MultiPolygon', coordinates: coordinates};
    }
}

module.exports = difference;
module.exports.default = difference;
