import CoordinateSequenceFactory from './CoordinateSequenceFactory'
import LineString from './LineString'
import hasInterface from '../../../../hasInterface'
import Coordinate from './Coordinate'
import Point from './Point'
import Polygon from './Polygon'
import MultiPoint from './MultiPoint'
import GeometryEditor from './util/GeometryEditor'
import LinearRing from './LinearRing'
import CoordinateArraySequenceFactory from './impl/CoordinateArraySequenceFactory'
import MultiPolygon from './MultiPolygon'
import CoordinateSequences from './CoordinateSequences'
import CoordinateSequence from './CoordinateSequence'
import GeometryCollection from './GeometryCollection'
import PrecisionModel from './PrecisionModel'
import Serializable from '../../../../java/io/Serializable'
import Assert from '../util/Assert'
import MultiLineString from './MultiLineString'

export default class GeometryFactory {
  constructor () {
    this._precisionModel = new PrecisionModel()
    this._SRID = 0
    this._coordinateSequenceFactory = GeometryFactory.getDefaultCoordinateSequenceFactory()

    if (arguments.length === 0) {
    } else if (arguments.length === 1) {
      if (hasInterface(arguments[0], CoordinateSequenceFactory)) {
        this._coordinateSequenceFactory = arguments[0]
      } else if (arguments[0] instanceof PrecisionModel) {
        this._precisionModel = arguments[0]
      }
    } else if (arguments.length === 2) {
      this._precisionModel = arguments[0]
      this._SRID = arguments[1]
    } else if (arguments.length === 3) {
      this._precisionModel = arguments[0]
      this._SRID = arguments[1]
      this._coordinateSequenceFactory = arguments[2]
    }
  }
  toGeometry (envelope) {
    if (envelope.isNull()) {
      return this.createPoint(null)
    }
    if (envelope.getMinX() === envelope.getMaxX() && envelope.getMinY() === envelope.getMaxY()) {
      return this.createPoint(new Coordinate(envelope.getMinX(), envelope.getMinY()))
    }
    if (envelope.getMinX() === envelope.getMaxX() || envelope.getMinY() === envelope.getMaxY()) {
      return this.createLineString([new Coordinate(envelope.getMinX(), envelope.getMinY()), new Coordinate(envelope.getMaxX(), envelope.getMaxY())])
    }
    return this.createPolygon(this.createLinearRing([new Coordinate(envelope.getMinX(), envelope.getMinY()), new Coordinate(envelope.getMinX(), envelope.getMaxY()), new Coordinate(envelope.getMaxX(), envelope.getMaxY()), new Coordinate(envelope.getMaxX(), envelope.getMinY()), new Coordinate(envelope.getMinX(), envelope.getMinY())]), null)
  }
  createLineString (coordinates) {
    if (!coordinates) return new LineString(this.getCoordinateSequenceFactory().create([]), this)
    else if (coordinates instanceof Array) return new LineString(this.getCoordinateSequenceFactory().create(coordinates), this)
    else if (hasInterface(coordinates, CoordinateSequence)) return new LineString(coordinates, this)
  }
  createMultiLineString () {
    if (arguments.length === 0) {
      return new MultiLineString(null, this)
    } else if (arguments.length === 1) {
      let lineStrings = arguments[0]
      return new MultiLineString(lineStrings, this)
    }
  }
  buildGeometry (geomList) {
    var geomClass = null
    var isHeterogeneous = false
    var hasGeometryCollection = false
    for (var i = geomList.iterator(); i.hasNext();) {
      var geom = i.next()
      var partClass = geom.getClass()
      if (geomClass === null) {
        geomClass = partClass
      }
      if (partClass !== geomClass) {
        isHeterogeneous = true
      }
      if (geom.isGeometryCollectionOrDerived()) hasGeometryCollection = true
    }
    if (geomClass === null) {
      return this.createGeometryCollection()
    }
    if (isHeterogeneous || hasGeometryCollection) {
      return this.createGeometryCollection(GeometryFactory.toGeometryArray(geomList))
    }
    var geom0 = geomList.iterator().next()
    var isCollection = geomList.size() > 1
    if (isCollection) {
      if (geom0 instanceof Polygon) {
        return this.createMultiPolygon(GeometryFactory.toPolygonArray(geomList))
      } else if (geom0 instanceof LineString) {
        return this.createMultiLineString(GeometryFactory.toLineStringArray(geomList))
      } else if (geom0 instanceof Point) {
        return this.createMultiPoint(GeometryFactory.toPointArray(geomList))
      }
      Assert.shouldNeverReachHere('Unhandled class: ' + geom0.getClass().getName())
    }
    return geom0
  }
  createMultiPointFromCoords (coordinates) {
    return this.createMultiPoint(coordinates !== null ? this.getCoordinateSequenceFactory().create(coordinates) : null)
  }
  createPoint () {
    if (arguments.length === 0) {
      return this.createPoint(this.getCoordinateSequenceFactory().create([]))
    } else if (arguments.length === 1) {
      if (arguments[0] instanceof Coordinate) {
        let coordinate = arguments[0]
        return this.createPoint(coordinate !== null ? this.getCoordinateSequenceFactory().create([coordinate]) : null)
      } else if (hasInterface(arguments[0], CoordinateSequence)) {
        let coordinates = arguments[0]
        return new Point(coordinates, this)
      }
    }
  }
  getCoordinateSequenceFactory () {
    return this._coordinateSequenceFactory
  }
  createPolygon () {
    if (arguments.length === 0) {
      return new Polygon(null, null, this)
    } else if (arguments.length === 1) {
      if (hasInterface(arguments[0], CoordinateSequence)) {
        let coordinates = arguments[0]
        return this.createPolygon(this.createLinearRing(coordinates))
      } else if (arguments[0] instanceof Array) {
        let coordinates = arguments[0]
        return this.createPolygon(this.createLinearRing(coordinates))
      } else if (arguments[0] instanceof LinearRing) {
        let shell = arguments[0]
        return this.createPolygon(shell, null)
      }
    } else if (arguments.length === 2) {
      const shell = arguments[0]
      const holes = arguments[1]
      return new Polygon(shell, holes, this)
    }
  }
  getSRID () {
    return this._SRID
  }
  createGeometryCollection () {
    if (arguments.length === 0) {
      return new GeometryCollection(null, this)
    } else if (arguments.length === 1) {
      let geometries = arguments[0]
      return new GeometryCollection(geometries, this)
    }
  }
  createGeometry (g) {
    var editor = new GeometryEditor(this)
    return editor.edit(g, {
      edit: function () {
        if (arguments.length === 2) {
          const coordSeq = arguments[0]
          // const geometry = arguments[1]
          return this._coordinateSequenceFactory.create(coordSeq)
        }
      }
    })
  }
  getPrecisionModel () {
    return this._precisionModel
  }
  createLinearRing () {
    if (arguments.length === 0) {
      return this.createLinearRing(this.getCoordinateSequenceFactory().create([]))
    } else if (arguments.length === 1) {
      if (arguments[0] instanceof Array) {
        let coordinates = arguments[0]
        return this.createLinearRing(coordinates !== null ? this.getCoordinateSequenceFactory().create(coordinates) : null)
      } else if (hasInterface(arguments[0], CoordinateSequence)) {
        let coordinates = arguments[0]
        return new LinearRing(coordinates, this)
      }
    }
  }
  createMultiPolygon () {
    if (arguments.length === 0) {
      return new MultiPolygon(null, this)
    } else if (arguments.length === 1) {
      let polygons = arguments[0]
      return new MultiPolygon(polygons, this)
    }
  }
  createMultiPoint () {
    if (arguments.length === 0) {
      return new MultiPoint(null, this)
    } else if (arguments.length === 1) {
      if (arguments[0] instanceof Array) {
        let point = arguments[0]
        return new MultiPoint(point, this)
      } else if (arguments[0] instanceof Array) {
        let coordinates = arguments[0]
        return this.createMultiPoint(coordinates !== null ? this.getCoordinateSequenceFactory().create(coordinates) : null)
      } else if (hasInterface(arguments[0], CoordinateSequence)) {
        let coordinates = arguments[0]
        if (coordinates === null) {
          return this.createMultiPoint(new Array(0).fill(null))
        }
        var points = new Array(coordinates.size()).fill(null)
        for (var i = 0; i < coordinates.size(); i++) {
          var ptSeq = this.getCoordinateSequenceFactory().create(1, coordinates.getDimension())
          CoordinateSequences.copy(coordinates, i, ptSeq, 0, 1)
          points[i] = this.createPoint(ptSeq)
        }
        return this.createMultiPoint(points)
      }
    }
  }
  interfaces_ () {
    return [Serializable]
  }
  getClass () {
    return GeometryFactory
  }
  static toMultiPolygonArray (multiPolygons) {
    var multiPolygonArray = new Array(multiPolygons.size()).fill(null)
    return multiPolygons.toArray(multiPolygonArray)
  }
  static toGeometryArray (geometries) {
    if (geometries === null) return null
    var geometryArray = new Array(geometries.size()).fill(null)
    return geometries.toArray(geometryArray)
  }
  static getDefaultCoordinateSequenceFactory () {
    return CoordinateArraySequenceFactory.instance()
  }
  static toMultiLineStringArray (multiLineStrings) {
    var multiLineStringArray = new Array(multiLineStrings.size()).fill(null)
    return multiLineStrings.toArray(multiLineStringArray)
  }
  static toLineStringArray (lineStrings) {
    var lineStringArray = new Array(lineStrings.size()).fill(null)
    return lineStrings.toArray(lineStringArray)
  }
  static toMultiPointArray (multiPoints) {
    var multiPointArray = new Array(multiPoints.size()).fill(null)
    return multiPoints.toArray(multiPointArray)
  }
  static toLinearRingArray (linearRings) {
    var linearRingArray = new Array(linearRings.size()).fill(null)
    return linearRings.toArray(linearRingArray)
  }
  static toPointArray (points) {
    var pointArray = new Array(points.size()).fill(null)
    return points.toArray(pointArray)
  }
  static toPolygonArray (polygons) {
    var polygonArray = new Array(polygons.size()).fill(null)
    return polygons.toArray(polygonArray)
  }
  static createPointFromInternalCoord (coord, exemplar) {
    exemplar.getPrecisionModel().makePrecise(coord)
    return exemplar.getFactory().createPoint(coord)
  }
  static get serialVersionUID () { return -6820524753094095635 }
}
