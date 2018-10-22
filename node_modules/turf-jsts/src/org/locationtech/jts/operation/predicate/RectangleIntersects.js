import Coordinate from '../../geom/Coordinate'
import Polygon from '../../geom/Polygon'
import RectangleLineIntersector from '../../algorithm/RectangleLineIntersector'
import ShortCircuitedGeometryVisitor from '../../geom/util/ShortCircuitedGeometryVisitor'
import SimplePointInAreaLocator from '../../algorithm/locate/SimplePointInAreaLocator'
import LinearComponentExtracter from '../../geom/util/LinearComponentExtracter'

export default class RectangleIntersects {
  constructor (rectangle) {
    this._rectangle = null
    this._rectEnv = null
    this._rectangle = rectangle
    this._rectEnv = rectangle.getEnvelopeInternal()
  }
  intersects (geom) {
    if (!this._rectEnv.intersects(geom.getEnvelopeInternal())) return false
    var visitor = new EnvelopeIntersectsVisitor(this._rectEnv)
    visitor.applyTo(geom)
    if (visitor.intersects()) return true
    var ecpVisitor = new GeometryContainsPointVisitor(this._rectangle)
    ecpVisitor.applyTo(geom)
    if (ecpVisitor.containsPoint()) return true
    var riVisitor = new RectangleIntersectsSegmentVisitor(this._rectangle)
    riVisitor.applyTo(geom)
    if (riVisitor.intersects()) return true
    return false
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return RectangleIntersects
  }
  static intersects (rectangle, b) {
    var rp = new RectangleIntersects(rectangle)
    return rp.intersects(b)
  }
}

class EnvelopeIntersectsVisitor extends ShortCircuitedGeometryVisitor {
  constructor (rectEnv) {
    super()
    this._rectEnv = null
    this._intersects = false
    this._rectEnv = rectEnv
  }
  isDone () {
    return this._intersects === true
  }
  visit (element) {
    var elementEnv = element.getEnvelopeInternal()
    if (!this._rectEnv.intersects(elementEnv)) {
      return null
    }
    if (this._rectEnv.contains(elementEnv)) {
      this._intersects = true
      return null
    }
    if (elementEnv.getMinX() >= this._rectEnv.getMinX() && elementEnv.getMaxX() <= this._rectEnv.getMaxX()) {
      this._intersects = true
      return null
    }
    if (elementEnv.getMinY() >= this._rectEnv.getMinY() && elementEnv.getMaxY() <= this._rectEnv.getMaxY()) {
      this._intersects = true
      return null
    }
  }
  intersects () {
    return this._intersects
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return EnvelopeIntersectsVisitor
  }
}

class GeometryContainsPointVisitor extends ShortCircuitedGeometryVisitor {
  constructor (rectangle) {
    super()
    this._containsPoint = false
    this._rectSeq = rectangle.getExteriorRing().getCoordinateSequence() || null
    this._rectEnv = rectangle.getEnvelopeInternal() || null
  }
  isDone () {
    return this._containsPoint === true
  }
  visit (geom) {
    if (!(geom instanceof Polygon)) return null
    var elementEnv = geom.getEnvelopeInternal()
    if (!this._rectEnv.intersects(elementEnv)) return null
    var rectPt = new Coordinate()
    for (var i = 0; i < 4; i++) {
      this._rectSeq.getCoordinate(i, rectPt)
      if (!elementEnv.contains(rectPt)) continue
      if (SimplePointInAreaLocator.containsPointInPolygon(rectPt, geom)) {
        this._containsPoint = true
        return null
      }
    }
  }
  containsPoint () {
    return this._containsPoint
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return GeometryContainsPointVisitor
  }
}

class RectangleIntersectsSegmentVisitor extends ShortCircuitedGeometryVisitor {
  constructor (rectangle) {
    super()
    this._p0 = new Coordinate()
    this._p1 = new Coordinate()
    this._rectEnv = rectangle.getEnvelopeInternal() || null
    this._rectIntersector = new RectangleLineIntersector(this._rectEnv) || false
  }
  intersects () {
    return this._hasIntersection
  }
  isDone () {
    return this._hasIntersection === true
  }
  visit (geom) {
    var elementEnv = geom.getEnvelopeInternal()
    if (!this._rectEnv.intersects(elementEnv)) return null
    var lines = LinearComponentExtracter.getLines(geom)
    this.checkIntersectionWithLineStrings(lines)
  }
  checkIntersectionWithLineStrings (lines) {
    for (var i = lines.iterator(); i.hasNext();) {
      var testLine = i.next()
      this.checkIntersectionWithSegments(testLine)
      if (this._hasIntersection) return null
    }
  }
  checkIntersectionWithSegments (testLine) {
    var seq1 = testLine.getCoordinateSequence()
    for (var j = 1; j < seq1.size(); j++) {
      seq1.getCoordinate(j - 1, this._p0)
      seq1.getCoordinate(j, this._p1)
      if (this._rectIntersector.intersects(this._p0, this._p1)) {
        this._hasIntersection = true
        return null
      }
    }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return RectangleIntersectsSegmentVisitor
  }
}
