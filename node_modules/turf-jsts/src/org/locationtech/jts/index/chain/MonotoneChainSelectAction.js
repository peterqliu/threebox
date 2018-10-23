import LineSegment from '../../geom/LineSegment'
import Envelope from '../../geom/Envelope'

export default class MonotoneChainSelectAction {
  constructor () {
    this.tempEnv1 = new Envelope()
    this.selectedSegment = new LineSegment()
  }
  select () {
    if (arguments.length === 1) {
      // const seg = arguments[0]
    } else if (arguments.length === 2) {
      const mc = arguments[0]
      const startIndex = arguments[1]
      mc.getLineSegment(startIndex, this.selectedSegment)
      this.select(this.selectedSegment)
    }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return MonotoneChainSelectAction
  }
}
