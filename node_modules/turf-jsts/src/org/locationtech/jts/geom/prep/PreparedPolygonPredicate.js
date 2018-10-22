import Location from '../Location'
import ComponentCoordinateExtracter from '../util/ComponentCoordinateExtracter'
import SimplePointInAreaLocator from '../../algorithm/locate/SimplePointInAreaLocator'

export default class PreparedPolygonPredicate {
  constructor (prepPoly) {
    this._prepPoly = null
    this._targetPointLocator = null
    this._prepPoly = prepPoly
    this._targetPointLocator = prepPoly.getPointLocator()
  }
  isAnyTargetComponentInAreaTest (testGeom, targetRepPts) {
    const piaLoc = new SimplePointInAreaLocator(testGeom)
    for (const i = targetRepPts.iterator(); i.hasNext();) {
      const p = i.next()
      const loc = piaLoc.locate(p)
      if (loc !== Location.EXTERIOR) return true
    }
    return false
  }
  isAllTestComponentsInTarget (testGeom) {
    const coords = ComponentCoordinateExtracter.getCoordinates(testGeom)
    for (const i = coords.iterator(); i.hasNext();) {
      const p = i.next()
      const loc = this._targetPointLocator.locate(p)
      if (loc === Location.EXTERIOR) return false
    }
    return true
  }
  isAnyTestComponentInTargetInterior (testGeom) {
    const coords = ComponentCoordinateExtracter.getCoordinates(testGeom)
    for (const i = coords.iterator(); i.hasNext();) {
      const p = i.next()
      const loc = this._targetPointLocator.locate(p)
      if (loc === Location.INTERIOR) return true
    }
    return false
  }
  isAllTestComponentsInTargetInterior (testGeom) {
    const coords = ComponentCoordinateExtracter.getCoordinates(testGeom)
    for (const i = coords.iterator(); i.hasNext();) {
      const p = i.next()
      const loc = this._targetPointLocator.locate(p)
      if (loc !== Location.INTERIOR) return false
    }
    return true
  }
  isAnyTestComponentInTarget (testGeom) {
    const coords = ComponentCoordinateExtracter.getCoordinates(testGeom)
    for (const i = coords.iterator(); i.hasNext();) {
      const p = i.next()
      const loc = this._targetPointLocator.locate(p)
      if (loc !== Location.EXTERIOR) return true
    }
    return false
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PreparedPolygonPredicate
  }
}
