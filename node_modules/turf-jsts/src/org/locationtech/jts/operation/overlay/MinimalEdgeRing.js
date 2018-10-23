import EdgeRing from '../../geomgraph/EdgeRing'

export default class MinimalEdgeRing extends EdgeRing {
  constructor () {
    const start = arguments[0]
    const geometryFactory = arguments[1]
    super(start, geometryFactory)
  }
  setEdgeRing (de, er) {
    de.setMinEdgeRing(er)
  }
  getNext (de) {
    return de.getNextMin()
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return MinimalEdgeRing
  }
}
