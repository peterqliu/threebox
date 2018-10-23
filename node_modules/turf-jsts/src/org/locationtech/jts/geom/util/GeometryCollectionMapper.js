import GeometryFactory from '../GeometryFactory'
import ArrayList from '../../../../../java/util/ArrayList'

export default class GeometryCollectionMapper {
  constructor (mapOp) {
    this._mapOp = mapOp
  }
  map (gc) {
    var mapped = new ArrayList()
    for (var i = 0; i < gc.getNumGeometries(); i++) {
      var g = this._mapOp.map(gc.getGeometryN(i))
      if (!g.isEmpty()) mapped.add(g)
    }
    return gc.getFactory().createGeometryCollection(GeometryFactory.toGeometryArray(mapped))
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return GeometryCollectionMapper
  }
  static map (gc, op) {
    var mapper = new GeometryCollectionMapper(op)
    return mapper.map(gc)
  }
}
