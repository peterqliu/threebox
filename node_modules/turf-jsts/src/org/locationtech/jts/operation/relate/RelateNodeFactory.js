import EdgeEndBundleStar from './EdgeEndBundleStar'
import RelateNode from './RelateNode'
import NodeFactory from '../../geomgraph/NodeFactory'

export default class RelateNodeFactory extends NodeFactory {
  createNode (coord) {
    return new RelateNode(coord, new EdgeEndBundleStar())
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return RelateNodeFactory
  }
}
