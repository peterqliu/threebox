import Coordinate from '../../geom/Coordinate'
import CoordinateSequence from '../../geom/CoordinateSequence'

export default class AxisPlaneCoordinateSequence {
  constructor () {
    this._seq = null
    this._indexMap = null
    const seq = arguments[0]
    const indexMap = arguments[1]
    this._seq = seq
    this._indexMap = indexMap
  }
  setOrdinate (index, ordinateIndex, value) {
    throw new Error()
  }
  getZ (index) {
    return this.getOrdinate(index, CoordinateSequence.Z)
  }
  size () {
    return this._seq.size()
  }
  getOrdinate (index, ordinateIndex) {
    if (ordinateIndex > 1) return 0
    return this._seq.getOrdinate(index, this._indexMap[ordinateIndex])
  }
  getCoordinate () {
    if (arguments.length === 1) {
      let i = arguments[0]
      return this.getCoordinateCopy(i)
    } else if (arguments.length === 2) {
      const index = arguments[0]
      const coord = arguments[1]
      coord.x = this.getOrdinate(index, CoordinateSequence.X)
      coord.y = this.getOrdinate(index, CoordinateSequence.Y)
      coord.z = this.getOrdinate(index, CoordinateSequence.Z)
    }
  }
  getCoordinateCopy (i) {
    return new Coordinate(this.getX(i), this.getY(i), this.getZ(i))
  }
  getDimension () {
    return 2
  }
  getX (index) {
    return this.getOrdinate(index, CoordinateSequence.X)
  }
  clone () {
    throw new Error()
  }
  expandEnvelope (env) {
    throw new Error()
  }
  copy () {
    throw new Error()
  }
  getY (index) {
    return this.getOrdinate(index, CoordinateSequence.Y)
  }
  toCoordinateArray () {
    throw new Error()
  }
  interfaces_ () {
    return [CoordinateSequence]
  }
  getClass () {
    return AxisPlaneCoordinateSequence
  }
  static projectToYZ (seq) {
    return new AxisPlaneCoordinateSequence(seq, AxisPlaneCoordinateSequence.YZ_INDEX)
  }
  static projectToXZ (seq) {
    return new AxisPlaneCoordinateSequence(seq, AxisPlaneCoordinateSequence.XZ_INDEX)
  }
  static projectToXY (seq) {
    return new AxisPlaneCoordinateSequence(seq, AxisPlaneCoordinateSequence.XY_INDEX)
  }
  static get XY_INDEX () { return [0, 1] }
  static get XZ_INDEX () { return [0, 2] }
  static get YZ_INDEX () { return [1, 2] }
}
