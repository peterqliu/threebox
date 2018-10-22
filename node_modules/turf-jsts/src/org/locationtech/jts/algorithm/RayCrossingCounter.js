import Location from '../geom/Location'
import hasInterface from '../../../../hasInterface'
import Coordinate from '../geom/Coordinate'
import CoordinateSequence from '../geom/CoordinateSequence'
import RobustDeterminant from './RobustDeterminant'

export default class RayCrossingCounter {
  constructor () {
    this._p = null
    this._crossingCount = 0
    this._isPointOnSegment = false
    const p = arguments[0]
    this._p = p
  }
  countSegment (p1, p2) {
    if (p1.x < this._p.x && p2.x < this._p.x) return null
    if (this._p.x === p2.x && this._p.y === p2.y) {
      this._isPointOnSegment = true
      return null
    }
    if (p1.y === this._p.y && p2.y === this._p.y) {
      let minx = p1.x
      let maxx = p2.x
      if (minx > maxx) {
        minx = p2.x
        maxx = p1.x
      }
      if (this._p.x >= minx && this._p.x <= maxx) {
        this._isPointOnSegment = true
      }
      return null
    }
    if ((p1.y > this._p.y && p2.y <= this._p.y) || (p2.y > this._p.y && p1.y <= this._p.y)) {
      const x1 = p1.x - this._p.x
      const y1 = p1.y - this._p.y
      const x2 = p2.x - this._p.x
      const y2 = p2.y - this._p.y
      let xIntSign = RobustDeterminant.signOfDet2x2(x1, y1, x2, y2)
      if (xIntSign === 0.0) {
        this._isPointOnSegment = true
        return null
      }
      if (y2 < y1) xIntSign = -xIntSign
      if (xIntSign > 0.0) {
        this._crossingCount++
      }
    }
  }
  isPointInPolygon () {
    return this.getLocation() !== Location.EXTERIOR
  }
  getLocation () {
    if (this._isPointOnSegment) return Location.BOUNDARY
    if (this._crossingCount % 2 === 1) {
      return Location.INTERIOR
    }
    return Location.EXTERIOR
  }
  isOnSegment () {
    return this._isPointOnSegment
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return RayCrossingCounter
  }
  static locatePointInRing () {
    if (arguments[0] instanceof Coordinate && hasInterface(arguments[1], CoordinateSequence)) {
      const p = arguments[0]
      const ring = arguments[1]
      const counter = new RayCrossingCounter(p)
      const p1 = new Coordinate()
      const p2 = new Coordinate()
      for (let i = 1; i < ring.size(); i++) {
        ring.getCoordinate(i, p1)
        ring.getCoordinate(i - 1, p2)
        counter.countSegment(p1, p2)
        if (counter.isOnSegment()) return counter.getLocation()
      }
      return counter.getLocation()
    } else if (arguments[0] instanceof Coordinate && arguments[1] instanceof Array) {
      const p = arguments[0]
      const ring = arguments[1]
      const counter = new RayCrossingCounter(p)
      for (let i = 1; i < ring.length; i++) {
        const p1 = ring[i]
        const p2 = ring[i - 1]
        counter.countSegment(p1, p2)
        if (counter.isOnSegment()) return counter.getLocation()
      }
      return counter.getLocation()
    }
  }
}
