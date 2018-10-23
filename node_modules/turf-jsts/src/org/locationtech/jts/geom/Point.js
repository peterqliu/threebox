import Geometry from './Geometry'
import CoordinateFilter from './CoordinateFilter'
import hasInterface from '../../../../hasInterface'
import GeometryComponentFilter from './GeometryComponentFilter'
import Dimension from './Dimension'
import GeometryFilter from './GeometryFilter'
import CoordinateSequenceFilter from './CoordinateSequenceFilter'
import Puntal from './Puntal'
import Envelope from './Envelope'
import Assert from '../util/Assert'

export default class Point extends Geometry {
  constructor (coordinates, factory) {
    super(factory)
    this._coordinates = coordinates || null
    this.init(this._coordinates)
  }
  computeEnvelopeInternal () {
    if (this.isEmpty()) {
      return new Envelope()
    }
    var env = new Envelope()
    env.expandToInclude(this._coordinates.getX(0), this._coordinates.getY(0))
    return env
  }
  getSortIndex () {
    return Geometry.SORTINDEX_POINT
  }
  getCoordinates () {
    return this.isEmpty() ? [] : [this.getCoordinate()]
  }
  equalsExact () {
    if (arguments.length === 2) {
      const other = arguments[0]
      const tolerance = arguments[1]
      if (!this.isEquivalentClass(other)) {
        return false
      }
      if (this.isEmpty() && other.isEmpty()) {
        return true
      }
      if (this.isEmpty() !== other.isEmpty()) {
        return false
      }
      return this.equal(other.getCoordinate(), this.getCoordinate(), tolerance)
    } else return Geometry.prototype.equalsExact.apply(this, arguments)
  }
  normalize () {}
  getCoordinate () {
    return this._coordinates.size() !== 0 ? this._coordinates.getCoordinate(0) : null
  }
  getBoundaryDimension () {
    return Dimension.FALSE
  }
  getDimension () {
    return 0
  }
  getNumPoints () {
    return this.isEmpty() ? 0 : 1
  }
  reverse () {
    return this.copy()
  }
  getX () {
    if (this.getCoordinate() === null) {
      throw new Error('getX called on empty Point')
    }
    return this.getCoordinate().x
  }
  compareToSameClass () {
    if (arguments.length === 1) {
      const other = arguments[0]
      const point = other
      return this.getCoordinate().compareTo(point.getCoordinate())
    } else if (arguments.length === 2) {
      const other = arguments[0]
      const comp = arguments[1]
      var point = other
      return comp.compare(this._coordinates, point._coordinates)
    }
  }
  apply () {
    if (hasInterface(arguments[0], CoordinateFilter)) {
      let filter = arguments[0]
      if (this.isEmpty()) {
        return null
      }
      filter.filter(this.getCoordinate())
    } else if (hasInterface(arguments[0], CoordinateSequenceFilter)) {
      let filter = arguments[0]
      if (this.isEmpty()) return null
      filter.filter(this._coordinates, 0)
      if (filter.isGeometryChanged()) this.geometryChanged()
    } else if (hasInterface(arguments[0], GeometryFilter)) {
      let filter = arguments[0]
      filter.filter(this)
    } else if (hasInterface(arguments[0], GeometryComponentFilter)) {
      let filter = arguments[0]
      filter.filter(this)
    }
  }
  getBoundary () {
    return this.getFactory().createGeometryCollection(null)
  }
  clone () {
    var p = Geometry.prototype.clone.call(this)
    p._coordinates = this._coordinates.clone()
    return p
  }
  getGeometryType () {
    return 'Point'
  }
  copy () {
    return new Point(this._coordinates.copy(), this._factory)
  }
  getCoordinateSequence () {
    return this._coordinates
  }
  getY () {
    if (this.getCoordinate() === null) {
      throw new Error('getY called on empty Point')
    }
    return this.getCoordinate().y
  }
  isEmpty () {
    return this._coordinates.size() === 0
  }
  init (coordinates) {
    if (coordinates === null) {
      coordinates = this.getFactory().getCoordinateSequenceFactory().create([])
    }
    Assert.isTrue(coordinates.size() <= 1)
    this._coordinates = coordinates
  }
  isSimple () {
    return true
  }
  interfaces_ () {
    return [Puntal]
  }
  getClass () {
    return Point
  }
  static get serialVersionUID () { return 4902022702746614570 }
}
