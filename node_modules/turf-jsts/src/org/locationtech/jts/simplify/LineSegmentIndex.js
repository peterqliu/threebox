import Quadtree from '../index/quadtree/Quadtree'
import ItemVisitor from '../index/ItemVisitor'
import LineSegment from '../geom/LineSegment'
import ArrayList from '../../../../java/util/ArrayList'
import Envelope from '../geom/Envelope'
import TaggedLineString from './TaggedLineString'

export default class LineSegmentIndex {
  constructor () {
    this._index = new Quadtree()
  }
  remove (seg) {
    this._index.remove(new Envelope(seg.p0, seg.p1), seg)
  }
  add () {
    if (arguments[0] instanceof TaggedLineString) {
      let line = arguments[0]
      const segs = line.getSegments()
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i]
        this.add(seg)
      }
    } else if (arguments[0] instanceof LineSegment) {
      let seg = arguments[0]
      this._index.insert(new Envelope(seg.p0, seg.p1), seg)
    }
  }
  query (querySeg) {
    const env = new Envelope(querySeg.p0, querySeg.p1)
    const visitor = new LineSegmentVisitor(querySeg)
    this._index.query(env, visitor)
    const itemsFound = visitor.getItems()
    return itemsFound
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return LineSegmentIndex
  }
}

class LineSegmentVisitor {
  constructor () {
    this._querySeg = null
    this._items = new ArrayList()
    let querySeg = arguments[0]
    this._querySeg = querySeg
  }
  visitItem (item) {
    const seg = item
    if (Envelope.intersects(seg.p0, seg.p1, this._querySeg.p0, this._querySeg.p1)) this._items.add(item)
  }
  getItems () {
    return this._items
  }
  interfaces_ () {
    return [ItemVisitor]
  }
  getClass () {
    return LineSegmentVisitor
  }
}
