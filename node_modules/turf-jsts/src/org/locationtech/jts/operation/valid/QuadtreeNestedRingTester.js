import Quadtree from '../../index/quadtree/Quadtree'
import CGAlgorithms from '../../algorithm/CGAlgorithms'
import IsValidOp from './IsValidOp'
import ArrayList from '../../../../../java/util/ArrayList'
import Envelope from '../../geom/Envelope'
import Assert from '../../util/Assert'

export default class QuadtreeNestedRingTester {
  constructor () {
    this._graph = null
    this._rings = new ArrayList()
    this._totalEnv = new Envelope()
    this._quadtree = null
    this._nestedPt = null
    let graph = arguments[0]
    this._graph = graph
  }
  getNestedPoint () {
    return this._nestedPt
  }
  isNonNested () {
    this.buildQuadtree()
    for (let i = 0; i < this._rings.size(); i++) {
      const innerRing = this._rings.get(i)
      const innerRingPts = innerRing.getCoordinates()
      const results = this._quadtree.query(innerRing.getEnvelopeInternal())
      for (let j = 0; j < results.size(); j++) {
        const searchRing = results.get(j)
        const searchRingPts = searchRing.getCoordinates()
        if (innerRing === searchRing) continue
        if (!innerRing.getEnvelopeInternal().intersects(searchRing.getEnvelopeInternal())) continue
        const innerRingPt = IsValidOp.findPtNotNode(innerRingPts, searchRing, this._graph)
        Assert.isTrue(innerRingPt !== null, 'Unable to find a ring point not a node of the search ring')
        const isInside = CGAlgorithms.isPointInRing(innerRingPt, searchRingPts)
        if (isInside) {
          this._nestedPt = innerRingPt
          return false
        }
      }
    }
    return true
  }
  add (ring) {
    this._rings.add(ring)
    this._totalEnv.expandToInclude(ring.getEnvelopeInternal())
  }
  buildQuadtree () {
    this._quadtree = new Quadtree()
    for (let i = 0; i < this._rings.size(); i++) {
      const ring = this._rings.get(i)
      const env = ring.getEnvelopeInternal()
      this._quadtree.insert(env, ring)
    }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return QuadtreeNestedRingTester
  }
}
