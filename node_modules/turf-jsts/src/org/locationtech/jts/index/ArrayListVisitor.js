import ItemVisitor from './ItemVisitor'
import ArrayList from '../../../../java/util/ArrayList'

export default class ArrayListVisitor {
  constructor () {
    this._items = new ArrayList()
  }
  visitItem (item) {
    this._items.add(item)
  }
  getItems () {
    return this._items
  }
  interfaces_ () {
    return [ItemVisitor]
  }
  getClass () {
    return ArrayListVisitor
  }
}
