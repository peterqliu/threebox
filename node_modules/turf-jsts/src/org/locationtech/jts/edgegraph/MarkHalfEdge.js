import HalfEdge from './HalfEdge'

export default class MarkHalfEdge extends HalfEdge {
  constructor () {
    let orig = arguments[0]
    super(orig)
    this._isMarked = false
  }
  mark () {
    this._isMarked = true
  }
  setMark (isMarked) {
    this._isMarked = isMarked
  }
  isMarked () {
    return this._isMarked
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return MarkHalfEdge
  }
  static setMarkBoth (e, isMarked) {
    e.setMark(isMarked)
    e.sym().setMark(isMarked)
  }
  static isMarked (e) {
    return e.isMarked()
  }
  static setMark (e, isMarked) {
    e.setMark(isMarked)
  }
  static markBoth (e) {
    e.mark()
    e.sym().mark()
  }
  static mark (e) {
    e.mark()
  }
}
