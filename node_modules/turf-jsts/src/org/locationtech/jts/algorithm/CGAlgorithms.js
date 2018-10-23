import Location from '../geom/Location'
import hasInterface from '../../../../hasInterface'
import Coordinate from '../geom/Coordinate'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import MathUtil from '../math/MathUtil'
import CGAlgorithmsDD from './CGAlgorithmsDD'
import CoordinateSequence from '../geom/CoordinateSequence'
import RobustLineIntersector from './RobustLineIntersector'
import Envelope from '../geom/Envelope'
import RayCrossingCounter from './RayCrossingCounter'

export default class CGAlgorithms {
  interfaces_ () {
    return []
  }
  getClass () {
    return CGAlgorithms
  }
  static orientationIndex (p1, p2, q) {
    return CGAlgorithmsDD.orientationIndex(p1, p2, q)
  }
  static signedArea () {
    if (arguments[0] instanceof Array) {
      let ring = arguments[0]
      if (ring.length < 3) return 0.0
      let sum = 0.0
      const x0 = ring[0].x
      for (let i = 1; i < ring.length - 1; i++) {
        const x = ring[i].x - x0
        const y1 = ring[i + 1].y
        const y2 = ring[i - 1].y
        sum += x * (y2 - y1)
      }
      return sum / 2.0
    } else if (hasInterface(arguments[0], CoordinateSequence)) {
      let ring = arguments[0]
      const n = ring.size()
      if (n < 3) return 0.0
      const p0 = new Coordinate()
      const p1 = new Coordinate()
      const p2 = new Coordinate()
      ring.getCoordinate(0, p1)
      ring.getCoordinate(1, p2)
      const x0 = p1.x
      p2.x -= x0
      let sum = 0.0
      for (let i = 1; i < n - 1; i++) {
        p0.y = p1.y
        p1.x = p2.x
        p1.y = p2.y
        ring.getCoordinate(i + 1, p2)
        p2.x -= x0
        sum += p1.x * (p0.y - p2.y)
      }
      return sum / 2.0
    }
  }
  static distanceLineLine (A, B, C, D) {
    if (A.equals(B)) return CGAlgorithms.distancePointLine(A, C, D)
    if (C.equals(D)) return CGAlgorithms.distancePointLine(D, A, B)
    let noIntersection = false
    if (!Envelope.intersects(A, B, C, D)) {
      noIntersection = true
    } else {
      const denom = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x)
      if (denom === 0) {
        noIntersection = true
      } else {
        const rNumb = (A.y - C.y) * (D.x - C.x) - (A.x - C.x) * (D.y - C.y)
        const sNum = (A.y - C.y) * (B.x - A.x) - (A.x - C.x) * (B.y - A.y)
        const s = sNum / denom
        const r = rNumb / denom
        if (r < 0 || r > 1 || s < 0 || s > 1) {
          noIntersection = true
        }
      }
    }
    if (noIntersection) {
      return MathUtil.min(CGAlgorithms.distancePointLine(A, C, D), CGAlgorithms.distancePointLine(B, C, D), CGAlgorithms.distancePointLine(C, A, B), CGAlgorithms.distancePointLine(D, A, B))
    }
    return 0.0
  }
  static isPointInRing (p, ring) {
    return CGAlgorithms.locatePointInRing(p, ring) !== Location.EXTERIOR
  }
  static computeLength (pts) {
    const n = pts.size()
    if (n <= 1) return 0.0
    let len = 0.0
    const p = new Coordinate()
    pts.getCoordinate(0, p)
    let x0 = p.x
    let y0 = p.y
    for (let i = 1; i < n; i++) {
      pts.getCoordinate(i, p)
      const x1 = p.x
      const y1 = p.y
      const dx = x1 - x0
      const dy = y1 - y0
      len += Math.sqrt(dx * dx + dy * dy)
      x0 = x1
      y0 = y1
    }
    return len
  }
  static isCCW (ring) {
    const nPts = ring.length - 1
    if (nPts < 3) throw new IllegalArgumentException('Ring has fewer than 4 points, so orientation cannot be determined')
    let hiPt = ring[0]
    let hiIndex = 0
    for (let i = 1; i <= nPts; i++) {
      const p = ring[i]
      if (p.y > hiPt.y) {
        hiPt = p
        hiIndex = i
      }
    }
    let iPrev = hiIndex
    do {
      iPrev = iPrev - 1
      if (iPrev < 0) iPrev = nPts
    } while (ring[iPrev].equals2D(hiPt) && iPrev !== hiIndex)
    let iNext = hiIndex
    do {
      iNext = (iNext + 1) % nPts
    } while (ring[iNext].equals2D(hiPt) && iNext !== hiIndex)
    const prev = ring[iPrev]
    const next = ring[iNext]
    if (prev.equals2D(hiPt) || next.equals2D(hiPt) || prev.equals2D(next)) return false
    const disc = CGAlgorithms.computeOrientation(prev, hiPt, next)
    let isCCW = false
    if (disc === 0) {
      isCCW = prev.x > next.x
    } else {
      isCCW = disc > 0
    }
    return isCCW
  }
  static locatePointInRing (p, ring) {
    return RayCrossingCounter.locatePointInRing(p, ring)
  }
  static distancePointLinePerpendicular (p, A, B) {
    const len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y)
    const s = ((A.y - p.y) * (B.x - A.x) - (A.x - p.x) * (B.y - A.y)) / len2
    return Math.abs(s) * Math.sqrt(len2)
  }
  static computeOrientation (p1, p2, q) {
    return CGAlgorithms.orientationIndex(p1, p2, q)
  }
  static distancePointLine () {
    if (arguments.length === 2) {
      const p = arguments[0]
      const line = arguments[1]
      if (line.length === 0) throw new IllegalArgumentException('Line array must contain at least one vertex')
      let minDistance = p.distance(line[0])
      for (let i = 0; i < line.length - 1; i++) {
        const dist = CGAlgorithms.distancePointLine(p, line[i], line[i + 1])
        if (dist < minDistance) {
          minDistance = dist
        }
      }
      return minDistance
    } else if (arguments.length === 3) {
      const p = arguments[0]
      const A = arguments[1]
      const B = arguments[2]
      if (A.x === B.x && A.y === B.y) return p.distance(A)
      const len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y)
      const r = ((p.x - A.x) * (B.x - A.x) + (p.y - A.y) * (B.y - A.y)) / len2
      if (r <= 0.0) return p.distance(A)
      if (r >= 1.0) return p.distance(B)
      const s = ((A.y - p.y) * (B.x - A.x) - (A.x - p.x) * (B.y - A.y)) / len2
      return Math.abs(s) * Math.sqrt(len2)
    }
  }
  static isOnLine (p, pt) {
    const lineIntersector = new RobustLineIntersector()
    for (let i = 1; i < pt.length; i++) {
      const p0 = pt[i - 1]
      const p1 = pt[i]
      lineIntersector.computeIntersection(p, p0, p1)
      if (lineIntersector.hasIntersection()) {
        return true
      }
    }
    return false
  }
  static get CLOCKWISE () { return -1 }
  static get RIGHT () { return CGAlgorithms.CLOCKWISE }
  static get COUNTERCLOCKWISE () { return 1 }
  static get LEFT () { return CGAlgorithms.COUNTERCLOCKWISE }
  static get COLLINEAR () { return 0 }
  static get STRAIGHT () { return CGAlgorithms.COLLINEAR }
}
