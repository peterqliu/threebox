import AbstractPreparedPolygonContains from './AbstractPreparedPolygonContains'

export default class PreparedPolygonContains extends AbstractPreparedPolygonContains {
  fullTopologicalPredicate (geom) {
    var isContained = this._prepPoly.getGeometry().contains(geom)
    return isContained
  }
  contains (geom) {
    return this.eval(geom)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PreparedPolygonContains
  }
  static contains (prep, geom) {
    var polyInt = new PreparedPolygonContains(prep)
    return polyInt.contains(geom)
  }
}
