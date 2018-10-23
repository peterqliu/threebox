import LineString from '../geom/LineString'
import Geometry from '../geom/Geometry'
import hasInterface from '../../../../hasInterface'
import Collection from '../../../../java/util/Collection'
import EdgeGraph from './EdgeGraph'
import GeometryComponentFilter from '../geom/GeometryComponentFilter'

export default class EdgeGraphBuilder {
  constructor () {
    this._graph = new EdgeGraph()
  }
  add () {
    if (arguments[0] instanceof Geometry) {
      const geometry = arguments[0]
      geometry.apply({
        interfaces_: function () {
          return [GeometryComponentFilter]
        },
        filter: function (component) {
          if (component instanceof LineString) {
            this.add(component)
          }
        }
      })
    } else if (hasInterface(arguments[0], Collection)) {
      const geometries = arguments[0]
      for (const i = geometries.iterator(); i.hasNext();) {
        const geometry = i.next()
        this.add(geometry)
      }
    } else if (arguments[0] instanceof LineString) {
      const lineString = arguments[0]
      const seq = lineString.getCoordinateSequence()
      for (let i = 1; i < seq.size(); i++) {
        this._graph.addEdge(seq.getCoordinate(i - 1), seq.getCoordinate(i))
      }
    }
  }
  getGraph () {
    return this._graph
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return EdgeGraphBuilder
  }
  static build (geoms) {
    const builder = new EdgeGraphBuilder()
    builder.add(geoms)
    return builder.getGraph()
  }
}
