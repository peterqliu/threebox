export default class NumberUtil {
  interfaces_ () {
    return []
  }
  getClass () {
    return NumberUtil
  }
  equalsWithTolerance (x1, x2, tolerance) {
    return Math.abs(x1 - x2) <= tolerance
  }
};
