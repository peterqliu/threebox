import LineIntersector from './LineIntersector'

export default class NonRobustLineIntersector extends LineIntersector {
  computeIntersection () {
    if (arguments.length === 3) {
      const p = arguments[0]
      const p1 = arguments[1]
      const p2 = arguments[2]
      let a1 = null
      let b1 = null
      let c1 = null
      let r = null
      this._isProper = false
      a1 = p2.y - p1.y
      b1 = p1.x - p2.x
      c1 = p2.x * p1.y - p1.x * p2.y
      r = a1 * p.x + b1 * p.y + c1
      if (r !== 0) {
        this._result = LineIntersector.NO_INTERSECTION
        return null
      }
      const dist = this.rParameter(p1, p2, p)
      if (dist < 0.0 || dist > 1.0) {
        this._result = LineIntersector.NO_INTERSECTION
        return null
      }
      this._isProper = true
      if (p.equals(p1) || p.equals(p2)) {
        this._isProper = false
      }
      this._result = LineIntersector.POINT_INTERSECTION
    } else return LineIntersector.prototype.computeIntersection.apply(this, arguments)
  }
  computeCollinearIntersection (p1, p2, p3, p4) {
    let r1 = null
    let r2 = null
    let r3 = null
    let r4 = null
    let q3 = null
    let q4 = null
    let t3 = null
    let t4 = null
    r1 = 0
    r2 = 1
    r3 = this.rParameter(p1, p2, p3)
    r4 = this.rParameter(p1, p2, p4)
    if (r3 < r4) {
      q3 = p3
      t3 = r3
      q4 = p4
      t4 = r4
    } else {
      q3 = p4
      t3 = r4
      q4 = p3
      t4 = r3
    }
    if (t3 > r2 || t4 < r1) {
      return LineIntersector.NO_INTERSECTION
    }
    if (q4 === p1) {
      this._pa.setCoordinate(p1)
      return LineIntersector.POINT_INTERSECTION
    }
    if (q3 === p2) {
      this._pa.setCoordinate(p2)
      return LineIntersector.POINT_INTERSECTION
    }
    this._pa.setCoordinate(p1)
    if (t3 > r1) {
      this._pa.setCoordinate(q3)
    }
    this._pb.setCoordinate(p2)
    if (t4 < r2) {
      this._pb.setCoordinate(q4)
    }
    return LineIntersector.COLLINEAR_INTERSECTION
  }
  rParameter (p1, p2, p) {
    let r = null
    const dx = Math.abs(p2.x - p1.x)
    const dy = Math.abs(p2.y - p1.y)
    if (dx > dy) {
      r = (p.x - p1.x) / (p2.x - p1.x)
    } else {
      r = (p.y - p1.y) / (p2.y - p1.y)
    }
    return r
  }
  computeIntersect (p1, p2, p3, p4) {
    let a1 = null
    let b1 = null
    let c1 = null
    let a2 = null
    let b2 = null
    let c2 = null
    let r1 = null
    let r2 = null
    let r3 = null
    let r4 = null
    this._isProper = false
    a1 = p2.y - p1.y
    b1 = p1.x - p2.x
    c1 = p2.x * p1.y - p1.x * p2.y
    r3 = a1 * p3.x + b1 * p3.y + c1
    r4 = a1 * p4.x + b1 * p4.y + c1
    if (r3 !== 0 && r4 !== 0 && NonRobustLineIntersector.isSameSignAndNonZero(r3, r4)) {
      return LineIntersector.NO_INTERSECTION
    }
    a2 = p4.y - p3.y
    b2 = p3.x - p4.x
    c2 = p4.x * p3.y - p3.x * p4.y
    r1 = a2 * p1.x + b2 * p1.y + c2
    r2 = a2 * p2.x + b2 * p2.y + c2
    if (r1 !== 0 && r2 !== 0 && NonRobustLineIntersector.isSameSignAndNonZero(r1, r2)) {
      return LineIntersector.NO_INTERSECTION
    }
    const denom = a1 * b2 - a2 * b1
    if (denom === 0) {
      return this.computeCollinearIntersection(p1, p2, p3, p4)
    }
    const numX = b1 * c2 - b2 * c1
    this._pa.x = numX / denom
    const numY = a2 * c1 - a1 * c2
    this._pa.y = numY / denom
    this._isProper = true
    if (this._pa.equals(p1) || this._pa.equals(p2) || this._pa.equals(p3) || this._pa.equals(p4)) {
      this._isProper = false
    }
    if (this._precisionModel !== null) {
      this._precisionModel.makePrecise(this._pa)
    }
    return LineIntersector.POINT_INTERSECTION
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return NonRobustLineIntersector
  }
  static isSameSignAndNonZero (a, b) {
    if (a === 0 || b === 0) {
      return false
    }
    return (a < 0 && b < 0) || (a > 0 && b > 0)
  }
}
