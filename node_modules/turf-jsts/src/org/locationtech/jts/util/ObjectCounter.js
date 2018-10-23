import HashMap from '../../../../java/util/HashMap'

export default class ObjectCounter {
  constructor () {
    this._counts = new HashMap()
  }
  count (o) {
    var counter = this._counts.get(o)
    if (counter === null) return 0; else return counter.count()
  }
  add (o) {
    var counter = this._counts.get(o)
    if (counter === null) this._counts.put(o, new Counter(1)); else counter.increment()
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return ObjectCounter
  }
  static get Counter () { return Counter }
}

class Counter {
  constructor () {
    this.count = 0
    if (arguments.length === 0) {} else if (arguments.length === 1) {
      let count = arguments[0]
      this.count = count
    }
  }
  count () {
    return this.count
  }
  increment () {
    this.count++
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return Counter
  }
}
