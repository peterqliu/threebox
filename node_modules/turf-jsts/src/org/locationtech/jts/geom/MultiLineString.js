import Geometry from './Geometry'
import { BoundaryOp } from '../operation/boundary'
import Lineal from './Lineal'
import GeometryCollection from './GeometryCollection'
import Dimension from './Dimension'

export default class MultiLineString extends GeometryCollection {
  getSortIndex () {
    return Geometry.SORTINDEX_MULTILINESTRING
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
    if (this.isClosed()) {
      return Dimension.FALSE
    }
    return 0
  }
  isClosed () {
    if (this.isEmpty()) {
      return false
    }
    for (var i = 0; i < this._geometries.length; i++) {
      if (!this._geometries[i].isClosed()) {
        return false
      }
    }
    return true
  }
  getDimension () {
    return 1
  }
  reverse () {
    var nLines = this._geometries.length
    var revLines = new Array(nLines).fill(null)
    for (var i = 0; i < this._geometries.length; i++) {
      revLines[nLines - 1 - i] = this._geometries[i].reverse()
    }
    return this.getFactory().createMultiLineString(revLines)
  }
  getBoundary () {
    return new BoundaryOp(this).getBoundary()
  }
  getGeometryType () {
    return 'MultiLineString'
  }
  copy () {
    var lineStrings = new Array(this._geometries.length).fill(null)
    for (var i = 0; i < lineStrings.length; i++) {
      lineStrings[i] = this._geometries[i].copy()
    }
    return new MultiLineString(lineStrings, this._factory)
  }
  interfaces_ () {
    return [Lineal]
  }
  getClass () {
    return MultiLineString
  }
  static get serialVersionUID () { return 8166665132445433741 }
}
