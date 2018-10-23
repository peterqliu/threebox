import rbush from './rbush';
import {featureEach, coordEach} from '@turf/meta';

/**
 * GeoJSON implementation of [RBush](https://github.com/mourner/rbush#rbush) spatial index.
 *
 * @name rbush
 * @param {number} [maxEntries=9] defines the maximum number of entries in a tree node. 9 (used by default) is a
 * reasonable choice for most applications. Higher value means faster insertion and slower search, and vice versa.
 * @returns {RBush} GeoJSON RBush
 * @example
 * import geojsonRbush from 'geojson-rbush';
 * var tree = geojsonRbush();
 */
function geojsonRbush(maxEntries) {
    var tree = rbush(maxEntries);
    /**
     * [insert](https://github.com/mourner/rbush#data-format)
     *
     * @param {Feature<any>} feature insert single GeoJSON Feature
     * @returns {RBush} GeoJSON RBush
     * @example
     * var polygon = {
     *   "type": "Feature",
     *   "properties": {},
     *   "geometry": {
     *     "type": "Polygon",
     *     "coordinates": [[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]
     *   }
     * }
     * tree.insert(polygon)
     */
    tree.insert = function (feature) {
        if (Array.isArray(feature)) {
            var bbox = feature;
            feature = bboxPolygon(bbox);
            feature.bbox = bbox;
        } else {
            feature.bbox = feature.bbox ? feature.bbox : turfBBox(feature);
        }
        return rbush.prototype.insert.call(this, feature);
    };

    /**
     * [load](https://github.com/mourner/rbush#bulk-inserting-data)
     *
     * @param {BBox[]|FeatureCollection<any>} features load entire GeoJSON FeatureCollection
     * @returns {RBush} GeoJSON RBush
     * @example
     * var polygons = {
     *   "type": "FeatureCollection",
     *   "features": [
     *     {
     *       "type": "Feature",
     *       "properties": {},
     *       "geometry": {
     *         "type": "Polygon",
     *         "coordinates": [[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]
     *       }
     *     },
     *     {
     *       "type": "Feature",
     *       "properties": {},
     *       "geometry": {
     *         "type": "Polygon",
     *         "coordinates": [[[-93, 32], [-83, 32], [-83, 39], [-93, 39], [-93, 32]]]
     *       }
     *     }
     *   ]
     * }
     * tree.load(polygons)
     */
    tree.load = function (features) {
        var load = [];
        // Load an Array of BBox
        if (Array.isArray(features)) {
            features.forEach(function (bbox) {
                var feature = bboxPolygon(bbox);
                feature.bbox = bbox;
                load.push(feature);
            });
        } else {
            // Load FeatureCollection
            featureEach(features, function (feature) {
                feature.bbox = feature.bbox ? feature.bbox : turfBBox(feature);
                load.push(feature);
            });
        }
        return rbush.prototype.load.call(this, load);
    };

    /**
     * [remove](https://github.com/mourner/rbush#removing-data)
     *
     * @param {BBox|Feature<any>} feature remove single GeoJSON Feature
     * @returns {RBush} GeoJSON RBush
     * @example
     * var polygon = {
     *   "type": "Feature",
     *   "properties": {},
     *   "geometry": {
     *     "type": "Polygon",
     *     "coordinates": [[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]
     *   }
     * }
     * tree.remove(polygon)
     */
    tree.remove = function (feature) {
        if (Array.isArray(feature)) {
            var bbox = feature;
            feature = bboxPolygon(bbox);
            feature.bbox = bbox;
        }
        return rbush.prototype.remove.call(this, feature);
    };

    /**
     * [clear](https://github.com/mourner/rbush#removing-data)
     *
     * @returns {RBush} GeoJSON Rbush
     * @example
     * tree.clear()
     */
    tree.clear = function () {
        return rbush.prototype.clear.call(this);
    };

    /**
     * [search](https://github.com/mourner/rbush#search)
     *
     * @param {BBox|FeatureCollection|Feature<any>} geojson search with GeoJSON
     * @returns {FeatureCollection<any>} all features that intersects with the given GeoJSON.
     * @example
     * var polygon = {
     *   "type": "Feature",
     *   "properties": {},
     *   "geometry": {
     *     "type": "Polygon",
     *     "coordinates": [[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]
     *   }
     * }
     * tree.search(polygon)
     */
    tree.search = function (geojson) {
        var features = rbush.prototype.search.call(this, this.toBBox(geojson));
        return {
            type: 'FeatureCollection',
            features: features
        };
    };

    /**
     * [collides](https://github.com/mourner/rbush#collisions)
     *
     * @param {BBox|FeatureCollection|Feature<any>} geojson collides with GeoJSON
     * @returns {boolean} true if there are any items intersecting the given GeoJSON, otherwise false.
     * @example
     * var polygon = {
     *   "type": "Feature",
     *   "properties": {},
     *   "geometry": {
     *     "type": "Polygon",
     *     "coordinates": [[[-78, 41], [-67, 41], [-67, 48], [-78, 48], [-78, 41]]]
     *   }
     * }
     * tree.collides(polygon)
     */
    tree.collides = function (geojson) {
        return rbush.prototype.collides.call(this, this.toBBox(geojson));
    };

    /**
     * [all](https://github.com/mourner/rbush#search)
     *
     * @returns {FeatureCollection<any>} all the features in RBush
     * @example
     * tree.all()
     * //=FeatureCollection
     */
    tree.all = function () {
        var features = rbush.prototype.all.call(this);
        return {
            type: 'FeatureCollection',
            features: features
        };
    };

    /**
     * [toJSON](https://github.com/mourner/rbush#export-and-import)
     *
     * @returns {any} export data as JSON object
     * @example
     * var exported = tree.toJSON()
     * //=JSON object
     */
    tree.toJSON = function () {
        return rbush.prototype.toJSON.call(this);
    };

    /**
     * [fromJSON](https://github.com/mourner/rbush#export-and-import)
     *
     * @param {any} json import previously exported data
     * @returns {RBush} GeoJSON RBush
     * @example
     * var exported = {
     *   "children": [
     *     {
     *       "type": "Feature",
     *       "geometry": {
     *         "type": "Point",
     *         "coordinates": [110, 50]
     *       },
     *       "properties": {},
     *       "bbox": [110, 50, 110, 50]
     *     }
     *   ],
     *   "height": 1,
     *   "leaf": true,
     *   "minX": 110,
     *   "minY": 50,
     *   "maxX": 110,
     *   "maxY": 50
     * }
     * tree.fromJSON(exported)
     */
    tree.fromJSON = function (json) {
        return rbush.prototype.fromJSON.call(this, json);
    };

    /**
     * Converts GeoJSON to {minX, minY, maxX, maxY} schema
     *
     * @private
     * @param {BBox|FeatureCollectio|Feature<any>} geojson feature(s) to retrieve BBox from
     * @returns {Object} converted to {minX, minY, maxX, maxY}
     */
    tree.toBBox = function (geojson) {
        var bbox;
        if (geojson.bbox) bbox = geojson.bbox;
        else if (Array.isArray(geojson) && geojson.length === 4) bbox = geojson;
        else bbox = turfBBox(geojson);

        return {
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3]
        };
    };
    return tree;
}

