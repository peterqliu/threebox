import GeometryTransformer from '../geom/util/GeometryTransformer'
import VWLineSimplifier from './VWLineSimplifier'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import Polygon from '../geom/Polygon'
import LinearRing from '../geom/LinearRing'
import MultiPolygon from '../geom/MultiPolygon'

export default class VWSimplifier {
  constructor () {
    this._inputGeom = null
    this._distanceTolerance = null
    this._isEnsureValidTopology = true
    let inputGeom = arguments[0]
    this._inputGeom = inputGeom
  }
  setEnsureValid (isEnsureValidTopology) {
    this._isEnsureValidTopology = isEnsureValidTopology
  }
  getResultGeometry () {
    if (this._inputGeom.isEmpty()) return this._inputGeom.copy()
    return new VWTransformer(this._isEnsureValidTopology, this._distanceTolerance).transform(this._inputGeom)
  }
  setDistanceTolerance (distanceTolerance) {
    if (distanceTolerance < 0.0) throw new IllegalArgumentException('Tolerance must be non-negative')
    this._distanceTolerance = distanceTolerance
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return VWSimplifier
  }
  static simplify (geom, distanceTolerance) {
    var simp = new VWSimplifier(geom)
    simp.setDistanceTolerance(distanceTolerance)
    return simp.getResultGeometry()
  }
  static get VWTransformer () { return VWTransformer }
}

class VWTransformer extends GeometryTransformer {
  constructor () {
    super()
    this._isEnsureValidTopology = true
    this._distanceTolerance = null
    const isEnsureValidTopology = arguments[0]
    const distanceTolerance = arguments[1]
    this._isEnsureValidTopology = isEnsureValidTopology
    this._distanceTolerance = distanceTolerance
  }
  transformPolygon (geom, parent) {
    if (geom.isEmpty()) return null
    var rawGeom = GeometryTransformer.prototype.transformPolygon.call(this, geom, parent)
    if (parent instanceof MultiPolygon) {
      return rawGeom
    }
    return this.createValidArea(rawGeom)
  }
  createValidArea (rawAreaGeom) {
    if (this._isEnsureValidTopology) return rawAreaGeom.buffer(0.0)
    return rawAreaGeom
  }
  transformCoordinates (coords, parent) {
    var inputPts = coords.toCoordinateArray()
    var newPts = null
    if (inputPts.length === 0) {
      newPts = new Array(0).fill(null)
    } else {
      newPts = VWLineSimplifier.simplify(inputPts, this._distanceTolerance)
    }
    return this._factory.getCoordinateSequenceFactory().create(newPts)
  }
  transformMultiPolygon (geom, parent) {
    var rawGeom = GeometryTransformer.prototype.transformMultiPolygon.call(this, geom, parent)
    return this.createValidArea(rawGeom)
  }
  transformLinearRing (geom, parent) {
    var removeDegenerateRings = parent instanceof Polygon
    var simpResult = GeometryTransformer.prototype.transformLinearRing.call(this, geom, parent)
    if (removeDegenerateRings && !(simpResult instanceof LinearRing)) return null

    return simpResult
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return VWTransformer
  }
}
