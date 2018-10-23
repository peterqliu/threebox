export default class TopologyValidationError {
  constructor () {
    this._errorType = null
    this._pt = null
    if (arguments.length === 1) {
      const errorType = arguments[0]
      TopologyValidationError.call(this, errorType, null)
    } else if (arguments.length === 2) {
      const errorType = arguments[0]
      const pt = arguments[1]
      this._errorType = errorType
      if (pt !== null) this._pt = pt.copy()
    }
  }
  getErrorType () {
    return this._errorType
  }
  getMessage () {
    return TopologyValidationError.errMsg[this._errorType]
  }
  getCoordinate () {
    return this._pt
  }
  toString () {
    let locStr = ''
    if (this._pt !== null) locStr = ' at or near point ' + this._pt
    return this.getMessage() + locStr
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return TopologyValidationError
  }
  static get ERROR () { return 0 }
  static get REPEATED_POINT () { return 1 }
  static get HOLE_OUTSIDE_SHELL () { return 2 }
  static get NESTED_HOLES () { return 3 }
  static get DISCONNECTED_INTERIOR () { return 4 }
  static get SELF_INTERSECTION () { return 5 }
  static get RING_SELF_INTERSECTION () { return 6 }
  static get NESTED_SHELLS () { return 7 }
  static get DUPLICATE_RINGS () { return 8 }
  static get TOO_FEW_POINTS () { return 9 }
  static get INVALID_COORDINATE () { return 10 }
  static get RING_NOT_CLOSED () { return 11 }
  static get errMsg () { return ['Topology Validation Error', 'Repeated Point', 'Hole lies outside shell', 'Holes are nested', 'Interior is disconnected', 'Self-intersection', 'Ring Self-intersection', 'Nested shells', 'Duplicate Rings', 'Too few distinct points in geometry component', 'Invalid Coordinate', 'Ring is not closed'] }
}
