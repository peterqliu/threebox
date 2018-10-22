export default class GeometryLocation {
  constructor () {
    this._component = null
    this._segIndex = null
    this._pt = null
    if (arguments.length === 2) {
      const component = arguments[0]
      const pt = arguments[1]
      GeometryLocation.call(this, component, GeometryLocation.INSIDE_AREA, pt)
    } else if (arguments.length === 3) {
      const component = arguments[0]
      const segIndex = arguments[1]
      const pt = arguments[2]
      this._component = component
      this._segIndex = segIndex
      this._pt = pt
    }
  }
  isInsideArea () {
    return this._segIndex === GeometryLocation.INSIDE_AREA
  }
  getCoordinate () {
    return this._pt
  }
  getGeometryComponent () {
    return this._component
  }
  getSegmentIndex () {
    return this._segIndex
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return GeometryLocation
  }
  static get INSIDE_AREA () { return -1 }
}
