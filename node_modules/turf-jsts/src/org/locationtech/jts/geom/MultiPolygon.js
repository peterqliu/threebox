import Geometry from './Geometry'
import GeometryCollection from './GeometryCollection'
import Polygonal from './Polygonal'
import ArrayList from '../../../../java/util/ArrayList'

export default class MultiPolygon extends GeometryCollection {
  getSortIndex () {
    return Geometry.SORTINDEX_MULTIPOLYGON
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
  getBoundaryDimension () {
    return 1
  }
  getDimension () {
    return 2
  }
  reverse () {
    const n = this._geometries.length
    const revGeoms = new Array(n).fill(null)
    for (let i = 0; i < this._geometries.length; i++) {
      revGeoms[i] = this._geometries[i].reverse()
    }
    return this.getFactory().createMultiPolygon(revGeoms)
  }
  getBoundary () {
    if (this.isEmpty()) {
      return this.getFactory().createMultiLineString()
    }
    const allRings = new ArrayList()
    for (let i = 0; i < this._geometries.length; i++) {
      const polygon = this._geometries[i]
      const rings = polygon.getBoundary()
      for (let j = 0; j < rings.getNumGeometries(); j++) {
        allRings.add(rings.getGeometryN(j))
      }
    }
    const allRingsArray = new Array(allRings.size()).fill(null)
    return this.getFactory().createMultiLineString(allRings.toArray(allRingsArray))
  }
  getGeometryType () {
    return 'MultiPolygon'
  }
  copy () {
    const polygons = new Array(this._geometries.length).fill(null)
    for (let i = 0; i < polygons.length; i++) {
      polygons[i] = this._geometries[i].copy()
    }
    return new MultiPolygon(polygons, this._factory)
  }
  interfaces_ () {
    return [Polygonal]
  }
  getClass () {
    return MultiPolygon
  }
  static get serialVersionUID () { return -551033529766975875 }
}
