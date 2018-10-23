import LineString from '../geom/LineString'
import HashMap from '../../../../java/util/HashMap'
import GeometryTransformer from '../geom/util/GeometryTransformer'
import TaggedLinesSimplifier from './TaggedLinesSimplifier'
import IllegalArgumentException from '../../../../java/lang/IllegalArgumentException'
import GeometryComponentFilter from '../geom/GeometryComponentFilter'
import TaggedLineString from './TaggedLineString'

export default class TopologyPreservingSimplifier {
  constructor () {
    this._inputGeom = null
    this._lineSimplifier = new TaggedLinesSimplifier()
    this._linestringMap = null
    let inputGeom = arguments[0]
    this._inputGeom = inputGeom
  }
  getResultGeometry () {
    if (this._inputGeom.isEmpty()) return this._inputGeom.copy()
    this._linestringMap = new HashMap()
    this._inputGeom.apply(new LineStringMapBuilderFilter(this))
    this._lineSimplifier.simplify(this._linestringMap.values())
    var result = new LineStringTransformer(this._linestringMap).transform(this._inputGeom)
    return result
  }
  setDistanceTolerance (distanceTolerance) {
    if (distanceTolerance < 0.0) throw new IllegalArgumentException('Tolerance must be non-negative')
    this._lineSimplifier.setDistanceTolerance(distanceTolerance)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return TopologyPreservingSimplifier
  }
  static simplify (geom, distanceTolerance) {
    var tss = new TopologyPreservingSimplifier(geom)
    tss.setDistanceTolerance(distanceTolerance)
    return tss.getResultGeometry()
  }
  static get LineStringTransformer () { return LineStringTransformer }
  static get LineStringMapBuilderFilter () { return LineStringMapBuilderFilter }
}

class LineStringTransformer extends GeometryTransformer {
  constructor () {
    super()
    this._linestringMap = null
    let linestringMap = arguments[0]
    this._linestringMap = linestringMap
  }
  transformCoordinates (coords, parent) {
    if (coords.size() === 0) return null
    if (parent instanceof LineString) {
      var taggedLine = this._linestringMap.get(parent)
      return this.createCoordinateSequence(taggedLine.getResultCoordinates())
    }
    return GeometryTransformer.prototype.transformCoordinates.call(this, coords, parent)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return LineStringTransformer
  }
}

class LineStringMapBuilderFilter {
  constructor () {
    this.tps = null
    let tps = arguments[0]
    this.tps = tps
  }
  filter (geom) {
    if (geom instanceof LineString) {
      var line = geom
      if (line.isEmpty()) return null
      var minSize = line.isClosed() ? 4 : 2
      var taggedLine = new TaggedLineString(line, minSize)
      this.tps._linestringMap.put(line, taggedLine)
    }
  }
  interfaces_ () {
    return [GeometryComponentFilter]
  }
  getClass () {
    return LineStringMapBuilderFilter
  }
}
