import DirectedEdge from '../../planargraph/DirectedEdge'

export default class PolygonizeDirectedEdge extends DirectedEdge {
  constructor () {
    const from = arguments[0]
    const to = arguments[1]
    const directionPt = arguments[2]
    const edgeDirection = arguments[3]
    super(from, to, directionPt, edgeDirection)
    this._edgeRing = null
    this._next = null
    this._label = -1
  }
  getNext () {
    return this._next
  }
  isInRing () {
    return this._edgeRing !== null
  }
  setRing (edgeRing) {
    this._edgeRing = edgeRing
  }
  setLabel (label) {
    this._label = label
  }
  getLabel () {
    return this._label
  }
  setNext (next) {
    this._next = next
  }
  getRing () {
    return this._edgeRing
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PolygonizeDirectedEdge
  }
}
