import PointLocator from '../../algorithm/PointLocator'
import SegmentStringUtil from '../../noding/SegmentStringUtil'
import ComponentCoordinateExtracter from '../util/ComponentCoordinateExtracter'

export default class PreparedLineStringIntersects {
  constructor (prepLine) {
    this._prepLine = prepLine || null
  }
  isAnyTestPointInTarget (testGeom) {
    const locator = new PointLocator()
    const coords = ComponentCoordinateExtracter.getCoordinates(testGeom)
    for (const i = coords.iterator(); i.hasNext();) {
      const p = i.next()
      if (locator.intersects(p, this._prepLine.getGeometry())) return true
    }
    return false
  }
  intersects (geom) {
    const lineSegStr = SegmentStringUtil.extractSegmentStrings(geom)
    if (lineSegStr.size() > 0) {
      const segsIntersect = this._prepLine.getIntersectionFinder().intersects(lineSegStr)
      if (segsIntersect) return true
    }
    if (geom.getDimension() === 1) return false
    if (geom.getDimension() === 2 && this._prepLine.isAnyTargetComponentInTest(geom)) return true
    if (geom.getDimension() === 0) return this.isAnyTestPointInTarget(geom)
    return false
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PreparedLineStringIntersects
  }
  static intersects (prep, geom) {
    const op = new PreparedLineStringIntersects(prep)
    return op.intersects(geom)
  }
}
