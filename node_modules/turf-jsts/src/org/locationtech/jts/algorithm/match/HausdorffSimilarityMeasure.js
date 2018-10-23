import SimilarityMeasure from './SimilarityMeasure'
import Envelope from '../../geom/Envelope'
import DiscreteHausdorffDistance from '../distance/DiscreteHausdorffDistance'

export default class HausdorffSimilarityMeasure {
  measure (g1, g2) {
    var distance = DiscreteHausdorffDistance.distance(g1, g2, HausdorffSimilarityMeasure.DENSIFY_FRACTION)
    var env = new Envelope(g1.getEnvelopeInternal())
    env.expandToInclude(g2.getEnvelopeInternal())
    var envSize = HausdorffSimilarityMeasure.diagonalSize(env)
    var measure = 1 - distance / envSize
    return measure
  }
  interfaces_ () {
    return [SimilarityMeasure]
  }
  getClass () {
    return HausdorffSimilarityMeasure
  }
  static diagonalSize (env) {
    if (env.isNull()) return 0.0
    var width = env.getWidth()
    var hgt = env.getHeight()
    return Math.sqrt(width * width + hgt * hgt)
  }
  static get DENSIFY_FRACTION () { return 0.25 }
}
