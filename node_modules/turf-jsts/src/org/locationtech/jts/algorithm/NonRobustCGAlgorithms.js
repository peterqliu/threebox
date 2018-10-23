import CGAlgorithms from './CGAlgorithms'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'

export default class NonRobustCGAlgorithms extends CGAlgorithms {
  interfaces_ () {
    return []
  }
  getClass () {
    return NonRobustCGAlgorithms
  }
  static orientationIndex () {
    if (arguments.length === 3) {
      const p1 = arguments[0]
      const p2 = arguments[1]
      const q = arguments[2]
      const dx1 = p2.x - p1.x
      const dy1 = p2.y - p1.y
      const dx2 = q.x - p2.x
      const dy2 = q.y - p2.y
      const det = dx1 * dy2 - dx2 * dy1
      if (det > 0.0) return 1
      if (det < 0.0) return -1
      return 0
    } else return CGAlgorithms.prototype.orientationIndex.apply(this, arguments)
  }
  static distanceLineLine () {
    if (arguments.length === 4) {
      const A = arguments[0]
      const B = arguments[1]
      const C = arguments[2]
      const D = arguments[3]
      if (A.equals(B)) return CGAlgorithms.distancePointLine(A, C, D)
      if (C.equals(D)) return CGAlgorithms.distancePointLine(D, A, B)
      const rTop = (A.y - C.y) * (D.x - C.x) - (A.x - C.x) * (D.y - C.y)
      const rBot = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x)
      const sTop = (A.y - C.y) * (B.x - A.x) - (A.x - C.x) * (B.y - A.y)
      const sBot = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x)
      if (rBot === 0 || sBot === 0) {
        return Math.min(CGAlgorithms.distancePointLine(A, C, D), Math.min(CGAlgorithms.distancePointLine(B, C, D), Math.min(CGAlgorithms.distancePointLine(C, A, B), CGAlgorithms.distancePointLine(D, A, B))))
      }
      const s = sTop / sBot
      const r = rTop / rBot
      if (r < 0 || r > 1 || s < 0 || s > 1) {
        return Math.min(CGAlgorithms.distancePointLine(A, C, D), Math.min(CGAlgorithms.distancePointLine(B, C, D), Math.min(CGAlgorithms.distancePointLine(C, A, B), CGAlgorithms.distancePointLine(D, A, B))))
      }
      return 0.0
    } else return CGAlgorithms.prototype.distanceLineLine.apply(this, arguments)
  }
  static isPointInRing () {
    if (arguments.length === 2) {
      const p = arguments[0]
      const ring = arguments[1]
      let i = null
      let i1 = null
      let xInt = null
      let crossings = 0
      let x1 = null
      let y1 = null
      let x2 = null
      let y2 = null
      const nPts = ring.length
      for ((i = 1); i < nPts; i++) {
        i1 = i - 1
        const p1 = ring[i]
        const p2 = ring[i1]
        x1 = p1.x - p.x
        y1 = p1.y - p.y
        x2 = p2.x - p.x
        y2 = p2.y - p.y
        if ((y1 > 0 && y2 <= 0) || (y2 > 0 && y1 <= 0)) {
          xInt = (x1 * y2 - x2 * y1) / (y2 - y1)
          if (xInt > 0.0) crossings++
        }
      }
      if (crossings % 2 === 1) return true; else return false
    } else return CGAlgorithms.prototype.isPointInRing.apply(this, arguments)
  }
  static isCCW () {
    if (arguments.length === 1) {
      const ring = arguments[0]
      const nPts = ring.length - 1
      if (nPts < 4) return false
      let hip = ring[0]
      let hii = 0
      for (let i = 1; i <= nPts; i++) {
        const p = ring[i]
        if (p.y > hip.y) {
          hip = p
          hii = i
        }
      }
      let iPrev = hii
      do {
        iPrev = (iPrev - 1) % nPts
      } while (ring[iPrev].equals(hip) && iPrev !== hii)
      let iNext = hii
      do {
        iNext = (iNext + 1) % nPts
      } while (ring[iNext].equals(hip) && iNext !== hii)
      const prev = ring[iPrev]
      const next = ring[iNext]
      if (prev.equals(hip) || next.equals(hip) || prev.equals(next)) throw new IllegalArgumentException('degenerate ring (does not contain 3 different points)')
      const prev2x = prev.x - hip.x
      const prev2y = prev.y - hip.y
      const next2x = next.x - hip.x
      const next2y = next.y - hip.y
      const disc = next2x * prev2y - next2y * prev2x
      if (disc === 0.0) {
        return prev.x > next.x
      } else {
        return disc > 0.0
      }
    } else return CGAlgorithms.prototype.isCCW.apply(this, arguments)
  }
  static computeOrientation () {
    if (arguments.length === 3) {
      const p1 = arguments[0]
      const p2 = arguments[1]
      const q = arguments[2]
      return NonRobustCGAlgorithms.orientationIndex(p1, p2, q)
    } else return CGAlgorithms.prototype.computeOrientation.apply(this, arguments)
  }
}
