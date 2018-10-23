import AbstractPreparedPolygonContains from './AbstractPreparedPolygonContains'

export default class PreparedPolygonCovers extends AbstractPreparedPolygonContains {
  constructor (prepPoly) {
    super(prepPoly)
    this._requireSomePointInInterior = false
  }
  fullTopologicalPredicate (geom) {
    var result = this._prepPoly.getGeometry().covers(geom)
    return result
  }
  covers (geom) {
    return this.eval(geom)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PreparedPolygonCovers
  }
  static covers (prep, geom) {
    var polyInt = new PreparedPolygonCovers(prep)
    return polyInt.covers(geom)
  }
}
