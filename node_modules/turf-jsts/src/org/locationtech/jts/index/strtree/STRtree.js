import ItemBoundable from './ItemBoundable'
import PriorityQueue from '../../util/PriorityQueue'
import hasInterface from '../../../../../hasInterface'
import ItemVisitor from '../ItemVisitor'
import SpatialIndex from '../SpatialIndex'
import AbstractNode from './AbstractNode'
import Double from '../../../../../java/lang/Double'
import Collections from '../../../../../java/util/Collections'
import BoundablePair from './BoundablePair'
import ArrayList from '../../../../../java/util/ArrayList'
import Comparator from '../../../../../java/util/Comparator'
import Serializable from '../../../../../java/io/Serializable'
import Envelope from '../../geom/Envelope'
import Assert from '../../util/Assert'
import List from '../../../../../java/util/List'
import AbstractSTRtree from './AbstractSTRtree'
import ItemDistance from './ItemDistance'

export default class STRtree extends AbstractSTRtree {
  constructor (nodeCapacity) {
    nodeCapacity = nodeCapacity || STRtree.DEFAULT_NODE_CAPACITY
    super(nodeCapacity)
  }
  createParentBoundablesFromVerticalSlices (verticalSlices, newLevel) {
    Assert.isTrue(verticalSlices.length > 0)
    const parentBoundables = new ArrayList()
    for (let i = 0; i < verticalSlices.length; i++) {
      parentBoundables.addAll(this.createParentBoundablesFromVerticalSlice(verticalSlices[i], newLevel))
    }
    return parentBoundables
  }
  createNode (level) {
    return new STRtreeNode(level)
  }
  size () {
    if (arguments.length === 0) {
      return AbstractSTRtree.prototype.size.call(this)
    } else return AbstractSTRtree.prototype.size.apply(this, arguments)
  }
  insert () {
    if (arguments.length === 2) {
      const itemEnv = arguments[0]
      const item = arguments[1]
      if (itemEnv.isNull()) {
        return null
      }
      AbstractSTRtree.prototype.insert.call(this, itemEnv, item)
    } else return AbstractSTRtree.prototype.insert.apply(this, arguments)
  }
  getIntersectsOp () {
    return STRtree.intersectsOp
  }
  verticalSlices (childBoundables, sliceCount) {
    const sliceCapacity = Math.trunc(Math.ceil(childBoundables.size() / sliceCount))
    const slices = new Array(sliceCount).fill(null)
    const i = childBoundables.iterator()
    for (let j = 0; j < sliceCount; j++) {
      slices[j] = new ArrayList()
      let boundablesAddedToSlice = 0
      while (i.hasNext() && boundablesAddedToSlice < sliceCapacity) {
        const childBoundable = i.next()
        slices[j].add(childBoundable)
        boundablesAddedToSlice++
      }
    }
    return slices
  }
  query () {
    if (arguments.length === 1) {
      const searchEnv = arguments[0]
      return AbstractSTRtree.prototype.query.call(this, searchEnv)
    } else if (arguments.length === 2) {
      const searchEnv = arguments[0]
      const visitor = arguments[1]
      AbstractSTRtree.prototype.query.call(this, searchEnv, visitor)
    } else if (arguments.length === 3) {
      if (hasInterface(arguments[2], ItemVisitor) && (arguments[0] instanceof Object && arguments[1] instanceof AbstractNode)) {
        const searchBounds = arguments[0]
        const node = arguments[1]
        const visitor = arguments[2]
        AbstractSTRtree.prototype.query.call(this, searchBounds, node, visitor)
      } else if (hasInterface(arguments[2], List) && (arguments[0] instanceof Object && arguments[1] instanceof AbstractNode)) {
        const searchBounds = arguments[0]
        const node = arguments[1]
        const matches = arguments[2]
        AbstractSTRtree.prototype.query.call(this, searchBounds, node, matches)
      }
    }
  }
  getComparator () {
    return STRtree.yComparator
  }
  createParentBoundablesFromVerticalSlice (childBoundables, newLevel) {
    return AbstractSTRtree.prototype.createParentBoundables.call(this, childBoundables, newLevel)
  }
  remove () {
    if (arguments.length === 2) {
      const itemEnv = arguments[0]
      const item = arguments[1]
      return AbstractSTRtree.prototype.remove.call(this, itemEnv, item)
    } else return AbstractSTRtree.prototype.remove.apply(this, arguments)
  }
  depth () {
    if (arguments.length === 0) {
      return AbstractSTRtree.prototype.depth.call(this)
    } else return AbstractSTRtree.prototype.depth.apply(this, arguments)
  }
  createParentBoundables (childBoundables, newLevel) {
    Assert.isTrue(!childBoundables.isEmpty())
    const minLeafCount = Math.trunc(Math.ceil(childBoundables.size() / this.getNodeCapacity()))
    const sortedChildBoundables = new ArrayList(childBoundables)
    Collections.sort(sortedChildBoundables, STRtree.xComparator)
    const verticalSlices = this.verticalSlices(sortedChildBoundables, Math.trunc(Math.ceil(Math.sqrt(minLeafCount))))
    return this.createParentBoundablesFromVerticalSlices(verticalSlices, newLevel)
  }
  nearestNeighbour () {
    if (arguments.length === 1) {
      if (hasInterface(arguments[0], ItemDistance)) {
        let itemDist = arguments[0]
        const bp = new BoundablePair(this.getRoot(), this.getRoot(), itemDist)
        return this.nearestNeighbour(bp)
      } else if (arguments[0] instanceof BoundablePair) {
        let initBndPair = arguments[0]
        return this.nearestNeighbour(initBndPair, Double.POSITIVE_INFINITY)
      }
    } else if (arguments.length === 2) {
      if (arguments[0] instanceof STRtree && hasInterface(arguments[1], ItemDistance)) {
        const tree = arguments[0]
        const itemDist = arguments[1]
        const bp = new BoundablePair(this.getRoot(), tree.getRoot(), itemDist)
        return this.nearestNeighbour(bp)
      } else if (arguments[0] instanceof BoundablePair && typeof arguments[1] === 'number') {
        const initBndPair = arguments[0]
        const maxDistance = arguments[1]
        let distanceLowerBound = maxDistance
        let minPair = null
        const priQ = new PriorityQueue()
        priQ.add(initBndPair)
        while (!priQ.isEmpty() && distanceLowerBound > 0.0) {
          const bndPair = priQ.poll()
          const currentDistance = bndPair.getDistance()
          if (currentDistance >= distanceLowerBound) break
          if (bndPair.isLeaves()) {
            distanceLowerBound = currentDistance
            minPair = bndPair
          } else {
            bndPair.expandToQueue(priQ, distanceLowerBound)
          }
        }
        return [minPair.getBoundable(0).getItem(), minPair.getBoundable(1).getItem()]
      }
    } else if (arguments.length === 3) {
      const env = arguments[0]
      const item = arguments[1]
      const itemDist = arguments[2]
      const bnd = new ItemBoundable(env, item)
      const bp = new BoundablePair(this.getRoot(), bnd, itemDist)
      return this.nearestNeighbour(bp)[0]
    }
  }
  interfaces_ () {
    return [SpatialIndex, Serializable]
  }
  getClass () {
    return STRtree
  }
  static centreX (e) {
    return STRtree.avg(e.getMinX(), e.getMaxX())
  }
  static avg (a, b) {
    return (a + b) / 2
  }
  static centreY (e) {
    return STRtree.avg(e.getMinY(), e.getMaxY())
  }
  static get STRtreeNode () { return STRtreeNode }
  static get serialVersionUID () { return 259274702368956900 }
  static get xComparator () {
    return {
      interfaces_: function () {
        return [Comparator]
      },
      compare: function (o1, o2) {
        return AbstractSTRtree.compareDoubles(STRtree.centreX(o1.getBounds()), STRtree.centreX(o2.getBounds()))
      }
    }
  }
  static get yComparator () {
    return {
      interfaces_: function () {
        return [Comparator]
      },
      compare: function (o1, o2) {
        return AbstractSTRtree.compareDoubles(STRtree.centreY(o1.getBounds()), STRtree.centreY(o2.getBounds()))
      }
    }
  }
  static get intersectsOp () {
    return {
      interfaces_: function () {
        return [AbstractSTRtree.IntersectsOp]
      },
      intersects: function (aBounds, bBounds) {
        return aBounds.intersects(bBounds)
      }
    }
  }
  static get DEFAULT_NODE_CAPACITY () { return 10 }
}

class STRtreeNode extends AbstractNode {
  constructor () {
    let level = arguments[0]
    super(level)
  }
  computeBounds () {
    let bounds = null
    for (const i = this.getChildBoundables().iterator(); i.hasNext();) {
      const childBoundable = i.next()
      if (bounds === null) {
        bounds = new Envelope(childBoundable.getBounds())
      } else {
        bounds.expandToInclude(childBoundable.getBounds())
      }
    }
    return bounds
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return STRtreeNode
  }
}
