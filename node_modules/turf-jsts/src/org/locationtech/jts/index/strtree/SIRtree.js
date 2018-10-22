import hasInterface from '../../../../../hasInterface'
import ItemVisitor from '../ItemVisitor'
import AbstractNode from './AbstractNode'
import Interval from './Interval'
import Comparator from '../../../../../java/util/Comparator'
import List from '../../../../../java/util/List'
import AbstractSTRtree from './AbstractSTRtree'

export default class SIRtree extends AbstractSTRtree {
  constructor (nodeCapacity) {
    nodeCapacity = nodeCapacity !== undefined ? nodeCapacity : 10
    super(nodeCapacity)
    this._comparator = {
      interfaces_: function () {
        return [Comparator]
      },
      compare: function (o1, o2) {
        return AbstractSTRtree.compareDoubles(o1.getBounds().getCentre(), o2.getBounds().getCentre())
      }
    }
    this._intersectsOp = {
      interfaces_: function () {
        return [AbstractSTRtree.IntersectsOp]
      },
      intersects: function (aBounds, bBounds) {
        return aBounds.intersects(bBounds)
      }
    }
  }
  createNode (level) {
    return {
      computeBounds: function () {
        var bounds = null
        for (var i = this.getChildBoundables().iterator(); i.hasNext();) {
          var childBoundable = i.next()
          if (bounds === null) {
            bounds = new Interval(childBoundable.getBounds())
          } else {
            bounds.expandToInclude(childBoundable.getBounds())
          }
        }
        return bounds
      }
    }
  }
  insert () {
    if (arguments.length === 3) {
      const x1 = arguments[0]
      const x2 = arguments[1]
      const item = arguments[2]
      AbstractSTRtree.prototype.insert.call(this, new Interval(Math.min(x1, x2), Math.max(x1, x2)), item)
    } else return AbstractSTRtree.prototype.insert.apply(this, arguments)
  }
  getIntersectsOp () {
    return this._intersectsOp
  }
  query () {
    if (arguments.length === 1) {
      const x = arguments[0]
      return this.query(x, x)
    } else if (arguments.length === 2) {
      const x1 = arguments[0]
      const x2 = arguments[1]
      return AbstractSTRtree.prototype.query.call(this, new Interval(Math.min(x1, x2), Math.max(x1, x2)))
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
    return this._comparator
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return SIRtree
  }
}
