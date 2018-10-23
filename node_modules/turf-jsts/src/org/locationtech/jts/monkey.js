import WKTWriter from './io/WKTWriter'
import GeometryCollectionMapper from './geom/util/GeometryCollectionMapper'
import IsValidOp from './operation/valid/IsValidOp'
import InteriorPointArea from './algorithm/InteriorPointArea'
import UnaryUnionOp from './operation/union/UnaryUnionOp'
import UnionOp from './operation/union/UnionOp'
import SnapIfNeededOverlayOp from './operation/overlay/snap/SnapIfNeededOverlayOp'
import InteriorPointLine from './algorithm/InteriorPointLine'
import IsSimpleOp from './operation/issimple/IsSimpleOp'
import BufferOp from './operation/buffer/BufferOp'
import ConvexHull from './algorithm/ConvexHull'
import Centroid from './algorithm/Centroid'
import RelateOp from './operation/relate/RelateOp'
import InteriorPointPoint from './algorithm/InteriorPointPoint'
import DistanceOp from './operation/distance/DistanceOp'
import OverlayOp from './operation/overlay/OverlayOp'
import Geometry from './geom/Geometry'
import GeometryMapper from './geom/util/GeometryMapper'

import extend from '../../../extend'

extend(Geometry.prototype, {
  equalsTopo: function (g) {
    if (!this.getEnvelopeInternal().equals(g.getEnvelopeInternal())) return false
    return RelateOp.relate(this, g).isEquals(this.getDimension(), g.getDimension())
  },
  union: function () {
    if (arguments.length === 0) {
      return UnaryUnionOp.union(this)
    } else if (arguments.length === 1) {
      const other = arguments[0]
      return UnionOp.union(this, other)
    }
  },
  isValid: function () {
    return IsValidOp.isValid(this)
  },
  intersection: function (other) {
    if (this.isEmpty() || other.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.INTERSECTION, this, other, this.factory)
    if (this.isGeometryCollection()) {
      const g2 = other
      return GeometryCollectionMapper.map(this, {
        interfaces_: function () {
          return [GeometryMapper.MapOp]
        },
        map: function (g) {
          return g.intersection(g2)
        }
      })
    }
    this.checkNotGeometryCollection(this)
    this.checkNotGeometryCollection(other)
    return SnapIfNeededOverlayOp.overlayOp(this, other, OverlayOp.INTERSECTION)
  },
  covers: function (g) {
    return RelateOp.covers(this, g)
  },
  coveredBy: function (g) {
    return RelateOp.coveredBy(this, g)
  },
  touches: function (g) {
    return RelateOp.touches(this, g)
  },
  intersects: function (g) {
    return RelateOp.intersects(this, g)
  },
  within: function (g) {
    return RelateOp.within(this, g)
  },
  overlaps: function (g) {
    return RelateOp.overlaps(this, g)
  },
  disjoint: function (g) {
    return RelateOp.disjoint(this, g)
  },
  crosses: function (g) {
    return RelateOp.crosses(this, g)
  },
  buffer: function () {
    if (arguments.length === 1) {
      const distance = arguments[0]
      return BufferOp.bufferOp(this, distance)
    } else if (arguments.length === 2) {
      const distance = arguments[0]
      const quadrantSegments = arguments[1]
      return BufferOp.bufferOp(this, distance, quadrantSegments)
    } else if (arguments.length === 3) {
      const distance = arguments[0]
      const quadrantSegments = arguments[1]
      const endCapStyle = arguments[2]
      return BufferOp.bufferOp(this, distance, quadrantSegments, endCapStyle)
    }
  },
  convexHull: function () {
    return new ConvexHull(this).getConvexHull()
  },
  relate: function (...args) {
    return RelateOp.relate(this, ...args)
  },
  getCentroid: function () {
    if (this.isEmpty()) return this._factory.createPoint()
    const centPt = Centroid.getCentroid(this)
    return this.createPointFromInternalCoord(centPt, this)
  },
  getInteriorPoint: function () {
    if (this.isEmpty()) return this._factory.createPoint()
    let interiorPt = null
    const dim = this.getDimension()
    if (dim === 0) {
      const intPt = new InteriorPointPoint(this)
      interiorPt = intPt.getInteriorPoint()
    } else if (dim === 1) {
      const intPt = new InteriorPointLine(this)
      interiorPt = intPt.getInteriorPoint()
    } else {
      const intPt = new InteriorPointArea(this)
      interiorPt = intPt.getInteriorPoint()
    }
    return this.createPointFromInternalCoord(interiorPt, this)
  },
  symDifference: function (other) {
    if (this.isEmpty() || other.isEmpty()) {
      if (this.isEmpty() && other.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.SYMDIFFERENCE, this, other, this.factory)
      if (this.isEmpty()) return other.copy()
      if (other.isEmpty()) return this.copy()
    }
    this.checkNotGeometryCollection(this)
    this.checkNotGeometryCollection(other)
    return SnapIfNeededOverlayOp.overlayOp(this, other, OverlayOp.SYMDIFFERENCE)
  },
  createPointFromInternalCoord: function (coord, exemplar) {
    exemplar.getPrecisionModel().makePrecise(coord)
    return exemplar.getFactory().createPoint(coord)
  },
  toText: function () {
    const writer = new WKTWriter()
    return writer.write(this)
  },
  toString: function () {
    this.toText()
  },
  contains: function (g) {
    return RelateOp.contains(this, g)
  },
  difference: function (other) {
    if (this.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.DIFFERENCE, this, other, this.factory)
    if (other.isEmpty()) return this.copy()
    this.checkNotGeometryCollection(this)
    this.checkNotGeometryCollection(other)
    return SnapIfNeededOverlayOp.overlayOp(this, other, OverlayOp.DIFFERENCE)
  },
  isSimple: function () {
    const op = new IsSimpleOp(this)
    return op.isSimple()
  },
  isWithinDistance: function (geom, distance) {
    const envDist = this.getEnvelopeInternal().distance(geom.getEnvelopeInternal())
    if (envDist > distance) return false
    return DistanceOp.isWithinDistance(this, geom, distance)
  },
  distance: function (g) {
    return DistanceOp.distance(this, g)
  },
  isEquivalentClass: function (other) {
    return this.getClass() === other.getClass()
  }
})
