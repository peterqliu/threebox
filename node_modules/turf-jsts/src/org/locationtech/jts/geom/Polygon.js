import CGAlgorithms from '../algorithm/CGAlgorithms'
import Geometry from './Geometry'
import Arrays from '../../../../java/util/Arrays'
import CoordinateFilter from './CoordinateFilter'
import hasInterface from '../../../../hasInterface'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import System from '../../../../java/lang/System'
import GeometryComponentFilter from './GeometryComponentFilter'
import CoordinateArrays from './CoordinateArrays'
import Polygonal from './Polygonal'
import GeometryFilter from './GeometryFilter'
import CoordinateSequenceFilter from './CoordinateSequenceFilter'

export default class Polygon extends Geometry {
  constructor (shell, holes, factory) {
    super(factory)
    this._shell = null
    this._holes = null
    if (shell === null) {
      shell = this.getFactory().createLinearRing()
    }
    if (holes === null) {
      holes = []
    }
    if (Geometry.hasNullElements(holes)) {
      throw new IllegalArgumentException('holes must not contain null elements')
    }
    if (shell.isEmpty() && Geometry.hasNonEmptyElements(holes)) {
      throw new IllegalArgumentException('shell is empty but holes are not')
    }
    this._shell = shell
    this._holes = holes
  }
  computeEnvelopeInternal () {
    return this._shell.getEnvelopeInternal()
  }
  getSortIndex () {
    return Geometry.SORTINDEX_POLYGON
  }
  getCoordinates () {
    if (this.isEmpty()) {
      return []
    }
    var coordinates = new Array(this.getNumPoints()).fill(null)
    var k = -1
    var shellCoordinates = this._shell.getCoordinates()
    for (var x = 0; x < shellCoordinates.length; x++) {
      k++
      coordinates[k] = shellCoordinates[x]
    }
    for (var i = 0; i < this._holes.length; i++) {
      var childCoordinates = this._holes[i].getCoordinates()
      for (var j = 0; j < childCoordinates.length; j++) {
        k++
        coordinates[k] = childCoordinates[j]
      }
    }
    return coordinates
  }
  getArea () {
    var area = 0.0
    area += Math.abs(CGAlgorithms.signedArea(this._shell.getCoordinateSequence()))
    for (var i = 0; i < this._holes.length; i++) {
      area -= Math.abs(CGAlgorithms.signedArea(this._holes[i].getCoordinateSequence()))
    }
    return area
  }
  isRectangle () {
    if (this.getNumInteriorRing() !== 0) return false
    if (this._shell === null) return false
    if (this._shell.getNumPoints() !== 5) return false
    const seq = this._shell.getCoordinateSequence()
    const env = this.getEnvelopeInternal()
    for (let i = 0; i < 5; i++) {
      const x = seq.getX(i)
      if (!(x === env.getMinX() || x === env.getMaxX())) return false
      const y = seq.getY(i)
      if (!(y === env.getMinY() || y === env.getMaxY())) return false
    }
    let prevX = seq.getX(0)
    let prevY = seq.getY(0)
    for (let i = 1; i <= 4; i++) {
      const x = seq.getX(i)
      const y = seq.getY(i)
      const xChanged = x !== prevX
      const yChanged = y !== prevY
      if (xChanged === yChanged) return false
      prevX = x
      prevY = y
    }
    return true
  }
  equalsExact () {
    if (arguments.length === 2) {
      const other = arguments[0]
      const tolerance = arguments[1]
      if (!this.isEquivalentClass(other)) {
        return false
      }
      const otherPolygon = other
      const thisShell = this._shell
      const otherPolygonShell = otherPolygon._shell
      if (!thisShell.equalsExact(otherPolygonShell, tolerance)) {
        return false
      }
      if (this._holes.length !== otherPolygon._holes.length) {
        return false
      }
      for (let i = 0; i < this._holes.length; i++) {
        if (!this._holes[i].equalsExact(otherPolygon._holes[i], tolerance)) {
          return false
        }
      }
      return true
    } else return Geometry.prototype.equalsExact.apply(this, arguments)
  }
  normalize () {
    if (arguments.length === 0) {
      this.normalize(this._shell, true)
      for (let i = 0; i < this._holes.length; i++) {
        this.normalize(this._holes[i], false)
      }
      Arrays.sort(this._holes)
    } else if (arguments.length === 2) {
      const ring = arguments[0]
      const clockwise = arguments[1]
      if (ring.isEmpty()) {
        return null
      }
      const uniqueCoordinates = new Array(ring.getCoordinates().length - 1).fill(null)
      System.arraycopy(ring.getCoordinates(), 0, uniqueCoordinates, 0, uniqueCoordinates.length)
      const minCoordinate = CoordinateArrays.minCoordinate(ring.getCoordinates())
      CoordinateArrays.scroll(uniqueCoordinates, minCoordinate)
      System.arraycopy(uniqueCoordinates, 0, ring.getCoordinates(), 0, uniqueCoordinates.length)
      ring.getCoordinates()[uniqueCoordinates.length] = uniqueCoordinates[0]
      if (CGAlgorithms.isCCW(ring.getCoordinates()) === clockwise) {
        CoordinateArrays.reverse(ring.getCoordinates())
      }
    }
  }
  getCoordinate () {
    return this._shell.getCoordinate()
  }
  getNumInteriorRing () {
    return this._holes.length
  }
  getBoundaryDimension () {
    return 1
  }
  getDimension () {
    return 2
  }
  getLength () {
    let len = 0.0
    len += this._shell.getLength()
    for (let i = 0; i < this._holes.length; i++) {
      len += this._holes[i].getLength()
    }
    return len
  }
  getNumPoints () {
    let numPoints = this._shell.getNumPoints()
    for (let i = 0; i < this._holes.length; i++) {
      numPoints += this._holes[i].getNumPoints()
    }
    return numPoints
  }
  reverse () {
    const poly = this.copy()
    poly._shell = this._shell.copy().reverse()
    poly._holes = new Array(this._holes.length).fill(null)
    for (let i = 0; i < this._holes.length; i++) {
      poly._holes[i] = this._holes[i].copy().reverse()
    }
    return poly
  }
  convexHull () {
    return this.getExteriorRing().convexHull()
  }
  compareToSameClass () {
    if (arguments.length === 1) {
      const o = arguments[0]
      const thisShell = this._shell
      const otherShell = o._shell
      return thisShell.compareToSameClass(otherShell)
    } else if (arguments.length === 2) {
      const o = arguments[0]
      const comp = arguments[1]
      const poly = o
      const thisShell = this._shell
      const otherShell = poly._shell
      const shellComp = thisShell.compareToSameClass(otherShell, comp)
      if (shellComp !== 0) return shellComp
      const nHole1 = this.getNumInteriorRing()
      const nHole2 = poly.getNumInteriorRing()
      let i = 0
      while (i < nHole1 && i < nHole2) {
        const thisHole = this.getInteriorRingN(i)
        const otherHole = poly.getInteriorRingN(i)
        const holeComp = thisHole.compareToSameClass(otherHole, comp)
        if (holeComp !== 0) return holeComp
        i++
      }
      if (i < nHole1) return 1
      if (i < nHole2) return -1
      return 0
    }
  }
  apply (filter) {
    if (hasInterface(filter, CoordinateFilter)) {
      this._shell.apply(filter)
      for (let i = 0; i < this._holes.length; i++) {
        this._holes[i].apply(filter)
      }
    } else if (hasInterface(filter, CoordinateSequenceFilter)) {
      this._shell.apply(filter)
      if (!filter.isDone()) {
        for (let i = 0; i < this._holes.length; i++) {
          this._holes[i].apply(filter)
          if (filter.isDone()) break
        }
      }
      if (filter.isGeometryChanged()) this.geometryChanged()
    } else if (hasInterface(filter, GeometryFilter)) {
      filter.filter(this)
    } else if (hasInterface(filter, GeometryComponentFilter)) {
      filter.filter(this)
      this._shell.apply(filter)
      for (var i = 0; i < this._holes.length; i++) {
        this._holes[i].apply(filter)
      }
    }
  }
  getBoundary () {
    if (this.isEmpty()) {
      return this.getFactory().createMultiLineString()
    }
    const rings = new Array(this._holes.length + 1).fill(null)
    rings[0] = this._shell
    for (let i = 0; i < this._holes.length; i++) {
      rings[i + 1] = this._holes[i]
    }
    if (rings.length <= 1) return this.getFactory().createLinearRing(rings[0].getCoordinateSequence())
    return this.getFactory().createMultiLineString(rings)
  }
  clone () {
    const poly = Geometry.prototype.clone.call(this)
    poly._shell = this._shell.clone()
    poly._holes = new Array(this._holes.length).fill(null)
    for (let i = 0; i < this._holes.length; i++) {
      poly._holes[i] = this._holes[i].clone()
    }
    return poly
  }
  getGeometryType () {
    return 'Polygon'
  }
  copy () {
    const shell = this._shell.copy()
    const holes = new Array(this._holes.length).fill(null)
    for (let i = 0; i < holes.length; i++) {
      holes[i] = this._holes[i].copy()
    }
    return new Polygon(shell, holes, this._factory)
  }
  getExteriorRing () {
    return this._shell
  }
  isEmpty () {
    return this._shell.isEmpty()
  }
  getInteriorRingN (n) {
    return this._holes[n]
  }
  interfaces_ () {
    return [Polygonal]
  }
  getClass () {
    return Polygon
  }
  static get serialVersionUID () { return -3494792200821764533 }
}
