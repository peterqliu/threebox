import LineString from '../geom/LineString'
import CoordinateList from '../geom/CoordinateList'
import Coordinate from '../geom/Coordinate'
import GeometryEditor from '../geom/util/GeometryEditor'
import LinearRing from '../geom/LinearRing'

export default class PrecisionReducerCoordinateOperation extends GeometryEditor.CoordinateOperation {
  constructor (targetPM, removeCollapsed) {
    super()
    this._targetPM = targetPM || null
    this._removeCollapsed = (removeCollapsed !== undefined) ? removeCollapsed : true
  }
  editCoordinates (coordinates, geom) {
    if (coordinates.length === 0) return null
    const reducedCoords = new Array(coordinates.length).fill(null)
    for (let i = 0; i < coordinates.length; i++) {
      const coord = new Coordinate(coordinates[i])
      this._targetPM.makePrecise(coord)
      reducedCoords[i] = coord
    }
    const noRepeatedCoordList = new CoordinateList(reducedCoords, false)
    const noRepeatedCoords = noRepeatedCoordList.toCoordinateArray()
    let minLength = 0
    if (geom instanceof LineString) minLength = 2
    if (geom instanceof LinearRing) minLength = 4
    let collapsedCoords = reducedCoords
    if (this._removeCollapsed) collapsedCoords = null
    if (noRepeatedCoords.length < minLength) {
      return collapsedCoords
    }
    return noRepeatedCoords
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PrecisionReducerCoordinateOperation
  }
}
