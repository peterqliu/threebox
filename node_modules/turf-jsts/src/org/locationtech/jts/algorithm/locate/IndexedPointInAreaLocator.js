import hasInterface from '../../../../../hasInterface'
import IllegalArgumentException from '../../../../../java/lang/IllegalArgumentException'
import ItemVisitor from '../../index/ItemVisitor'
import PointOnGeometryLocator from './PointOnGeometryLocator'
import SortedPackedIntervalRTree from '../../index/intervalrtree/SortedPackedIntervalRTree'
import LineSegment from '../../geom/LineSegment'
import Polygonal from '../../geom/Polygonal'
import LinearComponentExtracter from '../../geom/util/LinearComponentExtracter'
import ArrayListVisitor from '../../index/ArrayListVisitor'
import RayCrossingCounter from '../RayCrossingCounter'

export default class IndexedPointInAreaLocator {
  constructor () {
    this._index = null
    const g = arguments[0]
    if (!hasInterface(g, Polygonal)) throw new IllegalArgumentException('Argument must be Polygonal')
    this._index = new IntervalIndexedGeometry(g)
  }
  locate (p) {
    var rcc = new RayCrossingCounter(p)
    var visitor = new SegmentVisitor(rcc)
    this._index.query(p.y, p.y, visitor)
    return rcc.getLocation()
  }
  interfaces_ () {
    return [PointOnGeometryLocator]
  }
  getClass () {
    return IndexedPointInAreaLocator
  }
  static get SegmentVisitor () { return SegmentVisitor }
  static get IntervalIndexedGeometry () { return IntervalIndexedGeometry }
}

class SegmentVisitor {
  constructor () {
    this._counter = null
    const counter = arguments[0]
    this._counter = counter
  }
  visitItem (item) {
    var seg = item
    this._counter.countSegment(seg.getCoordinate(0), seg.getCoordinate(1))
  }
  interfaces_ () {
    return [ItemVisitor]
  }
  getClass () {
    return SegmentVisitor
  }
}

class IntervalIndexedGeometry {
  constructor () {
    this._index = new SortedPackedIntervalRTree()
    const geom = arguments[0]
    this.init(geom)
  }
  init (geom) {
    var lines = LinearComponentExtracter.getLines(geom)
    for (var i = lines.iterator(); i.hasNext();) {
      var line = i.next()
      var pts = line.getCoordinates()
      this.addLine(pts)
    }
  }
  addLine (pts) {
    for (var i = 1; i < pts.length; i++) {
      var seg = new LineSegment(pts[i - 1], pts[i])
      var min = Math.min(seg.p0.y, seg.p1.y)
      var max = Math.max(seg.p0.y, seg.p1.y)
      this._index.insert(min, max, seg)
    }
  }
  query () {
    if (arguments.length === 2) {
      const min = arguments[0]
      const max = arguments[1]
      var visitor = new ArrayListVisitor()
      this._index.query(min, max, visitor)
      return visitor.getItems()
    } else if (arguments.length === 3) {
      const min = arguments[0]
      const max = arguments[1]
      const visitor = arguments[2]
      this._index.query(min, max, visitor)
    }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return IntervalIndexedGeometry
  }
}
