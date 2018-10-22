import Node from '../../geomgraph/Node'

export default class RelateNode extends Node {
  constructor () {
    const coord = arguments[0]
    const edges = arguments[1]
    super(coord, edges)
  }
  updateIMFromEdges (im) {
    this._edges.updateIM(im)
  }
  computeIM (im) {
    im.setAtLeastIfValid(this._label.getLocation(0), this._label.getLocation(1), 0)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return RelateNode
  }
}
