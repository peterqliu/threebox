import EdgeGraph from '../edgegraph/EdgeGraph'
import DissolveHalfEdge from './DissolveHalfEdge'

export default class DissolveEdgeGraph extends EdgeGraph {
  createEdge (p0) {
    return new DissolveHalfEdge(p0)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return DissolveEdgeGraph
  }
}
