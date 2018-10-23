import LineString from '../LineString'
import Point from '../Point'
import Polygon from '../Polygon'
import MultiPoint from '../MultiPoint'
import LinearRing from '../LinearRing'
import MultiPolygon from '../MultiPolygon'
import GeometryCollection from '../GeometryCollection'
import ArrayList from '../../../../../java/util/ArrayList'
import Assert from '../../util/Assert'
import MultiLineString from '../MultiLineString'

export default class GeometryEditor {
  constructor (factory) {
    this._factory = factory || null
    this._isUserDataCopied = false
  }
  setCopyUserData (isUserDataCopied) {
    this._isUserDataCopied = isUserDataCopied
  }
  edit (geometry, operation) {
    if (geometry === null) return null
    var result = this.editInternal(geometry, operation)
    if (this._isUserDataCopied) {
      result.setUserData(geometry.getUserData())
    }
    return result
  }
  editInternal (geometry, operation) {
    if (this._factory === null) this._factory = geometry.getFactory()
    if (geometry instanceof GeometryCollection) {
      return this.editGeometryCollection(geometry, operation)
    }
    if (geometry instanceof Polygon) {
      return this.editPolygon(geometry, operation)
    }
    if (geometry instanceof Point) {
      return operation.edit(geometry, this._factory)
    }
    if (geometry instanceof LineString) {
      return operation.edit(geometry, this._factory)
    }
    Assert.shouldNeverReachHere('Unsupported Geometry class: ' + geometry.getClass().getName())
    return null
  }
  editGeometryCollection (collection, operation) {
    var collectionForType = operation.edit(collection, this._factory)
    var geometries = new ArrayList()
    for (var i = 0; i < collectionForType.getNumGeometries(); i++) {
      var geometry = this.edit(collectionForType.getGeometryN(i), operation)
      if (geometry === null || geometry.isEmpty()) {
        continue
      }
      geometries.add(geometry)
    }
    if (collectionForType.getClass() === MultiPoint) {
      return this._factory.createMultiPoint(geometries.toArray([]))
    }
    if (collectionForType.getClass() === MultiLineString) {
      return this._factory.createMultiLineString(geometries.toArray([]))
    }
    if (collectionForType.getClass() === MultiPolygon) {
      return this._factory.createMultiPolygon(geometries.toArray([]))
    }
    return this._factory.createGeometryCollection(geometries.toArray([]))
  }
  editPolygon (polygon, operation) {
    var newPolygon = operation.edit(polygon, this._factory)
    if (newPolygon === null) newPolygon = this._factory.createPolygon(null)
    if (newPolygon.isEmpty()) {
      return newPolygon
    }
    var shell = this.edit(newPolygon.getExteriorRing(), operation)
    if (shell === null || shell.isEmpty()) {
      return this._factory.createPolygon()
    }
    var holes = new ArrayList()
    for (var i = 0; i < newPolygon.getNumInteriorRing(); i++) {
      var hole = this.edit(newPolygon.getInteriorRingN(i), operation)
      if (hole === null || hole.isEmpty()) {
        continue
      }
      holes.add(hole)
    }
    return this._factory.createPolygon(shell, holes.toArray([]))
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return GeometryEditor
  }
  static GeometryEditorOperation () {}
  static get NoOpGeometryOperation () { return NoOpGeometryOperation }
  static get CoordinateOperation () { return CoordinateOperation }
  static get CoordinateSequenceOperation () { return CoordinateSequenceOperation }
}

class NoOpGeometryOperation {
  edit (geometry, factory) {
    return geometry
  }
  interfaces_ () {
    return [GeometryEditor.GeometryEditorOperation]
  }
  getClass () {
    return NoOpGeometryOperation
  }
}

class CoordinateOperation {
  edit (geometry, factory) {
    var coords = this.editCoordinates(geometry.getCoordinates(), geometry)
    if (coords === null) return geometry
    if (geometry instanceof LinearRing) {
      return factory.createLinearRing(coords)
    }
    if (geometry instanceof LineString) {
      return factory.createLineString(coords)
    }
    if (geometry instanceof Point) {
      if (coords.length > 0) {
        return factory.createPoint(coords[0])
      } else {
        return factory.createPoint()
      }
    }
    return geometry
  }
  interfaces_ () {
    return [GeometryEditor.GeometryEditorOperation]
  }
  getClass () {
    return CoordinateOperation
  }
}

class CoordinateSequenceOperation {
  edit (geometry, factory) {
    if (geometry instanceof LinearRing) {
      return factory.createLinearRing(this.edit(geometry.getCoordinateSequence(), geometry))
    }
    if (geometry instanceof LineString) {
      return factory.createLineString(this.edit(geometry.getCoordinateSequence(), geometry))
    }
    if (geometry instanceof Point) {
      return factory.createPoint(this.edit(geometry.getCoordinateSequence(), geometry))
    }
    return geometry
  }
  interfaces_ () {
    return [GeometryEditor.GeometryEditorOperation]
  }
  getClass () {
    return CoordinateSequenceOperation
  }
}
