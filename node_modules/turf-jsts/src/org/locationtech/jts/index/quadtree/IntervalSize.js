import DoubleBits from './DoubleBits'

export default class IntervalSize {
  interfaces_ () {
    return []
  }
  getClass () {
    return IntervalSize
  }
  static isZeroWidth (min, max) {
    var width = max - min
    if (width === 0.0) return true
    var maxAbs = Math.max(Math.abs(min), Math.abs(max))
    var scaledInterval = width / maxAbs
    var level = DoubleBits.exponent(scaledInterval)
    return level <= IntervalSize.MIN_BINARY_EXPONENT
  }
  static get MIN_BINARY_EXPONENT () { return -50 }
}
