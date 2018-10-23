export default class BufferParameters {
  constructor () {
    this._quadrantSegments = BufferParameters.DEFAULT_QUADRANT_SEGMENTS
    this._endCapStyle = BufferParameters.CAP_ROUND
    this._joinStyle = BufferParameters.JOIN_ROUND
    this._mitreLimit = BufferParameters.DEFAULT_MITRE_LIMIT
    this._isSingleSided = false
    this._simplifyFactor = BufferParameters.DEFAULT_SIMPLIFY_FACTOR

    if (arguments.length === 0) {} else if (arguments.length === 1) {
      const quadrantSegments = arguments[0]
      this.setQuadrantSegments(quadrantSegments)
    } else if (arguments.length === 2) {
      const quadrantSegments = arguments[0]
      const endCapStyle = arguments[1]
      this.setQuadrantSegments(quadrantSegments)
      this.setEndCapStyle(endCapStyle)
    } else if (arguments.length === 4) {
      const quadrantSegments = arguments[0]
      const endCapStyle = arguments[1]
      const joinStyle = arguments[2]
      const mitreLimit = arguments[3]
      this.setQuadrantSegments(quadrantSegments)
      this.setEndCapStyle(endCapStyle)
      this.setJoinStyle(joinStyle)
      this.setMitreLimit(mitreLimit)
    }
  }
  getEndCapStyle () {
    return this._endCapStyle
  }
  isSingleSided () {
    return this._isSingleSided
  }
  setQuadrantSegments (quadSegs) {
    this._quadrantSegments = quadSegs
    if (this._quadrantSegments === 0) this._joinStyle = BufferParameters.JOIN_BEVEL
    if (this._quadrantSegments < 0) {
      this._joinStyle = BufferParameters.JOIN_MITRE
      this._mitreLimit = Math.abs(this._quadrantSegments)
    }
    if (quadSegs <= 0) {
      this._quadrantSegments = 1
    }
    if (this._joinStyle !== BufferParameters.JOIN_ROUND) {
      this._quadrantSegments = BufferParameters.DEFAULT_QUADRANT_SEGMENTS
    }
  }
  getJoinStyle () {
    return this._joinStyle
  }
  setJoinStyle (joinStyle) {
    this._joinStyle = joinStyle
  }
  setSimplifyFactor (simplifyFactor) {
    this._simplifyFactor = simplifyFactor < 0 ? 0 : simplifyFactor
  }
  getSimplifyFactor () {
    return this._simplifyFactor
  }
  getQuadrantSegments () {
    return this._quadrantSegments
  }
  setEndCapStyle (endCapStyle) {
    this._endCapStyle = endCapStyle
  }
  getMitreLimit () {
    return this._mitreLimit
  }
  setMitreLimit (mitreLimit) {
    this._mitreLimit = mitreLimit
  }
  setSingleSided (isSingleSided) {
    this._isSingleSided = isSingleSided
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return BufferParameters
  }
  static bufferDistanceError (quadSegs) {
    var alpha = Math.PI / 2.0 / quadSegs
    return 1 - Math.cos(alpha / 2.0)
  }
  static get CAP_ROUND () { return 1 }
  static get CAP_FLAT () { return 2 }
  static get CAP_SQUARE () { return 3 }
  static get JOIN_ROUND () { return 1 }
  static get JOIN_MITRE () { return 2 }
  static get JOIN_BEVEL () { return 3 }
  static get DEFAULT_QUADRANT_SEGMENTS () { return 8 }
  static get DEFAULT_MITRE_LIMIT () { return 5.0 }
  static get DEFAULT_SIMPLIFY_FACTOR () { return 0.01 }
}
