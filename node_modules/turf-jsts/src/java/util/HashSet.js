import Collection from './Collection'
import Iterator from './Iterator'
import NoSuchElementException from './NoSuchElementException'
import OperationNotSupported from './OperationNotSupported'
import Set from './Set'

/**
 * @see http://docs.oracle.com/javase/6/docs/api/java/util/HashSet.html
 *
 * @extends {javascript.util.Set}
 * @constructor
 * @private
 */
export default class HashSet extends Set {
  constructor () {
    super()
    this.array_ = []

    if (arguments[0] instanceof Collection) {
      this.addAll(arguments[0])
    }
  }

  /**
   * @override
   */
  contains (o) {
    for (var i = 0, len = this.array_.length; i < len; i++) {
      var e = this.array_[i]
      if (e === o) {
        return true
      }
    }
    return false
  }

  /**
   * @override
   */
  add (o) {
    if (this.contains(o)) {
      return false
    }

    this.array_.push(o)

    return true
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
  remove (o) {
    // throw new javascript.util.OperationNotSupported()
    throw new Error()
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
  isEmpty () {
    return this.array_.length === 0
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
  iterator () {
    return new Iterator_(this)
  }
}

  /**
   * @extends {Iterator}
   * @param {HashSet} hashSet
   * @constructor
   * @private
   */
class Iterator_ extends Iterator {
  constructor (hashSet) {
    super()
    /**
     * @type {HashSet}
     * @private
     */
    this.hashSet_ = hashSet
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
    if (this.position_ === this.hashSet_.size()) {
      throw new NoSuchElementException()
    }
    return this.hashSet_.array_[this.position_++]
  }

  /**
   * @override
   */
  hasNext () {
    if (this.position_ < this.hashSet_.size()) {
      return true
    } else {
      return false
    }
  }

  /**
   * @override
   */
  remove () {
    throw new OperationNotSupported()
  }
}
