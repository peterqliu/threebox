import tin from '@turf/tin';
import distance from '@turf/distance';
import { featureEach, flattenEach, lineReduce } from '@turf/meta';
import { feature, featureCollection, geometryCollection, isNumber, isObject, lineString, multiLineString } from '@turf/helpers';
import clone from '@turf/clone';
import { getType } from '@turf/invariant';
import { merge } from 'topojson-client';
import { topology } from 'topojson-server';

/**
 * Merges all connected (non-forking, non-junctioning) line strings into single lineStrings.
 * [LineString] -> LineString|MultiLineString
 *
 * @param {FeatureCollection<LineString|MultiLineString>} geojson Lines to dissolve
 * @param {Object} [options={}] Optional parameters
 * @param {boolean} [options.mutate=false] Prevent input mutation
 * @returns {Feature<LineString|MultiLineString>} Dissolved lines
 */
function lineDissolve(geojson, options) {
    // Optional parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var mutate = options.mutate;

    // Validation
    if (getType(geojson) !== 'FeatureCollection') throw new Error('geojson must be a FeatureCollection');
    if (!geojson.features.length) throw new Error('geojson is empty');

    // Clone geojson to avoid side effects
    if (mutate === false || mutate === undefined) geojson = clone(geojson);

    var result = [];
    var lastLine = lineReduce(geojson, function (previousLine, currentLine) {
        // Attempt to merge this LineString with the other LineStrings, updating
        // the reference as it is merged with others and grows.
        var merged = mergeLineStrings(previousLine, currentLine);

        // Accumulate the merged LineString
        if (merged) return merged;

        // Put the unmerged LineString back into the list
        else {
            result.push(previousLine);
            return currentLine;
        }
    });
    // Append the last line
    if (lastLine) result.push(lastLine);

    // Return null if no lines were dissolved
    if (!result.length) return null;
    // Return LineString if only 1 line was dissolved
    else if (result.length === 1) return result[0];
    // Return MultiLineString if multiple lines were dissolved with gaps
    else return multiLineString(result.map(function (line) { return line.coordinates; }));
}

// [Number, Number] -> String
function coordId(coord) {
    return coord[0].toString() + ',' + coord[1].toString();
}

/**
 * LineString, LineString -> LineString
 *
 * @private
 * @param {Feature<LineString>} a line1
 * @param {Feature<LineString>} b line2
 * @returns {Feature<LineString>|null} Merged LineString
 */
function mergeLineStrings(a, b) {
    var coords1 = a.geometry.coordinates;
    var coords2 = b.geometry.coordinates;

    var s1 = coordId(coords1[0]);
    var e1 = coordId(coords1[coords1.length - 1]);
    var s2 = coordId(coords2[0]);
    var e2 = coordId(coords2[coords2.length - 1]);

    // TODO: handle case where more than one of these is true!
    var coords;
    if (s1 === e2) coords = coords2.concat(coords1.slice(1));
    else if (s2 === e1) coords = coords1.concat(coords2.slice(1));
    else if (s1 === s2) coords = coords1.slice(1).reverse().concat(coords2);
    else if (e1 === e2) coords = coords1.concat(coords2.reverse().slice(1));
    else return null;

    return lineString(coords);
}

/**
 * Dissolves all overlapping (Multi)Polygon
 *
 * @param {FeatureCollection<Polygon|MultiPolygon>} geojson Polygons to dissolve
 * @param {Object} [options={}] Optional parameters
 * @param {boolean} [options.mutate=false] Prevent input mutation
 * @returns {Feature<Polygon|MultiPolygon>} Dissolved Polygons
 */
function polygonDissolve(geojson, options) {
    // Optional parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var mutate = options.mutate;

    // Validation
    if (getType(geojson) !== 'FeatureCollection') throw new Error('geojson must be a FeatureCollection');
    if (!geojson.features.length) throw new Error('geojson is empty');

    // Clone geojson to avoid side effects
    // Topojson modifies in place, so we need to deep clone first
    if (mutate === false || mutate === undefined) geojson = clone(geojson);

    var geoms = [];
    flattenEach(geojson, function (feature$$1) {
        geoms.push(feature$$1.geometry);
    });
    var topo = topology({geoms: geometryCollection(geoms).geometry});
    return merge(topo, topo.objects.geoms.geometries);
}

/**
 * Transform function: attempts to dissolve geojson objects where possible
 * [GeoJSON] -> GeoJSON geometry
 *
 * @private
 * @param {FeatureCollection<LineString|MultiLineString|Polygon|MultiPolygon>} geojson Features to dissolved
 * @param {Object} [options={}] Optional parameters
 * @param {boolean} [options.mutate=false] Prevent input mutation
 * @returns {Feature<MultiLineString|MultiPolygon>} Dissolved Features
 */
