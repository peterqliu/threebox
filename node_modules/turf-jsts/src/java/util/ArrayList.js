import Collection from './Collection'
import IndexOutOfBoundsException from './IndexOutOfBoundsException'
import Iterator from './Iterator'
import List from './List'
import NoSuchElementException from './NoSuchElementException'
// import OperationNotSupported from './OperationNotSupported'

/**
 * @see http://download.oracle.com/javase/6/docs/api/java/util/ArrayList.html
 *
 * @extends List
 * @private
 */
export default class ArrayList extends List {
  constructor () {
    super()
    this.array_ = []

    if (arguments[0] instanceof Collection) {
      this.addAll(arguments[0])
    }
  }

  ensureCapacity () {}
  interfaces_ () { return [List, Collection] }

  /**
   * @override
   */
  add (e) {
    if (arguments.length === 1) {
      this.array_.push(e)
    } else {
      this.array_.splice(arguments[0], arguments[1])
    }
    return true
  }

  clear () {
    this.array_ = []
  }

  /**
   * @override
   */
  addAll (c) {
    for (var i = c.iterator(); i.hasNext();) {
      this.add(i.next())
    }
    return true
  }

  /**
   * @override
   */
  set (index, element) {
    var oldElement = this.array_[index]
    this.array_[index] = element
    return oldElement
  }

  /**
   * @override
   */
  iterator () {
    return new Iterator_(this)
  }

  /**
   * @override
   */
  get (index) {
    if (index < 0 || index >= this.size()) {
      throw new IndexOutOfBoundsException()
    }

    return this.array_[index]
  }

  /**
   * @override
   */
  isEmpty () {
    return this.array_.length === 0
  }

  /**
   * @override
   */
  size () {
    return this.array_.length
  }

  /**
   * @override
   */
  toArray () {
    var array = []

    for (var i = 0, len = this.array_.length; i < len; i++) {
      array.push(this.array_[i])
    }

    return array
  }

  /**
   * @override
   */
  remove (o) {
    var found = false

    for (var i = 0, len = this.array_.length; i < len; i++) {
      if (this.array_[i] === o) {
        this.array_.splice(i, 1)
        found = true
        break
      }
    }

    return found
  }
}

/**
 * @extends {Iterator}
 * @param {ArrayList} arrayList
 * @constructor
 * @private
 */
class Iterator_ extends Iterator {
  constructor (arrayList) {
    super()
    /**
     * @type {ArrayList}
     * @private
    */
    this.arrayList_ = arrayList
    /**
     * @type {number}
     * @private
    */
    this.position_ = 0
  }

  /**
   * @override
   */
  next () {
    if (this.position_ === this.arrayList_.size()) {
      throw new NoSuchElementException()
    }
    return this.arrayList_.get(this.position_++)
  }

  /**
   * @override
   */
  hasNext () {
    if (this.position_ < this.arrayList_.size()) {
      return true
    } else {
      return false
    }
  }

  /**
   * TODO: should be in ListIterator
   * @override
   */
  set (element) {
    return this.arrayList_.set(this.position_ - 1, element)
  }

  /**
   * @override
   */
  remove () {
    this.arrayList_.remove(this.arrayList_.get(this.position_))
  }
}
