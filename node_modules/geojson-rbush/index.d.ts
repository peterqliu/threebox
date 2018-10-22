import { BBox, Feature, FeatureCollection, GeometryObject, FeatureGeometryCollection, GeometryCollection } from '@turf/helpers'

declare class RBush {
    insert(feature: Feature<any> | GeometryObject | BBox): RBush;
    load(features: FeatureCollection<any> | FeatureGeometryCollection | GeometryCollection | BBox[]): RBush;
    remove<T extends Feature<any> | GeometryObject | BBox>(feature: T, equals?: (a: T, b: T) => boolean): RBush;
    clear(): RBush;
    search<Geom extends GeometryObject>(geojson: Feature<Geom> | FeatureCollection<Geom> | BBox): FeatureCollection<Geom>;
    all(): FeatureCollection<any>;
    collides(geosjon: Feature<any> | FeatureCollection<any> | GeometryCollection | FeatureGeometryCollection | BBox): boolean;
    toJSON(): any;
    fromJSON(data: any): RBush;
}

/**
 * https://github.com/mourner/rbush
 */
export default function rbush(maxEntries?: number): RBush;

