import NumberUtil from '../util/NumberUtil'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import Double from '../../../../java/lang/Double'
import Comparable from '../../../../java/lang/Comparable'
import Cloneable from '../../../../java/lang/Cloneable'
import Comparator from '../../../../java/util/Comparator'
import Serializable from '../../../../java/io/Serializable'
// import Assert from '../util/Assert'

export default class Coordinate {
  constructor () {
    this.x = null
    this.y = null
    this.z = null
    if (arguments.length === 0) {
      this.x = 0.0
      this.y = 0.0
      this.z = Coordinate.NULL_ORDINATE
    } else if (arguments.length === 1) {
      const c = arguments[0]
      this.x = c.x
      this.y = c.y
      this.z = c.z
    } else if (arguments.length === 2) {
      this.x = arguments[0]
      this.y = arguments[1]
      this.z = Coordinate.NULL_ORDINATE
    } else if (arguments.length === 3) {
      this.x = arguments[0]
      this.y = arguments[1]
      this.z = arguments[2]
    }
  }
  setOrdinate (ordinateIndex, value) {
    switch (ordinateIndex) {
      case Coordinate.X:
        this.x = value
        break
      case Coordinate.Y:
        this.y = value
        break
      case Coordinate.Z:
        this.z = value
        break
      default:
        throw new IllegalArgumentException('Invalid ordinate index: ' + ordinateIndex)
    }
  }
  equals2D () {
    if (arguments.length === 1) {
      let other = arguments[0]
      if (this.x !== other.x) {
        return false
      }
      if (this.y !== other.y) {
        return false
      }
      return true
    } else if (arguments.length === 2) {
      const c = arguments[0]
      const tolerance = arguments[1]
      if (!NumberUtil.equalsWithTolerance(this.x, c.x, tolerance)) {
        return false
      }
      if (!NumberUtil.equalsWithTolerance(this.y, c.y, tolerance)) {
        return false
      }
      return true
    }
  }
  getOrdinate (ordinateIndex) {
    switch (ordinateIndex) {
      case Coordinate.X:
        return this.x
      case Coordinate.Y:
        return this.y
      case Coordinate.Z:
        return this.z
      default:
    }
    throw new IllegalArgumentException('Invalid ordinate index: ' + ordinateIndex)
  }
  equals3D (other) {
    return this.x === other.x &&
           this.y === other.y &&
           ((this.z === other.z || Double.isNaN(this.z)) &&
           Double.isNaN(other.z))
  }
  equals (other) {
    if (!(other instanceof Coordinate)) {
      return false
    }
    return this.equals2D(other)
  }
  equalInZ (c, tolerance) {
    return NumberUtil.equalsWithTolerance(this.z, c.z, tolerance)
  }
  compareTo (o) {
    var other = o
    if (this.x < other.x) return -1
    if (this.x > other.x) return 1
    if (this.y < other.y) return -1
    if (this.y > other.y) return 1
    return 0
  }
  clone () {
    // try {
    //   var coord = null
    //   return coord
    // } catch (e) {
    //   if (e instanceof CloneNotSupportedException) {
    //     Assert.shouldNeverReachHere("this shouldn't happen because this class is Cloneable")
    //     return null
    //   } else throw e
    // } finally {}
  }
  copy () {
    return new Coordinate(this)
  }
  toString () {
    return '(' + this.x + ', ' + this.y + ', ' + this.z + ')'
  }
  distance3D (c) {
    var dx = this.x - c.x
    var dy = this.y - c.y
    var dz = this.z - c.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
  distance (c) {
    var dx = this.x - c.x
    var dy = this.y - c.y
    return Math.sqrt(dx * dx + dy * dy)
  }
  hashCode () {
    var result = 17
    result = 37 * result + Coordinate.hashCode(this.x)
    result = 37 * result + Coordinate.hashCode(this.y)
    return result
  }
  setCoordinate (other) {
    this.x = other.x
    this.y = other.y
    this.z = other.z
  }
  interfaces_ () {
    return [Comparable, Cloneable, Serializable]
  }
  getClass () {
    return Coordinate
  }
  static hashCode () {
    if (arguments.length === 1) {
      const x = arguments[0]
      const f = Double.doubleToLongBits(x)
      return Math.trunc((f ^ f) >>> 32)
    }
  }
  static get DimensionalComparator () { return DimensionalComparator }
  static get serialVersionUID () { return 6683108902428366910 }
  static get NULL_ORDINATE () { return Double.NaN }
  static get X () { return 0 }
  static get Y () { return 1 }
  static get Z () { return 2 }
}

class DimensionalComparator {
  constructor (dimensionsToTest) {
    this._dimensionsToTest = 2
    if (arguments.length === 0) {} else if (arguments.length === 1) {
      let dimensionsToTest = arguments[0]
      if (dimensionsToTest !== 2 && dimensionsToTest !== 3) throw new IllegalArgumentException('only 2 or 3 dimensions may be specified')
      this._dimensionsToTest = dimensionsToTest
    }
  }
  compare (o1, o2) {
    var c1 = o1
    var c2 = o2
    var compX = DimensionalComparator.compare(c1.x, c2.x)
    if (compX !== 0) return compX
    var compY = DimensionalComparator.compare(c1.y, c2.y)
    if (compY !== 0) return compY
    if (this._dimensionsToTest <= 2) return 0
    var compZ = DimensionalComparator.compare(c1.z, c2.z)
    return compZ
  }
  interfaces_ () {
    return [Comparator]
  }
  getClass () {
    return DimensionalComparator
  }
  static compare (a, b) {
    if (a < b) return -1
    if (a > b) return 1
    if (Double.isNaN(a)) {
      if (Double.isNaN(b)) return 0
      return -1
    }
    if (Double.isNaN(b)) return 1
    return 0
  }
}
