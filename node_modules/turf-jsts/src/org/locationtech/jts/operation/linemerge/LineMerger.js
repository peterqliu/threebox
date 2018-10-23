import LineString from '../../geom/LineString'
import Geometry from '../../geom/Geometry'
import hasInterface from '../../../../../hasInterface'
import Collection from '../../../../../java/util/Collection'
import EdgeString from './EdgeString'
import LineMergeGraph from './LineMergeGraph'
import GeometryComponentFilter from '../../geom/GeometryComponentFilter'
import ArrayList from '../../../../../java/util/ArrayList'
import Assert from '../../util/Assert'
import GraphComponent from '../../planargraph/GraphComponent'

export default class LineMerger {
  constructor () {
    this._graph = new LineMergeGraph()
    this._mergedLineStrings = null
    this._factory = null
    this._edgeStrings = null
  }
  buildEdgeStringsForUnprocessedNodes () {
    for (const i = this._graph.getNodes().iterator(); i.hasNext();) {
      const node = i.next()
      if (!node.isMarked()) {
        Assert.isTrue(node.getDegree() === 2)
        this.buildEdgeStringsStartingAt(node)
        node.setMarked(true)
      }
    }
  }
  buildEdgeStringsForNonDegree2Nodes () {
    for (const i = this._graph.getNodes().iterator(); i.hasNext();) {
      const node = i.next()
      if (node.getDegree() !== 2) {
        this.buildEdgeStringsStartingAt(node)
        node.setMarked(true)
      }
    }
  }
  buildEdgeStringsForObviousStartNodes () {
    this.buildEdgeStringsForNonDegree2Nodes()
  }
  getMergedLineStrings () {
    this.merge()
    return this._mergedLineStrings
  }
  buildEdgeStringsStartingAt (node) {
    for (const i = node.getOutEdges().iterator(); i.hasNext();) {
      const directedEdge = i.next()
      if (directedEdge.getEdge().isMarked()) {
        continue
      }
      this._edgeStrings.add(this.buildEdgeStringStartingWith(directedEdge))
    }
  }
  merge () {
    if (this._mergedLineStrings !== null) {
      return null
    }
    GraphComponent.setMarked(this._graph.nodeIterator(), false)
    GraphComponent.setMarked(this._graph.edgeIterator(), false)
    this._edgeStrings = new ArrayList()
    this.buildEdgeStringsForObviousStartNodes()
    this.buildEdgeStringsForIsolatedLoops()
    this._mergedLineStrings = new ArrayList()
    for (const i = this._edgeStrings.iterator(); i.hasNext();) {
      const edgeString = i.next()
      this._mergedLineStrings.add(edgeString.toLineString())
    }
  }
  buildEdgeStringStartingWith (start) {
    const edgeString = new EdgeString(this._factory)
    let current = start
    do {
      edgeString.add(current)
      current.getEdge().setMarked(true)
      current = current.getNext()
    } while (current !== null && current !== start)
    return edgeString
  }
  add () {
    if (arguments[0] instanceof Geometry) {
      let geometry = arguments[0]
      geometry.appy({
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
      let geometries = arguments[0]
      this._mergedLineStrings = null
      for (const i = geometries.iterator(); i.hasNext();) {
        const geometry = i.next()
        this.add(geometry)
      }
    } else if (arguments[0] instanceof LineString) {
      let lineString = arguments[0]
      if (this._factory === null) {
        this._factory = lineString.getFactory()
      }
      this._graph.addEdge(lineString)
    }
  }
  buildEdgeStringsForIsolatedLoops () {
    this.buildEdgeStringsForUnprocessedNodes()
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return LineMerger
  }
}
