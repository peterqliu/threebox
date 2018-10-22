import CGAlgorithms from '../algorithm/CGAlgorithms'
import Geometry from './Geometry'
import CoordinateFilter from './CoordinateFilter'
import hasInterface from '../../../../hasInterface'
import { BoundaryOp } from '../operation/boundary'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import Lineal from './Lineal'
import CoordinateSequences from './CoordinateSequences'
import GeometryComponentFilter from './GeometryComponentFilter'
import Dimension from './Dimension'
import GeometryFilter from './GeometryFilter'
import CoordinateSequenceFilter from './CoordinateSequenceFilter'
import Envelope from './Envelope'

export default class LineString extends Geometry {
  constructor (points, factory) {
    super(factory)
    this._points = null
    this.init(points)
  }
  computeEnvelopeInternal () {
    if (this.isEmpty()) {
      return new Envelope()
    }
    return this._points.expandEnvelope(new Envelope())
  }
  isRing () {
    return this.isClosed() && this.isSimple()
  }
  getSortIndex () {
    return Geometry.SORTINDEX_LINESTRING
  }
  getCoordinates () {
    return this._points.toCoordinateArray()
  }
  equalsExact () {
    if (arguments.length === 2) {
      const other = arguments[0]
      const tolerance = arguments[1]
      if (!this.isEquivalentClass(other)) {
        return false
      }
      var otherLineString = other
      if (this._points.size() !== otherLineString._points.size()) {
        return false
      }
      for (var i = 0; i < this._points.size(); i++) {
        if (!this.equal(this._points.getCoordinate(i), otherLineString._points.getCoordinate(i), tolerance)) {
          return false
        }
      }
      return true
    } else return Geometry.prototype.equalsExact.apply(this, arguments)
  }
  normalize () {
    for (var i = 0; i < Math.trunc(this._points.size() / 2); i++) {
      var j = this._points.size() - 1 - i
      if (!this._points.getCoordinate(i).equals(this._points.getCoordinate(j))) {
        if (this._points.getCoordinate(i).compareTo(this._points.getCoordinate(j)) > 0) {
          CoordinateSequences.reverse(this._points)
        }
        return null
      }
    }
  }
  getCoordinate () {
    if (this.isEmpty()) return null
    return this._points.getCoordinate(0)
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
    return this.getCoordinateN(0).equals2D(this.getCoordinateN(this.getNumPoints() - 1))
  }
  getEndPoint () {
    if (this.isEmpty()) {
      return null
    }
    return this.getPointN(this.getNumPoints() - 1)
  }
  getDimension () {
    return 1
  }
  getLength () {
    return CGAlgorithms.computeLength(this._points)
  }
  getNumPoints () {
    return this._points.size()
  }
  reverse () {
    const seq = this._points.copy()
    CoordinateSequences.reverse(seq)
    const revLine = this.getFactory().createLineString(seq)
    return revLine
  }
  compareToSameClass () {
    if (arguments.length === 1) {
      const o = arguments[0]
      const line = o
      let i = 0
      let j = 0
      while (i < this._points.size() && j < line._points.size()) {
        var comparison = this._points.getCoordinate(i).compareTo(line._points.getCoordinate(j))
        if (comparison !== 0) {
          return comparison
        }
        i++
        j++
      }
      if (i < this._points.size()) {
        return 1
      }
      if (j < line._points.size()) {
        return -1
      }
      return 0
    } else if (arguments.length === 2) {
      const o = arguments[0]
      const comp = arguments[1]
      const line = o
      return comp.compare(this._points, line._points)
    }
  }
  apply () {
    if (hasInterface(arguments[0], CoordinateFilter)) {
      let filter = arguments[0]
      for (var i = 0; i < this._points.size(); i++) {
        filter.filter(this._points.getCoordinate(i))
      }
    } else if (hasInterface(arguments[0], CoordinateSequenceFilter)) {
      const filter = arguments[0]
      if (this._points.size() === 0) return null
      for (let i = 0; i < this._points.size(); i++) {
        filter.filter(this._points, i)
        if (filter.isDone()) break
      }
      if (filter.isGeometryChanged()) this.geometryChanged()
    } else if (hasInterface(arguments[0], GeometryFilter)) {
      const filter = arguments[0]
      filter.filter(this)
    } else if (hasInterface(arguments[0], GeometryComponentFilter)) {
      const filter = arguments[0]
      filter.filter(this)
    }
  }
  getBoundary () {
    return new BoundaryOp(this).getBoundary()
  }
  isEquivalentClass (other) {
    return other instanceof LineString
  }
  clone () {
    var ls = Geometry.prototype.clone.call(this)
    ls._points = this._points.clone()
    return ls
  }
  getCoordinateN (n) {
    return this._points.getCoordinate(n)
  }
  getGeometryType () {
    return 'LineString'
  }
  copy () {
    return new LineString(this._points.copy(), this._factory)
  }
  getCoordinateSequence () {
    return this._points
  }
  isEmpty () {
    return this._points.size() === 0
  }
  init (points) {
    if (points === null) {
      points = this.getFactory().getCoordinateSequenceFactory().create([])
    }
    if (points.size() === 1) {
      throw new IllegalArgumentException('Invalid number of points in LineString (found ' + points.size() + ' - must be 0 or >= 2)')
    }
    this._points = points
  }
  isCoordinate (pt) {
    for (var i = 0; i < this._points.size(); i++) {
      if (this._points.getCoordinate(i).equals(pt)) {
        return true
      }
    }
    return false
  }
  getStartPoint () {
    if (this.isEmpty()) {
      return null
    }
    return this.getPointN(0)
  }
  getPointN (n) {
    return this.getFactory().createPoint(this._points.getCoordinate(n))
  }
  interfaces_ () {
    return [Lineal]
  }
  getClass () {
    return LineString
  }
  static get serialVersionUID () { return 3110669828065365560 }
}
