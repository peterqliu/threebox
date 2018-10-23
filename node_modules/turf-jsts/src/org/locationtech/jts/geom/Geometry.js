import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import GeometryComponentFilter from './GeometryComponentFilter'
import Comparable from '../../../../java/lang/Comparable'
import Cloneable from '../../../../java/lang/Cloneable'
import Serializable from '../../../../java/io/Serializable'
import Envelope from './Envelope'

export default class Geometry {
  constructor () {
    const factory = arguments[0]

    this._envelope = null
    this._factory = null
    this._SRID = null
    this._userData = null
    this._factory = factory
    this._SRID = factory.getSRID()
  }
  isGeometryCollection () {
    return this.getSortIndex() === Geometry.SORTINDEX_GEOMETRYCOLLECTION
  }
  getFactory () {
    return this._factory
  }
  getGeometryN (n) {
    return this
  }
  getArea () {
    return 0.0
  }
  isRectangle () {
    return false
  }
  equals () {
    if (arguments[0] instanceof Geometry) {
      let g = arguments[0]
      if (g === null) return false
      return this.equalsTopo(g)
    } else if (arguments[0] instanceof Object) {
      let o = arguments[0]
      if (!(o instanceof Geometry)) return false
      var g = o
      return this.equalsExact(g)
    }
  }
  equalsExact (other) {
    return this === other || this.equalsExact(other, 0)
  }
  geometryChanged () {
    this.apply(Geometry.geometryChangedFilter)
  }
  geometryChangedAction () {
    this._envelope = null
  }
  equalsNorm (g) {
    if (g === null) return false
    return this.norm().equalsExact(g.norm())
  }
  getLength () {
    return 0.0
  }
  getNumGeometries () {
    return 1
  }
  compareTo () {
    if (arguments.length === 1) {
      let o = arguments[0]
      var other = o
      if (this.getSortIndex() !== other.getSortIndex()) {
        return this.getSortIndex() - other.getSortIndex()
      }
      if (this.isEmpty() && other.isEmpty()) {
        return 0
      }
      if (this.isEmpty()) {
        return -1
      }
      if (other.isEmpty()) {
        return 1
      }
      return this.compareToSameClass(o)
    } else if (arguments.length === 2) {
      const other = arguments[0]
      const comp = arguments[1]
      if (this.getSortIndex() !== other.getSortIndex()) {
        return this.getSortIndex() - other.getSortIndex()
      }
      if (this.isEmpty() && other.isEmpty()) {
        return 0
      }
      if (this.isEmpty()) {
        return -1
      }
      if (other.isEmpty()) {
        return 1
      }
      return this.compareToSameClass(other, comp)
    }
  }
  getUserData () {
    return this._userData
  }
  getSRID () {
    return this._SRID
  }
  getEnvelope () {
    return this.getFactory().toGeometry(this.getEnvelopeInternal())
  }
  checkNotGeometryCollection (g) {
    if (g.getSortIndex() === Geometry.SORTINDEX_GEOMETRYCOLLECTION) {
      throw new IllegalArgumentException('This method does not support GeometryCollection arguments')
    }
  }
  equal (a, b, tolerance) {
    if (tolerance === 0) {
      return a.equals(b)
    }
    return a.distance(b) <= tolerance
  }
  norm () {
    var copy = this.copy()
    copy.normalize()
    return copy
  }
  getPrecisionModel () {
    return this._factory.getPrecisionModel()
  }
  getEnvelopeInternal () {
    if (this._envelope === null) {
      this._envelope = this.computeEnvelopeInternal()
    }
    return new Envelope(this._envelope)
  }
  setSRID (SRID) {
    this._SRID = SRID
  }
  setUserData (userData) {
    this._userData = userData
  }
  compare (a, b) {
    const i = a.iterator()
    const j = b.iterator()
    while (i.hasNext() && j.hasNext()) {
      const aElement = i.next()
      const bElement = j.next()
      const comparison = aElement.compareTo(bElement)
      if (comparison !== 0) {
        return comparison
      }
    }
    if (i.hasNext()) {
      return 1
    }
    if (j.hasNext()) {
      return -1
    }
    return 0
  }
  hashCode () {
    return this.getEnvelopeInternal().hashCode()
  }
  isGeometryCollectionOrDerived () {
    if (this.getSortIndex() === Geometry.SORTINDEX_GEOMETRYCOLLECTION || this.getSortIndex() === Geometry.SORTINDEX_MULTIPOINT || this.getSortIndex() === Geometry.SORTINDEX_MULTILINESTRING || this.getSortIndex() === Geometry.SORTINDEX_MULTIPOLYGON) {
      return true
    }
    return false
  }
  interfaces_ () {
    return [Cloneable, Comparable, Serializable]
  }
  getClass () {
    return Geometry
  }
  static hasNonEmptyElements (geometries) {
    for (var i = 0; i < geometries.length; i++) {
      if (!geometries[i].isEmpty()) {
        return true
      }
    }
    return false
  }
  static hasNullElements (array) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === null) {
        return true
      }
    }
    return false
  }
  static get serialVersionUID () { return 8763622679187376702 }
  static get SORTINDEX_POINT () { return 0 }
  static get SORTINDEX_MULTIPOINT () { return 1 }
  static get SORTINDEX_LINESTRING () { return 2 }
  static get SORTINDEX_LINEARRING () { return 3 }
  static get SORTINDEX_MULTILINESTRING () { return 4 }
  static get SORTINDEX_POLYGON () { return 5 }
  static get SORTINDEX_MULTIPOLYGON () { return 6 }
  static get SORTINDEX_GEOMETRYCOLLECTION () { return 7 }
  static get geometryChangedFilter () { return geometryChangedFilter }
}

class geometryChangedFilter {
  static interfaces_ () {
    return [GeometryComponentFilter]
  }
  static filter (geom) {
    geom.geometryChangedAction()
  }
}
