import CGAlgorithms from '../../algorithm/CGAlgorithms'
import SweepLineIndex from '../../index/sweepline/SweepLineIndex'
import IsValidOp from './IsValidOp'
import SweepLineInterval from '../../index/sweepline/SweepLineInterval'
import ArrayList from '../../../../../java/util/ArrayList'
import Assert from '../../util/Assert'

export default class SweeplineNestedRingTester {
  constructor () {
    this._graph = null
    this._rings = new ArrayList()
    this._sweepLine = null
    this._nestedPt = null
    let graph = arguments[0]
    this._graph = graph
  }
  buildIndex () {
    this._sweepLine = new SweepLineIndex()
    for (let i = 0; i < this._rings.size(); i++) {
      const ring = this._rings.get(i)
      const env = ring.getEnvelopeInternal()
      const sweepInt = new SweepLineInterval(env.getMinX(), env.getMaxX(), ring)
      this._sweepLine.add(sweepInt)
    }
  }
  getNestedPoint () {
    return this._nestedPt
  }
  isNonNested () {
    // this.buildIndex()
    // const action = new OverlapAction()
    // this._sweepLine.computeOverlaps(action)
    // return action.isNonNested
  }
  add (ring) {
    this._rings.add(ring)
  }
  isInside (innerRing, searchRing) {
    const innerRingPts = innerRing.getCoordinates()
    const searchRingPts = searchRing.getCoordinates()
    if (!innerRing.getEnvelopeInternal().intersects(searchRing.getEnvelopeInternal())) return false
    const innerRingPt = IsValidOp.findPtNotNode(innerRingPts, searchRing, this._graph)
    Assert.isTrue(innerRingPt !== null, 'Unable to find a ring point not a node of the search ring')
    const isInside = CGAlgorithms.isPointInRing(innerRingPt, searchRingPts)
    if (isInside) {
      this._nestedPt = innerRingPt
      return true
    }
    return false
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return SweeplineNestedRingTester
  }
}
