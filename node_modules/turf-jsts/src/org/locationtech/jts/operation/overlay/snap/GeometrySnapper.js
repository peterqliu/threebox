import TreeSet from '../../../../../../java/util/TreeSet'
import GeometryTransformer from '../../../geom/util/GeometryTransformer'
import hasInterface from '../../../../../../hasInterface'
import Double from '../../../../../../java/lang/Double'
import LineStringSnapper from './LineStringSnapper'
import PrecisionModel from '../../../geom/PrecisionModel'
import Polygonal from '../../../geom/Polygonal'

export default class GeometrySnapper {
  constructor (srcGeom) {
    this._srcGeom = srcGeom || null
  }
  snapTo (snapGeom, snapTolerance) {
    var snapPts = this.extractTargetCoordinates(snapGeom)
    var snapTrans = new SnapTransformer(snapTolerance, snapPts)
    return snapTrans.transform(this._srcGeom)
  }
  snapToSelf (snapTolerance, cleanResult) {
    var snapPts = this.extractTargetCoordinates(this._srcGeom)
    var snapTrans = new SnapTransformer(snapTolerance, snapPts, true)
    var snappedGeom = snapTrans.transform(this._srcGeom)
    var result = snappedGeom
    if (cleanResult && hasInterface(result, Polygonal)) {
      result = snappedGeom.buffer(0)
    }
    return result
  }
  computeSnapTolerance (ringPts) {
    var minSegLen = this.computeMinimumSegmentLength(ringPts)
    var snapTol = minSegLen / 10
    return snapTol
  }
  extractTargetCoordinates (g) {
    var ptSet = new TreeSet()
    var pts = g.getCoordinates()
    for (var i = 0; i < pts.length; i++) {
      ptSet.add(pts[i])
    }
    return ptSet.toArray(new Array(0).fill(null))
  }
  computeMinimumSegmentLength (pts) {
    var minSegLen = Double.MAX_VALUE
    for (var i = 0; i < pts.length - 1; i++) {
      var segLen = pts[i].distance(pts[i + 1])
      if (segLen < minSegLen) minSegLen = segLen
    }
    return minSegLen
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return GeometrySnapper
  }
  static snap (g0, g1, snapTolerance) {
    var snapGeom = new Array(2).fill(null)
    var snapper0 = new GeometrySnapper(g0)
    snapGeom[0] = snapper0.snapTo(g1, snapTolerance)
    var snapper1 = new GeometrySnapper(g1)
    snapGeom[1] = snapper1.snapTo(snapGeom[0], snapTolerance)
    return snapGeom
  }
  static computeOverlaySnapTolerance () {
    if (arguments.length === 1) {
      const g = arguments[0]
      let snapTolerance = GeometrySnapper.computeSizeBasedSnapTolerance(g)
      const pm = g.getPrecisionModel()
      if (pm.getType() === PrecisionModel.FIXED) {
        const fixedSnapTol = 1 / pm.getScale() * 2 / 1.415
        if (fixedSnapTol > snapTolerance) snapTolerance = fixedSnapTol
      }
      return snapTolerance
    } else if (arguments.length === 2) {
      const g0 = arguments[0]
      const g1 = arguments[1]
      return Math.min(GeometrySnapper.computeOverlaySnapTolerance(g0), GeometrySnapper.computeOverlaySnapTolerance(g1))
    }
  }
  static computeSizeBasedSnapTolerance (g) {
    var env = g.getEnvelopeInternal()
    var minDimension = Math.min(env.getHeight(), env.getWidth())
    var snapTol = minDimension * GeometrySnapper.SNAP_PRECISION_FACTOR
    return snapTol
  }
  static snapToSelf (geom, snapTolerance, cleanResult) {
    var snapper0 = new GeometrySnapper(geom)
    return snapper0.snapToSelf(snapTolerance, cleanResult)
  }
  static get SNAP_PRECISION_FACTOR () { return 1e-9 }
}

class SnapTransformer extends GeometryTransformer {
  constructor (snapTolerance, snapPts, isSelfSnap) {
    super()
    this._snapTolerance = snapTolerance || null
    this._snapPts = snapPts || null
    this._isSelfSnap = (isSelfSnap !== undefined) ? isSelfSnap : false
  }
  snapLine (srcPts, snapPts) {
    var snapper = new LineStringSnapper(srcPts, this._snapTolerance)
    snapper.setAllowSnappingToSourceVertices(this._isSelfSnap)
    return snapper.snapTo(snapPts)
  }
  transformCoordinates (coords, parent) {
    var srcPts = coords.toCoordinateArray()
    var newPts = this.snapLine(srcPts, this._snapPts)
    return this._factory.getCoordinateSequenceFactory().create(newPts)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return SnapTransformer
  }
}
