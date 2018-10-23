import Cloneable from '../../../../java/lang/Cloneable'

export default class CoordinateSequence {
  static get X () { return 0 }
  static get Y () { return 1 }
  static get Z () { return 2 }
  static get M () { return 3 }
  setOrdinate (index, ordinateIndex, value) {}
  size () {}
  getOrdinate (index, ordinateIndex) {}
  getCoordinate () {}
  getCoordinateCopy (i) {}
  getDimension () {}
  getX (index) {}
  clone () {}
  expandEnvelope (env) {}
  copy () {}
  getY (index) {}
  toCoordinateArray () {}
  interfaces_ () {
    return [Cloneable]
  }
  getClass () {
    return CoordinateSequence
  }
}
