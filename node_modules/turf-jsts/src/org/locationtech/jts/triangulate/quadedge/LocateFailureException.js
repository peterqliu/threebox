import LineSegment from '../../geom/LineSegment'

export default class LocateFailureException {
  constructor (msg) {
    this._seg = null
    if (arguments.length === 1) {
      if (typeof arguments[0] === 'string') {
        throw new Error(msg)
      } else if (arguments[0] instanceof LineSegment) {
        const seg = arguments[0]
        throw new Error('Locate failed to converge (at edge: ' + seg + ').  Possible causes include invalid Subdivision topology or very close sites')
      }
    } else if (arguments.length === 2) {
      const msg = arguments[0]
      const seg = arguments[1]
      throw new Error(LocateFailureException.msgWithSpatial(msg, seg))
    }
  }
  getSegment () {
    return this._seg
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return LocateFailureException
  }
  static msgWithSpatial (msg, seg) {
    if (seg !== null) return msg + ' [ ' + seg + ' ]'
    return msg
  }
}
