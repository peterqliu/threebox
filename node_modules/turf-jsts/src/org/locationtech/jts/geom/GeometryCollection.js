import TreeSet from '../../../../java/util/TreeSet'
import Geometry from './Geometry'
import Arrays from '../../../../java/util/Arrays'
import CoordinateFilter from './CoordinateFilter'
import hasInterface from '../../../../hasInterface'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import GeometryComponentFilter from './GeometryComponentFilter'
import Dimension from './Dimension'
import GeometryFilter from './GeometryFilter'
import CoordinateSequenceFilter from './CoordinateSequenceFilter'
import Envelope from './Envelope'
import Assert from '../util/Assert'

export default class GeometryCollection extends Geometry {
  constructor (geometries, factory) {
    super(factory)
    this._geometries = geometries || []

    if (Geometry.hasNullElements(this._geometries)) {
      throw new IllegalArgumentException('geometries must not contain null elements')
    }
  }
  computeEnvelopeInternal () {
    var envelope = new Envelope()
    for (var i = 0; i < this._geometries.length; i++) {
      envelope.expandToInclude(this._geometries[i].getEnvelopeInternal())
    }
    return envelope
  }
  getGeometryN (n) {
    return this._geometries[n]
  }
  getSortIndex () {
    return Geometry.SORTINDEX_GEOMETRYCOLLECTION
  }
  getCoordinates () {
    var coordinates = new Array(this.getNumPoints()).fill(null)
    var k = -1
    for (var i = 0; i < this._geometries.length; i++) {
      var childCoordinates = this._geometries[i].getCoordinates()
      for (var j = 0; j < childCoordinates.length; j++) {
        k++
        coordinates[k] = childCoordinates[j]
      }
    }
    return coordinates
  }
  getArea () {
    var area = 0.0
    for (var i = 0; i < this._geometries.length; i++) {
      area += this._geometries[i].getArea()
    }
    return area
  }
  equalsExact () {
    if (arguments.length === 2) {
      const other = arguments[0]
      const tolerance = arguments[1]
      if (!this.isEquivalentClass(other)) {
        return false
      }
      var otherCollection = other
      if (this._geometries.length !== otherCollection._geometries.length) {
        return false
      }
      for (var i = 0; i < this._geometries.length; i++) {
        if (!this._geometries[i].equalsExact(otherCollection._geometries[i], tolerance)) {
          return false
        }
      }
      return true
    } else return Geometry.prototype.equalsExact.apply(this, arguments)
  }
  normalize () {
    for (var i = 0; i < this._geometries.length; i++) {
      this._geometries[i].normalize()
    }
    Arrays.sort(this._geometries)
  }
  getCoordinate () {
    if (this.isEmpty()) return null
    return this._geometries[0].getCoordinate()
  }
  getBoundaryDimension () {
    var dimension = Dimension.FALSE
    for (var i = 0; i < this._geometries.length; i++) {
      dimension = Math.max(dimension, this._geometries[i].getBoundaryDimension())
    }
    return dimension
  }
  getDimension () {
    var dimension = Dimension.FALSE
    for (var i = 0; i < this._geometries.length; i++) {
      dimension = Math.max(dimension, this._geometries[i].getDimension())
    }
    return dimension
  }
  getLength () {
    var sum = 0.0
    for (var i = 0; i < this._geometries.length; i++) {
      sum += this._geometries[i].getLength()
    }
    return sum
  }
  getNumPoints () {
    var numPoints = 0
    for (var i = 0; i < this._geometries.length; i++) {
      numPoints += this._geometries[i].getNumPoints()
    }
    return numPoints
  }
  getNumGeometries () {
    return this._geometries.length
  }
  reverse () {
    var n = this._geometries.length
    var revGeoms = new Array(n).fill(null)
    for (var i = 0; i < this._geometries.length; i++) {
      revGeoms[i] = this._geometries[i].reverse()
    }
    return this.getFactory().createGeometryCollection(revGeoms)
  }
  compareToSameClass () {
    if (arguments.length === 1) {
      const o = arguments[0]
      const theseElements = new TreeSet(Arrays.asList(this._geometries))
      const otherElements = new TreeSet(Arrays.asList(o._geometries))
      return this.compare(theseElements, otherElements)
    } else if (arguments.length === 2) {
      const o = arguments[0]
      const comp = arguments[1]
      const gc = o
      const n1 = this.getNumGeometries()
      const n2 = gc.getNumGeometries()
      let i = 0
      while (i < n1 && i < n2) {
        const thisGeom = this.getGeometryN(i)
        const otherGeom = gc.getGeometryN(i)
        const holeComp = thisGeom.compareToSameClass(otherGeom, comp)
        if (holeComp !== 0) return holeComp
        i++
      }
      if (i < n1) return 1
      if (i < n2) return -1
      return 0
    }
  }
  apply () {
    if (hasInterface(arguments[0], CoordinateFilter)) {
      const filter = arguments[0]
      for (let i = 0; i < this._geometries.length; i++) {
        this._geometries[i].apply(filter)
      }
    } else if (hasInterface(arguments[0], CoordinateSequenceFilter)) {
      const filter = arguments[0]
      if (this._geometries.length === 0) return null
      for (let i = 0; i < this._geometries.length; i++) {
        this._geometries[i].apply(filter)
        if (filter.isDone()) {
          break
        }
      }
      if (filter.isGeometryChanged()) this.geometryChanged()
    } else if (hasInterface(arguments[0], GeometryFilter)) {
      const filter = arguments[0]
      filter.filter(this)
      for (let i = 0; i < this._geometries.length; i++) {
        this._geometries[i].apply(filter)
      }
    } else if (hasInterface(arguments[0], GeometryComponentFilter)) {
      let filter = arguments[0]
      filter.filter(this)
      for (let i = 0; i < this._geometries.length; i++) {
        this._geometries[i].apply(filter)
      }
    }
  }
  getBoundary () {
    this.checkNotGeometryCollection(this)
    Assert.shouldNeverReachHere()
    return null
  }
  clone () {
    var gc = Geometry.prototype.clone.call(this)
    gc._geometries = new Array(this._geometries.length).fill(null)
    for (var i = 0; i < this._geometries.length; i++) {
      gc._geometries[i] = this._geometries[i].clone()
    }
    return gc
  }
  getGeometryType () {
    return 'GeometryCollection'
  }
  copy () {
    var geometries = new Array(this._geometries.length).fill(null)
    for (var i = 0; i < geometries.length; i++) {
      geometries[i] = this._geometries[i].copy()
    }
    return new GeometryCollection(geometries, this._factory)
  }
  isEmpty () {
    for (let i = 0; i < this._geometries.length; i++) {
      if (!this._geometries[i].isEmpty()) {
        return false
      }
    }
    return true
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return GeometryCollection
  }
  static get serialVersionUID () { return -5694727726395021467 }
}
