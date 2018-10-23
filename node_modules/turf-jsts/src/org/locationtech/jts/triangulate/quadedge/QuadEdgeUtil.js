import ArrayList from '../../../../../java/util/ArrayList'

export default class QuadEdgeUtil {
  interfaces_ () {
    return []
  }
  getClass () {
    return QuadEdgeUtil
  }
  static findEdgesIncidentOnOrigin (start) {
    var incEdge = new ArrayList()
    var qe = start
    do {
      incEdge.add(qe)
      qe = qe.oNext()
    } while (qe !== start)
    return incEdge
  }
}
