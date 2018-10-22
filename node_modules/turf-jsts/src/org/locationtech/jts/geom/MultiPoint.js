import Geometry from './Geometry'
import GeometryCollection from './GeometryCollection'
import Dimension from './Dimension'
import Puntal from './Puntal'

export default class MultiPoint extends GeometryCollection {
  getSortIndex () {
    return Geometry.SORTINDEX_MULTIPOINT
  }
  isValid () {
    return true
  }
  equalsExact () {
    if (arguments.length === 2) {
      const other = arguments[0]
      const tolerance = arguments[1]
      if (!this.isEquivalentClass(other)) {
        return false
      }
      return GeometryCollection.prototype.equalsExact.call(this, other, tolerance)
    } else return GeometryCollection.prototype.equalsExact.apply(this, arguments)
  }
  getCoordinate () {
    if (arguments.length === 1) {
      const n = arguments[0]
      return this._geometries[n].getCoordinate()
    } else return GeometryCollection.prototype.getCoordinate.apply(this, arguments)
  }
  getBoundaryDimension () {
    return Dimension.FALSE
  }
  getDimension () {
    return 0
  }
  getBoundary () {
    return this.getFactory().createGeometryCollection(null)
  }
  getGeometryType () {
    return 'MultiPoint'
  }
  copy () {
    const points = new Array(this._geometries.length).fill(null)
    for (let i = 0; i < points.length; i++) {
      points[i] = this._geometries[i].copy()
    }
    return new MultiPoint(points, this._factory)
  }
  interfaces_ () {
    return [Puntal]
  }
  getClass () {
    return MultiPoint
  }
  static get serialVersionUID () { return -8048474874175355449 }
}
