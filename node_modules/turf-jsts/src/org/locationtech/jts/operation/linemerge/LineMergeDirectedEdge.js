import DirectedEdge from '../../planargraph/DirectedEdge'
import Assert from '../../util/Assert'

export default class LineMergeDirectedEdge extends DirectedEdge {
  constructor () {
    const from = arguments[0]
    const to = arguments[1]
    const directionPt = arguments[2]
    const edgeDirection = arguments[3]
    super(from, to, directionPt, edgeDirection)
  }
  getNext () {
    if (this.getToNode().getDegree() !== 2) {
      return null
    }
    if (this.getToNode().getOutEdges().getEdges().get(0) === this.getSym()) {
      return this.getToNode().getOutEdges().getEdges().get(1)
    }
    Assert.isTrue(this.getToNode().getOutEdges().getEdges().get(1) === this.getSym())
    return this.getToNode().getOutEdges().getEdges().get(0)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return LineMergeDirectedEdge
  }
}
