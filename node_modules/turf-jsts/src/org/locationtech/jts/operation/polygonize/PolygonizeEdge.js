import Edge from '../../planargraph/Edge'

export default class PolygonizeEdge extends Edge {
  constructor () {
    super()
    this._line = arguments[0] || null
  }
  getLine () {
    return this._line
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return PolygonizeEdge
  }
}
