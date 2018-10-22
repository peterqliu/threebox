import SimilarityMeasure from './SimilarityMeasure'

export default class AreaSimilarityMeasure {
  measure (g1, g2) {
    var areaInt = g1.intersection(g2).getArea()
    var areaUnion = g1.union(g2).getArea()
    return areaInt / areaUnion
  }
  interfaces_ () {
    return [SimilarityMeasure]
  }
  getClass () {
    return AreaSimilarityMeasure
  }
}
