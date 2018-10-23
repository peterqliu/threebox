import Geometry from '../../geom/Geometry'
import hasInterface from '../../../../../hasInterface'
import RelateComputer from './RelateComputer'
import BoundaryNodeRule from '../../algorithm/BoundaryNodeRule'
import { GeometryGraphOp } from '../geometrygraph'
import RectangleContains from '../predicate/RectangleContains'
import RectangleIntersects from '../predicate/RectangleIntersects'

export default class RelateOp extends GeometryGraphOp {
  constructor () {
    if (arguments.length === 2) {
      const g0 = arguments[0]
      const g1 = arguments[1]
      super(g0, g1)
      this._relate = new RelateComputer(this._arg)
    } else if (arguments.length === 3) {
      const g0 = arguments[0]
      const g1 = arguments[1]
      const boundaryNodeRule = arguments[2]
      super(g0, g1, boundaryNodeRule)
      this._relate = new RelateComputer(this._arg)
    } else {
      super()
      this._relate = null
    }
  }
  getIntersectionMatrix () {
    return this._relate.computeIM()
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return RelateOp
  }
  static covers (g1, g2) {
    if (!g1.getEnvelopeInternal().covers(g2.getEnvelopeInternal())) return false
    if (g1.isRectangle()) {
      return true
    }
    return RelateOp.relate(g1, g2).isCovers()
  }
  static intersects (g1, g2) {
    if (!g1.getEnvelopeInternal().intersects(g2.getEnvelopeInternal())) return false
    if (g1.isRectangle()) {
      return RectangleIntersects.intersects(g1, g2)
    }
    if (g2.isRectangle()) {
      return RectangleIntersects.intersects(g2, g1)
    }
    return RelateOp.relate(g1, g2).isIntersects()
  }
  static touches (g1, g2) {
    if (!g1.getEnvelopeInternal().intersects(g2.getEnvelopeInternal())) return false
    return RelateOp.relate(g1, g2).isTouches(g1.getDimension(), g2.getDimension())
  }
  static within (g1, g2) {
    return g2.contains(g1)
  }
  static coveredBy (g1, g2) {
    return RelateOp.covers(g2, g1)
  }
  static relate () {
    if (arguments.length === 2) {
      const a = arguments[0]
      const b = arguments[1]
      const relOp = new RelateOp(a, b)
      const im = relOp.getIntersectionMatrix()
      return im
    } else if (arguments.length === 3) {
      if (typeof arguments[2] === 'string' && (arguments[0] instanceof Geometry && arguments[1] instanceof Geometry)) {
        const g1 = arguments[0]
        const g2 = arguments[1]
        const intersectionPattern = arguments[2]
        return RelateOp.relateWithCheck(g1, g2).matches(intersectionPattern)
      } else if (hasInterface(arguments[2], BoundaryNodeRule) && (arguments[0] instanceof Geometry && arguments[1] instanceof Geometry)) {
        const a = arguments[0]
        const b = arguments[1]
        const boundaryNodeRule = arguments[2]
        const relOp = new RelateOp(a, b, boundaryNodeRule)
        const im = relOp.getIntersectionMatrix()
        return im
      }
    }
  }
  static overlaps (g1, g2) {
    if (!g1.getEnvelopeInternal().intersects(g2.getEnvelopeInternal())) return false
    return RelateOp.relate(g1, g2).isOverlaps(g1.getDimension(), g2.getDimension())
  }
  static disjoint (g1, g2) {
    return !g1.intersects(g2)
  }
  static relateWithCheck (g1, g2) {
    g1.checkNotGeometryCollection(g1)
    g1.checkNotGeometryCollection(g2)
    return RelateOp.relate(g1, g2)
  }
  static crosses (g1, g2) {
    if (!g1.getEnvelopeInternal().intersects(g2.getEnvelopeInternal())) return false
    return RelateOp.relate(g1, g2).isCrosses(g1.getDimension(), g2.getDimension())
  }
  static contains (g1, g2) {
    if (!g1.getEnvelopeInternal().contains(g2.getEnvelopeInternal())) return false
    if (g1.isRectangle()) {
      return RectangleContains.contains(g1, g2)
    }
    return RelateOp.relate(g1, g2).isContains()
  }
}
