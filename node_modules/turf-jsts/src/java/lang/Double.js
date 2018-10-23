export default class Double {
  static isNaN (n) { return Number.isNaN(n) }
  static doubleToLongBits (n) { return n }
  static longBitsToDouble (n) { return n }
  static isInfinite (n) { return !Number.isFinite(n) }
  static get MAX_VALUE () { return Number.MAX_VALUE }
}
