import EdgeEndStar from '../../geomgraph/EdgeEndStar'
import EdgeEndBundle from './EdgeEndBundle'

export default class EdgeEndBundleStar extends EdgeEndStar {
  updateIM (im) {
    for (const it = this.iterator(); it.hasNext();) {
      const esb = it.next()
      esb.updateIM(im)
    }
  }
  insert (e) {
    let eb = this._edgeMap.get(e)
    if (eb === null) {
      eb = new EdgeEndBundle(e)
      this.insertEdgeEnd(e, eb)
    } else {
      eb.insert(e)
    }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return EdgeEndBundleStar
  }
}
