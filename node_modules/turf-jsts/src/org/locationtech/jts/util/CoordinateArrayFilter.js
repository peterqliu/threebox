import CoordinateFilter from '../geom/CoordinateFilter'

export default class CoordinateArrayFilter {
  constructor () {
    this.pts = null
    this.n = 0
    const size = arguments[0]
    this.pts = new Array(size).fill(null)
  }
  filter (coord) {
    this.pts[this.n++] = coord
  }
  getCoordinates () {
    return this.pts
  }
  interfaces_ () {
    return [CoordinateFilter]
  }
  getClass () {
    return CoordinateArrayFilter
  }
}
