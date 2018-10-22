import CoordinateList from '../geom/CoordinateList'
import Coordinate from '../geom/Coordinate'
import Double from '../../../../java/lang/Double'
import Triangle from '../geom/Triangle'

export default class VWLineSimplifier {
  constructor () {
    this._pts = null
    this._tolerance = null
    const pts = arguments[0]
    const distanceTolerance = arguments[1]
    this._pts = pts
    this._tolerance = distanceTolerance * distanceTolerance
  }
  simplifyVertex (vwLine) {
    var curr = vwLine
    var minArea = curr.getArea()
    var minVertex = null
    while (curr !== null) {
      var area = curr.getArea()
      if (area < minArea) {
        minArea = area
        minVertex = curr
      }
      curr = curr._next
    }
    if (minVertex !== null && minArea < this._tolerance) {
      minVertex.remove()
    }
    if (!vwLine.isLive()) return -1
    return minArea
  }
  simplify () {
    var vwLine = VWVertex.buildLine(this._pts)
    var minArea = this._tolerance
    do {
      minArea = this.simplifyVertex(vwLine)
    } while (minArea < this._tolerance)
    var simp = vwLine.getCoordinates()
    if (simp.length < 2) {
      return [simp[0], new Coordinate(simp[0])]
    }
    return simp
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return VWLineSimplifier
  }
  static simplify (pts, distanceTolerance) {
    var simp = new VWLineSimplifier(pts, distanceTolerance)
    return simp.simplify()
  }
  static get VWVertex () { return VWVertex }
}

class VWVertex {
  constructor () {
    this._pt = null
    this._prev = null
    this._next = null
    this._area = VWVertex.MAX_AREA
    this._isLive = true
    let pt = arguments[0]
    this._pt = pt
  }
  getCoordinates () {
    var coords = new CoordinateList()
    var curr = this
    do {
      coords.add(curr._pt, false)
      curr = curr._next
    } while (curr !== null)
    return coords.toCoordinateArray()
  }
  getArea () {
    return this._area
  }
  updateArea () {
    if (this._prev === null || this._next === null) {
      this._area = VWVertex.MAX_AREA
      return null
    }
    this._area = Math.abs(Triangle.area(this._prev._pt, this._pt, this._next._pt))
  }
  remove () {
    var tmpPrev = this._prev
    var tmpNext = this._next
    var result = null
    if (this._prev !== null) {
      this._prev.setNext(tmpNext)
      this._prev.updateArea()
      result = this._prev
    }
    if (this._next !== null) {
      this._next.setPrev(tmpPrev)
      this._next.updateArea()
      if (result === null) result = this._next
    }
    this._isLive = false
    return result
  }
  isLive () {
    return this._isLive
  }
  setPrev (prev) {
    this._prev = prev
  }
  setNext (next) {
    this._next = next
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return VWVertex
  }
  static buildLine (pts) {
    var first = null
    var prev = null
    for (var i = 0; i < pts.length; i++) {
      var v = new VWVertex(pts[i])
      if (first === null) first = v
      v.setPrev(prev)
      if (prev !== null) {
        prev.setNext(v)
        prev.updateArea()
      }
      prev = v
    }
    return first
  }
  static get MAX_AREA () { return Double.MAX_VALUE }
}
