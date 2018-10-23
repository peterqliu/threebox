import MonotoneChainSelectAction from '../../index/chain/MonotoneChainSelectAction'
import ItemVisitor from '../../index/ItemVisitor'

export default class MCIndexPointSnapper {
  constructor () {
    this._index = null
    const index = arguments[0]
    this._index = index
  }
  snap () {
    if (arguments.length === 1) {
      const hotPixel = arguments[0]
      return this.snap(hotPixel, null, -1)
    } else if (arguments.length === 3) {
      const hotPixel = arguments[0]
      const parentEdge = arguments[1]
      const hotPixelVertexIndex = arguments[2]
      const pixelEnv = hotPixel.getSafeEnvelope()
      const hotPixelSnapAction = new HotPixelSnapAction(hotPixel, parentEdge, hotPixelVertexIndex)
      this._index.query(pixelEnv, {
        interfaces_: function () {
          return [ItemVisitor]
        },
        visitItem: function (item) {
          const testChain = item
          testChain.select(pixelEnv, hotPixelSnapAction)
        }
      })
      return hotPixelSnapAction.isNodeAdded()
    }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return MCIndexPointSnapper
  }
  static get HotPixelSnapAction () { return HotPixelSnapAction }
}

class HotPixelSnapAction extends MonotoneChainSelectAction {
  constructor () {
    super()
    this._hotPixel = null
    this._parentEdge = null
    this._hotPixelVertexIndex = null
    this._isNodeAdded = false
    const hotPixel = arguments[0]
    const parentEdge = arguments[1]
    const hotPixelVertexIndex = arguments[2]
    this._hotPixel = hotPixel
    this._parentEdge = parentEdge
    this._hotPixelVertexIndex = hotPixelVertexIndex
  }
  isNodeAdded () {
    return this._isNodeAdded
  }
  select () {
    if (arguments.length === 2) {
      const mc = arguments[0]
      const startIndex = arguments[1]
      const ss = mc.getContext()
      if (this._parentEdge !== null) {
        if (ss === this._parentEdge && startIndex === this._hotPixelVertexIndex) return null
      }
      this._isNodeAdded = this._hotPixel.addSnappedNode(ss, startIndex)
    } else return MonotoneChainSelectAction.prototype.select.apply(this, arguments)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return HotPixelSnapAction
  }
}
