import WKTWriter from '../io/WKTWriter'
import Coordinate from '../geom/Coordinate'
import RuntimeException from '../../../../java/lang/RuntimeException'

export default class ConstraintEnforcementException extends RuntimeException {
  constructor (msg, pt) {
    if (pt) {
      super(ConstraintEnforcementException.msgWithCoord(msg, pt))
      this._pt = new Coordinate(pt)
    } else {
      super(msg)
      this._pt = null
    }
  }
  getCoordinate () {
    return this._pt
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return ConstraintEnforcementException
  }
  static msgWithCoord (msg, pt) {
    if (pt !== null) return msg + ' [ ' + WKTWriter.toPoint(pt) + ' ]'
    return msg
  }
  static get serialVersionUID () { return 386496846550080140 }
}
