import CGAlgorithms from '../algorithm/CGAlgorithms'
import CoordinateFilter from '../geom/CoordinateFilter'
import Coordinate from '../geom/Coordinate'
import Double from '../../../../java/lang/Double'
import LineSegment from '../geom/LineSegment'
import CoordinateSequenceFilter from '../geom/CoordinateSequenceFilter'

export default class SimpleMinimumClearance {
  constructor () {
    this._inputGeom = null
    this._minClearance = null
    this._minClearancePts = null
    const geom = arguments[0]
    this._inputGeom = geom
  }
  getLine () {
    this.compute()
    return this._inputGeom.getFactory().createLineString(this._minClearancePts)
  }
  updateClearance () {
    if (arguments.length === 3) {
      const candidateValue = arguments[0]
      const p0 = arguments[1]
      const p1 = arguments[2]
      if (candidateValue < this._minClearance) {
        this._minClearance = candidateValue
        this._minClearancePts[0] = new Coordinate(p0)
        this._minClearancePts[1] = new Coordinate(p1)
      }
    } else if (arguments.length === 4) {
      const candidateValue = arguments[0]
      const p = arguments[1]
      const seg0 = arguments[2]
      const seg1 = arguments[3]
      if (candidateValue < this._minClearance) {
        this._minClearance = candidateValue
        this._minClearancePts[0] = new Coordinate(p)
        const seg = new LineSegment(seg0, seg1)
        this._minClearancePts[1] = new Coordinate(seg.closestPoint(p))
      }
    }
  }
  compute () {
    if (this._minClearancePts !== null) return null
    this._minClearancePts = new Array(2).fill(null)
    this._minClearance = Double.MAX_VALUE
    this._inputGeom.apply(new VertexCoordinateFilter(this))
  }
  getDistance () {
    this.compute()
    return this._minClearance
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return SimpleMinimumClearance
  }
  static getLine (g) {
    const rp = new SimpleMinimumClearance(g)
    return rp.getLine()
  }
  static getDistance (g) {
    const rp = new SimpleMinimumClearance(g)
    return rp.getDistance()
  }
  static get VertexCoordinateFilter () { return VertexCoordinateFilter }
  static get ComputeMCCoordinateSequenceFilter () { return ComputeMCCoordinateSequenceFilter }
}

class VertexCoordinateFilter {
  constructor () {
    this.smc = null
    const smc = arguments[0]
    this.smc = smc
  }
  filter (coord) {
    this.smc._inputGeom.apply(new ComputeMCCoordinateSequenceFilter(this.smc, coord))
  }
  interfaces_ () {
    return [CoordinateFilter]
  }
  getClass () {
    return VertexCoordinateFilter
  }
}

class ComputeMCCoordinateSequenceFilter {
  constructor () {
    this.smc = null
    this._queryPt = null
    const smc = arguments[0]
    const queryPt = arguments[1]
    this.smc = smc
    this._queryPt = queryPt
  }
  isGeometryChanged () {
    return false
  }
  checkVertexDistance (vertex) {
    const vertexDist = vertex.distance(this._queryPt)
    if (vertexDist > 0) {
      this.smc.updateClearance(vertexDist, this._queryPt, vertex)
    }
  }
  filter (seq, i) {
    this.checkVertexDistance(seq.getCoordinate(i))
    if (i > 0) {
      this.checkSegmentDistance(seq.getCoordinate(i - 1), seq.getCoordinate(i))
    }
  }
  checkSegmentDistance (seg0, seg1) {
    if (this._queryPt.equals2D(seg0) || this._queryPt.equals2D(seg1)) return null
    const segDist = CGAlgorithms.distancePointLine(this._queryPt, seg1, seg0)
    if (segDist > 0) this.smc.updateClearance(segDist, this._queryPt, seg1, seg0)
  }
  isDone () {
    return false
  }
  interfaces_ () {
    return [CoordinateSequenceFilter]
  }
  getClass () {
    return ComputeMCCoordinateSequenceFilter
  }
}
