import BasicSegmentString from '../noding/BasicSegmentString'
import FastNodingValidator from '../noding/FastNodingValidator'
import ArrayList from '../../../../java/util/ArrayList'

export default class EdgeNodingValidator {
  constructor () {
    this._nv = null
    let edges = arguments[0]
    this._nv = new FastNodingValidator(EdgeNodingValidator.toSegmentStrings(edges))
  }
  checkValid () {
    this._nv.checkValid()
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return EdgeNodingValidator
  }
  static toSegmentStrings (edges) {
    const segStrings = new ArrayList()
    for (const i = edges.iterator(); i.hasNext();) {
      const e = i.next()
      segStrings.add(new BasicSegmentString(e.getCoordinates(), e))
    }
    return segStrings
  }
  static checkValid (edges) {
    const validator = new EdgeNodingValidator(edges)
    validator.checkValid()
  }
}
