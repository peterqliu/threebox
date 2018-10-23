export default class GraphComponent {
  constructor () {
    this._isMarked = false
    this._isVisited = false
    this._data = null
  }
  setVisited (isVisited) {
    this._isVisited = isVisited
  }
  isMarked () {
    return this._isMarked
  }
  setData (data) {
    this._data = data
  }
  getData () {
    return this._data
  }
  setMarked (isMarked) {
    this._isMarked = isMarked
  }
  getContext () {
    return this._data
  }
  isVisited () {
    return this._isVisited
  }
  setContext (data) {
    this._data = data
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return GraphComponent
  }
  static getComponentWithVisitedState (i, visitedState) {
    while (i.hasNext()) {
      var comp = i.next()
      if (comp.isVisited() === visitedState) return comp
    }
    return null
  }
  static setVisited (i, visited) {
    while (i.hasNext()) {
      var comp = i.next()
      comp.setVisited(visited)
    }
  }
  static setMarked (i, marked) {
    while (i.hasNext()) {
      var comp = i.next()
      comp.setMarked(marked)
    }
  }
}
