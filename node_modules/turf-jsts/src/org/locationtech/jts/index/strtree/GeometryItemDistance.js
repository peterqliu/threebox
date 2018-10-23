import ItemDistance from './ItemDistance'

export default class GeometryItemDistance {
  distance (item1, item2) {
    var g1 = item1.getItem()
    var g2 = item2.getItem()
    return g1.distance(g2)
  }
  interfaces_ () {
    return [ItemDistance]
  }
  getClass () {
    return GeometryItemDistance
  }
}
