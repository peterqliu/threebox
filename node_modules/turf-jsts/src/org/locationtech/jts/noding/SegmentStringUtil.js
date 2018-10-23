import StringBuffer from '../../../../java/lang/StringBuffer'
import NodedSegmentString from './NodedSegmentString'
import ArrayList from '../../../../java/util/ArrayList'
import LinearComponentExtracter from '../geom/util/LinearComponentExtracter'

export default class SegmentStringUtil {
  interfaces_ () {
    return []
  }
  getClass () {
    return SegmentStringUtil
  }
  static toGeometry (segStrings, geomFact) {
    const lines = new Array(segStrings.size()).fill(null)
    let index = 0
    for (const i = segStrings.iterator(); i.hasNext();) {
      const ss = i.next()
      const line = geomFact.createLineString(ss.getCoordinates())
      lines[index++] = line
    }
    if (lines.length === 1) return lines[0]
    return geomFact.createMultiLineString(lines)
  }
  static extractNodedSegmentStrings (geom) {
    const segStr = new ArrayList()
    const lines = LinearComponentExtracter.getLines(geom)
    for (const i = lines.iterator(); i.hasNext();) {
      const line = i.next()
      const pts = line.getCoordinates()
      segStr.add(new NodedSegmentString(pts, geom))
    }
    return segStr
  }
  static extractSegmentStrings (geom) {
    return SegmentStringUtil.extractNodedSegmentStrings(geom)
  }
  static toString () {
    if (arguments.length === 1) {
      let segStrings = arguments[0]
      const buf = new StringBuffer()
      for (const i = segStrings.iterator(); i.hasNext();) {
        const segStr = i.next()
        buf.append(segStr.toString())
        buf.append('\n')
      }
      return buf.toString()
    }
  }
}
