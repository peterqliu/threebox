import FastSegmentSetIntersectionFinder from '../../noding/FastSegmentSetIntersectionFinder'
import SegmentStringUtil from '../../noding/SegmentStringUtil'
import PreparedLineStringIntersects from './PreparedLineStringIntersects'
import BasicPreparedGeometry from './BasicPreparedGeometry'

export default class PreparedLineString extends BasicPreparedGeometry {
  constructor (line) {
    super(line)
    this._segIntFinder = null
  }
  getIntersectionFinder () {
    if (this._segIntFinder === null) this._segIntFinder = new FastSegmentSetIntersectionFinder(SegmentStringUtil.extractSegmentStrings(this.getGeometry()))
    return this._segIntFinder
  }
  intersects (g) {
    if (!this.envelopesIntersect(g)) return false
    return PreparedLineStringIntersects.intersects(this, g)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PreparedLineString
  }
}
