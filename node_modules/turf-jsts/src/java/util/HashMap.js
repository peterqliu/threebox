import ArrayList from './ArrayList'
import MapInterface from './Map'
import HashSet from './HashSet'

/**
 * @see http://download.oracle.com/javase/6/docs/api/java/util/HashMap.html
 *
 * @extends {javascript.util.Map}
 * @constructor
 * @private
 */
export default class HashMap extends MapInterface {
  constructor () {
    super()
    this.map_ = new Map()
  }
  /**
   * @override
   */
  get (key) {
    return this.map_.get(key) || null
  }

  /**
   * @override
   */
  put (key, value) {
    this.map_.set(key, value)
    return value
  }

  /**
   * @override
   */
  values () {
    const arrayList = new ArrayList()
    const it = this.map_.values()
    let o = it.next()
    while (!o.done) {
      arrayList.add(o.value)
      o = it.next()
    }
    return arrayList
  }

  /**
   * @override
   */
  entrySet () {
    const hashSet = new HashSet()
    this.map_.entries().forEach(entry => hashSet.add(entry))
    return hashSet
  }

  /**
   * @override
   */
  size () {
    return this.map_.size()
  }
}
