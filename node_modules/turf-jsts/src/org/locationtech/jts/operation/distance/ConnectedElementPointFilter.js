import LineString from '../../geom/LineString'
import Point from '../../geom/Point'
import Polygon from '../../geom/Polygon'
import ArrayList from '../../../../../java/util/ArrayList'
import GeometryFilter from '../../geom/GeometryFilter'

export default class ConnectedElementPointFilter {
  constructor () {
    this._pts = null
    let pts = arguments[0]
    this._pts = pts
  }
  filter (geom) {
    if (geom instanceof Point || geom instanceof LineString || geom instanceof Polygon) this._pts.add(geom.getCoordinate())
  }
  interfaces_ () {
    return [GeometryFilter]
  }
  getClass () {
    return ConnectedElementPointFilter
  }
  static getCoordinates (geom) {
    var pts = new ArrayList()
    geom.apply(new ConnectedElementPointFilter(pts))
    return pts
  }
}
