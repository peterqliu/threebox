export default class SweepLineInterval {
  constructor () {
    this._min = null
    this._max = null
    this._item = null
    if (arguments.length === 2) {
      const min = arguments[0]
      const max = arguments[1]
      SweepLineInterval.call(this, min, max, null)
    } else if (arguments.length === 3) {
      const min = arguments[0]
      const max = arguments[1]
      const item = arguments[2]
      this._min = min < max ? min : max
      this._max = max > min ? max : min
      this._item = item
    }
  }
  getMin () {
    return this._min
  }
  getItem () {
    return this._item
  }
  getMax () {
    return this._max
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return SweepLineInterval
  }
}
