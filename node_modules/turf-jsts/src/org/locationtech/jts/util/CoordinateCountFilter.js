import CoordinateFilter from '../geom/CoordinateFilter'

export default class CoordinateCountFilter {
  constructor () {
    this._n = 0
  }
  filter (coord) {
    this._n++
  }
  getCount () {
    return this._n
  }
  interfaces_ () {
    return [CoordinateFilter]
  }
  getClass () {
    return CoordinateCountFilter
  }
}
