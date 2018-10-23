import Noder from './Noder'

export default class SinglePassNoder {
  constructor () {
    this._segInt = null
    if (arguments.length === 0) {} else if (arguments.length === 1) {
      let segInt = arguments[0]
      this.setSegmentIntersector(segInt)
    }
  }
  setSegmentIntersector (segInt) {
    this._segInt = segInt
  }
  interfaces_ () {
    return [Noder]
  }
  getClass () {
    return SinglePassNoder
  }
}
