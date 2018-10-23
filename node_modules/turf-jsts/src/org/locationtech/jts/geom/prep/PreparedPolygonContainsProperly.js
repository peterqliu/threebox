import hasInterface from '../../../../../hasInterface'
import SegmentStringUtil from '../../noding/SegmentStringUtil'
import Polygonal from '../Polygonal'
import PreparedPolygonPredicate from './PreparedPolygonPredicate'

export default class PreparedPolygonContainsProperly extends PreparedPolygonPredicate {
  containsProperly (geom) {
    const isAllInPrepGeomAreaInterior = this.isAllTestComponentsInTargetInterior(geom)
    if (!isAllInPrepGeomAreaInterior) return false
    const lineSegStr = SegmentStringUtil.extractSegmentStrings(geom)
    const segsIntersect = this._prepPoly.getIntersectionFinder().intersects(lineSegStr)
    if (segsIntersect) return false
    if (hasInterface(geom, Polygonal)) {
      const isTargetGeomInTestArea = this.isAnyTargetComponentInAreaTest(geom, this._prepPoly.getRepresentativePoints())
      if (isTargetGeomInTestArea) return false
    }
    return true
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PreparedPolygonContainsProperly
  }
  static containsProperly (prep, geom) {
    const polyInt = new PreparedPolygonContainsProperly(prep)
    return polyInt.containsProperly(geom)
  }
}