function dissolve(geojson, options) {
    // Optional parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var mutate = options.mutate;

    // Validation
    if (getType(geojson) !== 'FeatureCollection') throw new Error('geojson must be a FeatureCollection');
    if (!geojson.features.length) throw new Error('geojson is empty');

    // Clone geojson to avoid side effects
    // Topojson modifies in place, so we need to deep clone first
    if (mutate === false || mutate === undefined) geojson = clone(geojson);

    // Assert homogenity
    var type = getHomogenousType(geojson);
    if (!type) throw new Error('geojson must be homogenous');

    switch (type) {
    case 'LineString':
        return lineDissolve(geojson, options);
    case 'Polygon':
        return polygonDissolve(geojson, options);
    default:
        throw new Error(type + ' is not supported');
    }
}

/**
 * Checks if GeoJSON is Homogenous
 *
 * @private
 * @param {GeoJSON} geojson GeoJSON
 * @returns {string|null} Homogenous type or null if multiple types
 */
function getHomogenousType(geojson) {
    var types = {};
    flattenEach(geojson, function (feature$$1) {
        types[feature$$1.geometry.type] = true;
    });
    var keys = Object.keys(types);
    if (keys.length === 1) return keys[0];
    return null;
}

/**
 * Takes a set of {@link Point|points} and returns a concave hull Polygon or MultiPolygon.
 * Internally, this uses [turf-tin](https://github.com/Turfjs/turf-tin) to generate geometries.
 *
 * @name concave
 * @param {FeatureCollection<Point>} points input points
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.maxEdge=Infinity] the length (in 'units') of an edge necessary for part of the hull to become concave.
 * @param {string} [options.units='kilometers'] can be degrees, radians, miles, or kilometers
 * @returns {Feature<(Polygon|MultiPolygon)>|null} a concave hull (null value is returned if unable to compute hull)
 * @example
 * var points = turf.featureCollection([
 *   turf.point([-63.601226, 44.642643]),
 *   turf.point([-63.591442, 44.651436]),
 *   turf.point([-63.580799, 44.648749]),
 *   turf.point([-63.573589, 44.641788]),
 *   turf.point([-63.587665, 44.64533]),
 *   turf.point([-63.595218, 44.64765])
 * ]);
 * var options = {units: 'miles', maxEdge: 1};
 *
 * var hull = turf.concave(points, options);
 *
 * //addToMap
 * var addToMap = [points, hull]
 */
function concave(points, options) {
    // Optional parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');

    // validation
    if (!points) throw new Error('points is required');
    var maxEdge = options.maxEdge || Infinity;
    if (!isNumber(maxEdge)) throw new Error('maxEdge is invalid');

    var cleaned = removeDuplicates(points);

    var tinPolys = tin(cleaned);
    // calculate length of all edges and area of all triangles
    // and remove triangles that fail the max length test
    tinPolys.features = tinPolys.features.filter(function (triangle) {
        var pt1 = triangle.geometry.coordinates[0][0];
        var pt2 = triangle.geometry.coordinates[0][1];
        var pt3 = triangle.geometry.coordinates[0][2];
        var dist1 = distance(pt1, pt2, options);
        var dist2 = distance(pt2, pt3, options);
        var dist3 = distance(pt1, pt3, options);
        return (dist1 <= maxEdge && dist2 <= maxEdge && dist3 <= maxEdge);
    });

    if (tinPolys.features.length < 1) return null;

    // merge the adjacent triangles
    var dissolved = dissolve(tinPolys, options);

    // geojson-dissolve always returns a MultiPolygon
    if (dissolved.coordinates.length === 1) {
        dissolved.coordinates = dissolved.coordinates[0];
        dissolved.type = 'Polygon';
    }
    return feature(dissolved);
}

/**
 * Removes duplicated points in a collection returning a new collection
 *
 * @private
 * @param {FeatureCollection<Point>} points to be cleaned
 * @returns {FeatureCollection<Point>} cleaned set of points
 */
function removeDuplicates(points) {
    var cleaned = [];
    var existing = {};

    featureEach(points, function (pt) {
        if (!pt.geometry) return;
        var key = pt.geometry.coordinates.join('-');
        if (!existing.hasOwnProperty(key)) {
            cleaned.push(pt);
            existing[key] = true;
        }
    });
    return featureCollection(cleaned);
}

export default concave;
