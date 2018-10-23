export default class MonotoneChain {
  constructor () {
    this.mce = null
    this.chainIndex = null
    const mce = arguments[0]
    const chainIndex = arguments[1]
    this.mce = mce
    this.chainIndex = chainIndex
  }
  computeIntersections (mc, si) {
    this.mce.computeIntersectsForChain(this.chainIndex, mc.mce, mc.chainIndex, si)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return MonotoneChain
  }
}
