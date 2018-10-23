import LineString from './LineString'
import Geometry from './Geometry'
import GeometryFactory from './GeometryFactory'
import Coordinate from './Coordinate'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import CoordinateSequences from './CoordinateSequences'
import Dimension from './Dimension'

export default class LinearRing extends LineString {
  constructor (points, factory) {
    if (points instanceof Coordinate && factory instanceof GeometryFactory) {
      points = factory.getCoordinateSequenceFactory().create(points)
    }
    super(points, factory)
    this.validateConstruction()
  }
  getSortIndex () {
    return Geometry.SORTINDEX_LINEARRING
  }
  getBoundaryDimension () {
    return Dimension.FALSE
  }
  isClosed () {
    if (this.isEmpty()) {
      return true
    }
    return LineString.prototype.isClosed.call(this)
  }
  reverse () {
    var seq = this._points.copy()
    CoordinateSequences.reverse(seq)
    var rev = this.getFactory().createLinearRing(seq)
    return rev
  }
  validateConstruction () {
    if (!this.isEmpty() && !LineString.prototype.isClosed.call(this)) {
      throw new IllegalArgumentException('Points of LinearRing do not form a closed linestring')
    }
    if (this.getCoordinateSequence().size() >= 1 && this.getCoordinateSequence().size() < LinearRing.MINIMUM_VALID_SIZE) {
      throw new IllegalArgumentException('Invalid number of points in LinearRing (found ' + this.getCoordinateSequence().size() + ' - must be 0 or >= 4)')
    }
  }
  getGeometryType () {
    return 'LinearRing'
  }
  copy () {
    return new LinearRing(this._points.copy(), this._factory)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return LinearRing
  }
  static get MINIMUM_VALID_SIZE () { return 4 }
  static get serialVersionUID () { return -4261142084085851829 }
}
