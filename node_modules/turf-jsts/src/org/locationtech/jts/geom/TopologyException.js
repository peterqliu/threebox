import Coordinate from './Coordinate'
import RuntimeException from '../../../../java/lang/RuntimeException'

export default class TopologyException extends RuntimeException {
  constructor (msg, pt) {
    super(TopologyException.msgWithCoord(msg, pt))
    this.pt = pt ? new Coordinate(pt) : null
    this.name = 'TopologyException'
  }
  getCoordinate () {
    return this.pt
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return TopologyException
  }
  static msgWithCoord (msg, pt) {
    if (!pt) return msg + ' [ ' + pt + ' ]'
    return msg
  }
}
