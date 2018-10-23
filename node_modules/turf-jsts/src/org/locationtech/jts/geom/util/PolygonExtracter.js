import Polygon from '../Polygon'
import GeometryCollection from '../GeometryCollection'
import ArrayList from '../../../../../java/util/ArrayList'
import GeometryFilter from '../GeometryFilter'

export default class PolygonExtracter {
  constructor (comps) {
    this._comps = comps || null
  }
  filter (geom) {
    if (geom instanceof Polygon) this._comps.add(geom)
  }
  interfaces_ () {
    return [GeometryFilter]
  }
  getClass () {
    return PolygonExtracter
  }
  static getPolygons () {
    if (arguments.length === 1) {
      const geom = arguments[0]
      return PolygonExtracter.getPolygons(geom, new ArrayList())
    } else if (arguments.length === 2) {
      const geom = arguments[0]
      const list = arguments[1]
      if (geom instanceof Polygon) {
        list.add(geom)
      } else if (geom instanceof GeometryCollection) {
        geom.apply(new PolygonExtracter(list))
      }
      return list
    }
  }
}
