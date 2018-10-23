import CGAlgorithms from './CGAlgorithms'
import PointInRing from './PointInRing'

export default class SimplePointInRing {
  constructor () {
    this._pts = null
    let ring = arguments[0]
    this._pts = ring.getCoordinates()
  }
  isInside (pt) {
    return CGAlgorithms.isPointInRing(pt, this._pts)
  }
  interfaces_ () {
    return [PointInRing]
  }
  getClass () {
    return SimplePointInRing
  }
}
