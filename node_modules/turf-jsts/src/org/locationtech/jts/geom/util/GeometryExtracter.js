import GeometryCollection from '../GeometryCollection'
import ArrayList from '../../../../../java/util/ArrayList'
import GeometryFilter from '../GeometryFilter'

export default class GeometryExtracter {
  constructor (sortIndex, comps) {
    this._sortIndex = (sortIndex !== undefined) ? sortIndex : -1
    this._comps = comps || null
  }
  filter (geom) {
    if (this._sortIndex === -1 || geom.getSortIndex() === this._sortIndex) this._comps.add(geom)
  }
  interfaces_ () {
    return [GeometryFilter]
  }
  getClass () {
    return GeometryExtracter
  }
  static extract () {
    if (arguments.length === 2) {
      const geom = arguments[0]
      const sortIndex = arguments[1]
      return GeometryExtracter.extract(geom, sortIndex, new ArrayList())
    } else if (arguments.length === 3) {
      const geom = arguments[0]
      const sortIndex = arguments[1]
      const list = arguments[2]
      if (geom.getSortIndex() === sortIndex) {
        list.add(geom)
      } else if (geom instanceof GeometryCollection) {
        geom.apply(new GeometryExtracter(sortIndex, list))
      }
      return list
    }
  }
}