/**
 * Takes a bbox and returns an equivalent {@link Polygon|polygon}.
 *
 * @private
 * @name bboxPolygon
 * @param {Array<number>} bbox extent in [minX, minY, maxX, maxY] order
 * @returns {Feature<Polygon>} a Polygon representation of the bounding box
 * @example
 * var bbox = [0, 0, 10, 10];
 *
 * var poly = turf.bboxPolygon(bbox);
 *
 * //addToMap
 * var addToMap = [poly]
 */
function bboxPolygon(bbox) {
    var lowLeft = [bbox[0], bbox[1]];
    var topLeft = [bbox[0], bbox[3]];
    var topRight = [bbox[2], bbox[3]];
    var lowRight = [bbox[2], bbox[1]];
    var coordinates = [[lowLeft, lowRight, topRight, topLeft, lowLeft]];

    return {
        type: 'Feature',
        bbox: bbox,
        properties: {},
        geometry: {
            type: 'Polygon',
            coordinates: coordinates
        }
    };
}

/**
 * Takes a set of features, calculates the bbox of all input features, and returns a bounding box.
 *
 * @private
 * @name bbox
 * @param {FeatureCollection|Feature<any>} geojson input features
 * @returns {Array<number>} bbox extent in [minX, minY, maxX, maxY] order
 * @example
 * var line = turf.lineString([[-74, 40], [-78, 42], [-82, 35]]);
 * var bbox = turf.bbox(line);
 * var bboxPolygon = turf.bboxPolygon(bbox);
 *
 * //addToMap
 * var addToMap = [line, bboxPolygon]
 */
function turfBBox(geojson) {
    var bbox = [Infinity, Infinity, -Infinity, -Infinity];
    coordEach(geojson, function (coord) {
        if (bbox[0] > coord[0]) bbox[0] = coord[0];
        if (bbox[1] > coord[1]) bbox[1] = coord[1];
        if (bbox[2] < coord[0]) bbox[2] = coord[0];
        if (bbox[3] < coord[1]) bbox[3] = coord[1];
    });
    return bbox;
}

export default geojsonRbush;
