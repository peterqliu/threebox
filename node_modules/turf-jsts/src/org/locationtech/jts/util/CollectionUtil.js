import ArrayList from '../../../../java/util/ArrayList'

export default class CollectionUtil {
  interfaces_ () {
    return []
  }
  getClass () {
    return CollectionUtil
  }
  static transform (coll, func) {
    const result = new ArrayList()
    for (const i = coll.iterator(); i.hasNext();) {
      result.add(func.execute(i.next()))
    }
    return result
  }
  static select (collection, func) {
    const result = new ArrayList()
    for (const i = collection.iterator(); i.hasNext();) {
      const item = i.next()
      if (Boolean.TRUE.equals(func.execute(item))) {
        result.add(item)
      }
    }
    return result
  }
  static apply (coll, func) {
    for (const i = coll.iterator(); i.hasNext();) {
      func.execute(i.next())
    }
  }
  static get Function () { return Function }
}

class Function {}
