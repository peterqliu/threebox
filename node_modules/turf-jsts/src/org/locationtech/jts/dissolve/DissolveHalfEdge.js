import MarkHalfEdge from '../edgegraph/MarkHalfEdge'

export default class DissolveHalfEdge extends MarkHalfEdge {
  constructor () {
    const orig = arguments[0]
    super(orig)
    this._isStart = false
  }
  setStart () {
    this._isStart = true
  }
  isStart () {
    return this._isStart
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return DissolveHalfEdge
  }
}
