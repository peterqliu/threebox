import hasInterface from '../../../../hasInterface'
import Collection from '../../../../java/util/Collection'
import OrientedCoordinateArray from './OrientedCoordinateArray'
import SegmentString from './SegmentString'
import CoordinateArrays from '../geom/CoordinateArrays'
import TreeMap from '../../../../java/util/TreeMap'

export default class SegmentStringDissolver {
  constructor () {
    this._merger = null
    this._ocaMap = new TreeMap()
    if (arguments.length === 0) {
      SegmentStringDissolver.call(this, null)
    } else if (arguments.length === 1) {
      let merger = arguments[0]
      this._merger = merger
    }
  }
  findMatching (oca, segString) {
    var matchSS = this._ocaMap.get(oca)
    return matchSS
  }
  getDissolved () {
    return this._ocaMap.values()
  }
  dissolve () {
    if (hasInterface(arguments[0], Collection)) {
      let segStrings = arguments[0]
      for (var i = segStrings.iterator(); i.hasNext();) {
        this.dissolve(i.next())
      }
    } else if (hasInterface(arguments[0], SegmentString)) {
      let segString = arguments[0]
      var oca = new OrientedCoordinateArray(segString.getCoordinates())
      var existing = this.findMatching(oca, segString)
      if (existing === null) {
        this.add(oca, segString)
      } else {
        if (this._merger !== null) {
          var isSameOrientation = CoordinateArrays.equals(existing.getCoordinates(), segString.getCoordinates())
          this._merger.merge(existing, segString, isSameOrientation)
        }
      }
    }
  }
  add (oca, segString) {
    this._ocaMap.put(oca, segString)
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return SegmentStringDissolver
  }
  static get SegmentStringMerger () { return SegmentStringMerger }
}

class SegmentStringMerger {}
