import LineString from '../../geom/LineString'
import FacetSequence from './FacetSequence'
import STRtree from '../../index/strtree/STRtree'
import Point from '../../geom/Point'
import GeometryComponentFilter from '../../geom/GeometryComponentFilter'
import ArrayList from '../../../../../java/util/ArrayList'

export default class FacetSequenceTreeBuilder {
  interfaces_ () {
    return []
  }
  getClass () {
    return FacetSequenceTreeBuilder
  }
  static addFacetSequences (pts, sections) {
    let i = 0
    const size = pts.size()
    while (i <= size - 1) {
      let end = i + FacetSequenceTreeBuilder.FACET_SEQUENCE_SIZE + 1
      if (end >= size - 1) end = size
      const sect = new FacetSequence(pts, i, end)
      sections.add(sect)
      i = i + FacetSequenceTreeBuilder.FACET_SEQUENCE_SIZE
    }
  }
  static computeFacetSequences (g) {
    const sections = new ArrayList()
    g.apply({
      interfaces_: function () {
        return [GeometryComponentFilter]
      },
      filter: function (geom) {
        let seq = null
        if (geom instanceof LineString) {
          seq = geom.getCoordinateSequence()
          FacetSequenceTreeBuilder.addFacetSequences(seq, sections)
        } else if (geom instanceof Point) {
          seq = geom.getCoordinateSequence()
          FacetSequenceTreeBuilder.addFacetSequences(seq, sections)
        }
      }
    })
    return sections
  }
  static build (g) {
    const tree = new STRtree(FacetSequenceTreeBuilder.STR_TREE_NODE_CAPACITY)
    const sections = FacetSequenceTreeBuilder.computeFacetSequences(g)
    for (const i = sections.iterator(); i.hasNext();) {
      const section = i.next()
      tree.insert(section.getEnvelope(), section)
    }
    tree.build()
    return tree
  }
  static get FACET_SEQUENCE_SIZE () { return 6 }
  static get STR_TREE_NODE_CAPACITY () { return 4 }
}
