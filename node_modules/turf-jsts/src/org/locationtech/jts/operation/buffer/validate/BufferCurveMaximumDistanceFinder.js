import DistanceToPointFinder from './DistanceToPointFinder'
import CoordinateFilter from '../../../geom/CoordinateFilter'
import Coordinate from '../../../geom/Coordinate'
import PointPairDistance from './PointPairDistance'
import CoordinateSequenceFilter from '../../../geom/CoordinateSequenceFilter'

export default class BufferCurveMaximumDistanceFinder {
  constructor (inputGeom) {
    this._maxPtDist = new PointPairDistance()
    this._inputGeom = inputGeom || null
  }
  computeMaxMidpointDistance (curve) {
    var distFilter = new MaxMidpointDistanceFilter(this._inputGeom)
    curve.apply(distFilter)
    this._maxPtDist.setMaximum(distFilter.getMaxPointDistance())
  }
  computeMaxVertexDistance (curve) {
    var distFilter = new MaxPointDistanceFilter(this._inputGeom)
    curve.apply(distFilter)
    this._maxPtDist.setMaximum(distFilter.getMaxPointDistance())
  }
  findDistance (bufferCurve) {
    this.computeMaxVertexDistance(bufferCurve)
    this.computeMaxMidpointDistance(bufferCurve)
    return this._maxPtDist.getDistance()
  }
  getDistancePoints () {
    return this._maxPtDist
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return BufferCurveMaximumDistanceFinder
  }
  static get MaxPointDistanceFilter () { return MaxPointDistanceFilter }
  static get MaxMidpointDistanceFilter () { return MaxMidpointDistanceFilter }
}

class MaxPointDistanceFilter {
  constructor (geom) {
    this._maxPtDist = new PointPairDistance()
    this._minPtDist = new PointPairDistance()
    this._geom = geom || null
  }
  filter (pt) {
    this._minPtDist.initialize()
    DistanceToPointFinder.computeDistance(this._geom, pt, this._minPtDist)
    this._maxPtDist.setMaximum(this._minPtDist)
  }
  getMaxPointDistance () {
    return this._maxPtDist
  }
  interfaces_ () {
    return [CoordinateFilter]
  }
  getClass () {
    return MaxPointDistanceFilter
  }
}

class MaxMidpointDistanceFilter {
  constructor (geom) {
    this._maxPtDist = new PointPairDistance()
    this._minPtDist = new PointPairDistance()
    this._geom = geom || null
  }
  filter (seq, index) {
    if (index === 0) return null
    var p0 = seq.getCoordinate(index - 1)
    var p1 = seq.getCoordinate(index)
    var midPt = new Coordinate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2)
    this._minPtDist.initialize()
    DistanceToPointFinder.computeDistance(this._geom, midPt, this._minPtDist)
    this._maxPtDist.setMaximum(this._minPtDist)
  }
  isDone () {
    return false
  }
  isGeometryChanged () {
    return false
  }
  getMaxPointDistance () {
    return this._maxPtDist
  }
  interfaces_ () {
    return [CoordinateSequenceFilter]
  }
  getClass () {
    return MaxMidpointDistanceFilter
  }
}
