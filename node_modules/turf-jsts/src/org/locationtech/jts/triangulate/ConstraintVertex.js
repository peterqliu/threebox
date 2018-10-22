import Vertex from './quadedge/Vertex'

export default class ConstraintVertex extends Vertex {
  constructor (p) {
    super(p)
    this._isOnConstraint = null
    this._constraint = null
  }
  getConstraint () {
    return this._constraint
  }
  setOnConstraint (isOnConstraint) {
    this._isOnConstraint = isOnConstraint
  }
  merge (other) {
    if (other._isOnConstraint) {
      this._isOnConstraint = true
      this._constraint = other._constraint
    }
  }
  isOnConstraint () {
    return this._isOnConstraint
  }
  setConstraint (constraint) {
    this._isOnConstraint = true
    this._constraint = constraint
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return ConstraintVertex
  }
}
