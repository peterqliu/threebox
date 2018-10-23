import BasicPreparedGeometry from './BasicPreparedGeometry'

export default class PreparedPoint extends BasicPreparedGeometry {
  intersects (g) {
    if (!this.envelopesIntersect(g)) return false
    return this.isAnyTargetComponentInTest(g)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PreparedPoint
  }
}
