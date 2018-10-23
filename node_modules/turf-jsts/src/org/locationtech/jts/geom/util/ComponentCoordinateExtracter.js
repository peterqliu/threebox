import LineString from '../LineString'
import Point from '../Point'
import GeometryComponentFilter from '../GeometryComponentFilter'
import ArrayList from '../../../../../java/util/ArrayList'

export default class ComponentCoordinateExtracter {
  constructor (coords) {
    this._coords = coords
  }
  filter (geom) {
    if (geom instanceof LineString || geom instanceof Point) this._coords.add(geom.getCoordinate())
  }
  interfaces_ () {
    return [GeometryComponentFilter]
  }
  getClass () {
    return ComponentCoordinateExtracter
  }
  static getCoordinates (geom) {
    var coords = new ArrayList()
    geom.apply(new ComponentCoordinateExtracter(coords))
    return coords
  }
}
