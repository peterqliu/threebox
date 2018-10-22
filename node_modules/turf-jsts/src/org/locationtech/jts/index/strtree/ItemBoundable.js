import Boundable from './Boundable'
import Serializable from '../../../../../java/io/Serializable'

export default class ItemBoundable {
  constructor () {
    this._bounds = null
    this._item = null
    const bounds = arguments[0]
    const item = arguments[1]
    this._bounds = bounds
    this._item = item
  }
  getItem () {
    return this._item
  }
  getBounds () {
    return this._bounds
  }
  interfaces_ () {
    return [Boundable, Serializable]
  }
  getClass () {
    return ItemBoundable
  }
}
