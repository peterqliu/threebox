import SegmentIntersectionDetector from './SegmentIntersectionDetector'
import MCIndexSegmentSetMutualIntersector from './MCIndexSegmentSetMutualIntersector'

export default class FastSegmentSetIntersectionFinder {
  constructor () {
    this._segSetMutInt = null
    const baseSegStrings = arguments[0]
    this._segSetMutInt = new MCIndexSegmentSetMutualIntersector(baseSegStrings)
  }
  getSegmentSetIntersector () {
    return this._segSetMutInt
  }
  intersects () {
    if (arguments.length === 1) {
      const segStrings = arguments[0]
      const intFinder = new SegmentIntersectionDetector()
      return this.intersects(segStrings, intFinder)
    } else if (arguments.length === 2) {
      const segStrings = arguments[0]
      const intDetector = arguments[1]
      this._segSetMutInt.process(segStrings, intDetector)
      return intDetector.hasIntersection()
    }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return FastSegmentSetIntersectionFinder
  }
}
