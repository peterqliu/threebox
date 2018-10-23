export default class SimilarityMeasureCombiner {
  interfaces_ () {
    return []
  }
  getClass () {
    return SimilarityMeasureCombiner
  }
  static combine (measure1, measure2) {
    return Math.min(measure1, measure2)
  }
}
