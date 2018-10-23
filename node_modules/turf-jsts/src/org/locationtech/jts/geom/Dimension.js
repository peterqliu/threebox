import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import Character from '../../../../java/lang/Character'

export default class Dimension {
  static get P () { return 0 }
  static get L () { return 1 }
  static get A () { return 2 }
  static get FALSE () { return -1 }
  static get TRUE () { return -2 }
  static get DONTCARE () { return -3 }
  static get SYM_FALSE () { return 'F' }
  static get SYM_TRUE () { return 'T' }
  static get SYM_DONTCARE () { return '*' }
  static get SYM_P () { return '0' }
  static get SYM_L () { return '1' }
  static get SYM_A () { return '2' }

  interfaces_ () {
    return []
  }
  getClass () {
    return Dimension
  }
  static toDimensionSymbol (dimensionValue) {
    switch (dimensionValue) {
      case Dimension.FALSE:
        return Dimension.SYM_FALSE
      case Dimension.TRUE:
        return Dimension.SYM_TRUE
      case Dimension.DONTCARE:
        return Dimension.SYM_DONTCARE
      case Dimension.P:
        return Dimension.SYM_P
      case Dimension.L:
        return Dimension.SYM_L
      case Dimension.A:
        return Dimension.SYM_A
      default:
    }
    throw new IllegalArgumentException('Unknown dimension value: ' + dimensionValue)
  }
  static toDimensionValue (dimensionSymbol) {
    switch (Character.toUpperCase(dimensionSymbol)) {
      case Dimension.SYM_FALSE:
        return Dimension.FALSE
      case Dimension.SYM_TRUE:
        return Dimension.TRUE
      case Dimension.SYM_DONTCARE:
        return Dimension.DONTCARE
      case Dimension.SYM_P:
        return Dimension.P
      case Dimension.SYM_L:
        return Dimension.L
      case Dimension.SYM_A:
        return Dimension.A
      default:
    }
    throw new IllegalArgumentException('Unknown dimension symbol: ' + dimensionSymbol)
  }
}
