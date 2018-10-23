import LineSegment from '../geom/LineSegment'

export default class TaggedLineSegment extends LineSegment {
  constructor () {
    let p0
    let p1
    let parent
    let index
    if (arguments.length === 2) {
      p0 = arguments[0]
      p1 = arguments[1]
      parent = null
      index = -1
    } else if (arguments.length === 4) {
      p0 = arguments[0]
      p1 = arguments[1]
      parent = arguments[2]
      index = arguments[3]
    }
    super(p0, p1, parent, index)
    this._parent = parent
    this._index = index
  }
  getIndex () {
    return this._index
  }
  getParent () {
    return this._parent
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return TaggedLineSegment
  }
}
