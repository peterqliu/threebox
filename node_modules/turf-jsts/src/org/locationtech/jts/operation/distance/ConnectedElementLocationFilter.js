import LineString from '../../geom/LineString'
import Point from '../../geom/Point'
import Polygon from '../../geom/Polygon'
import GeometryLocation from './GeometryLocation'
import ArrayList from '../../../../../java/util/ArrayList'
import GeometryFilter from '../../geom/GeometryFilter'

export default class ConnectedElementLocationFilter {
  constructor () {
    this._locations = null
    let locations = arguments[0]
    this._locations = locations
  }
  filter (geom) {
    if (geom instanceof Point || geom instanceof LineString || geom instanceof Polygon) this._locations.add(new GeometryLocation(geom, 0, geom.getCoordinate()))
  }
  interfaces_ () {
    return [GeometryFilter]
  }
  getClass () {
    return ConnectedElementLocationFilter
  }
  static getLocations (geom) {
    var locations = new ArrayList()
    geom.apply(new ConnectedElementLocationFilter(locations))
    return locations
  }
}
