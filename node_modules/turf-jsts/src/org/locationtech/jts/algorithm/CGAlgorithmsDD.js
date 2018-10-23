import Coordinate from '../geom/Coordinate'
import DD from '../math/DD'

export default class CGAlgorithmsDD {
  interfaces_ () {
    return []
  }
  getClass () {
    return CGAlgorithmsDD
  }
  static orientationIndex (p1, p2, q) {
    const index = CGAlgorithmsDD.orientationIndexFilter(p1, p2, q)
    if (index <= 1) return index
    const dx1 = DD.valueOf(p2.x).selfAdd(-p1.x)
    const dy1 = DD.valueOf(p2.y).selfAdd(-p1.y)
    const dx2 = DD.valueOf(q.x).selfAdd(-p2.x)
    const dy2 = DD.valueOf(q.y).selfAdd(-p2.y)
    return dx1.selfMultiply(dy2).selfSubtract(dy1.selfMultiply(dx2)).signum()
  }
  static signOfDet2x2 (x1, y1, x2, y2) {
    const det = x1.multiply(y2).selfSubtract(y1.multiply(x2))
    return det.signum()
  }
  static intersection (p1, p2, q1, q2) {
    const denom1 = DD.valueOf(q2.y).selfSubtract(q1.y).selfMultiply(DD.valueOf(p2.x).selfSubtract(p1.x))
    const denom2 = DD.valueOf(q2.x).selfSubtract(q1.x).selfMultiply(DD.valueOf(p2.y).selfSubtract(p1.y))
    const denom = denom1.subtract(denom2)
    const numx1 = DD.valueOf(q2.x).selfSubtract(q1.x).selfMultiply(DD.valueOf(p1.y).selfSubtract(q1.y))
    const numx2 = DD.valueOf(q2.y).selfSubtract(q1.y).selfMultiply(DD.valueOf(p1.x).selfSubtract(q1.x))
    const numx = numx1.subtract(numx2)
    const fracP = numx.selfDivide(denom).doubleValue()
    const x = DD.valueOf(p1.x).selfAdd(DD.valueOf(p2.x).selfSubtract(p1.x).selfMultiply(fracP)).doubleValue()
    const numy1 = DD.valueOf(p2.x).selfSubtract(p1.x).selfMultiply(DD.valueOf(p1.y).selfSubtract(q1.y))
    const numy2 = DD.valueOf(p2.y).selfSubtract(p1.y).selfMultiply(DD.valueOf(p1.x).selfSubtract(q1.x))
    const numy = numy1.subtract(numy2)
    const fracQ = numy.selfDivide(denom).doubleValue()
    const y = DD.valueOf(q1.y).selfAdd(DD.valueOf(q2.y).selfSubtract(q1.y).selfMultiply(fracQ)).doubleValue()
    return new Coordinate(x, y)
  }
  static orientationIndexFilter (pa, pb, pc) {
    let detsum = null
    const detleft = (pa.x - pc.x) * (pb.y - pc.y)
    const detright = (pa.y - pc.y) * (pb.x - pc.x)
    const det = detleft - detright
    if (detleft > 0.0) {
      if (detright <= 0.0) {
        return CGAlgorithmsDD.signum(det)
      } else {
        detsum = detleft + detright
      }
    } else if (detleft < 0.0) {
      if (detright >= 0.0) {
        return CGAlgorithmsDD.signum(det)
      } else {
        detsum = -detleft - detright
      }
    } else {
      return CGAlgorithmsDD.signum(det)
    }
    const errbound = CGAlgorithmsDD.DP_SAFE_EPSILON * detsum
    if (det >= errbound || -det >= errbound) {
      return CGAlgorithmsDD.signum(det)
    }
    return 2
  }
  static signum (x) {
    if (x > 0) return 1
    if (x < 0) return -1
    return 0
  }
  static get DP_SAFE_EPSILON () { return 1e-15 };
}
