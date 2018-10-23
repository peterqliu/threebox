// import hasInterface from '../../../../hasInterface'
// import CoordinateSequence from './CoordinateSequence'

export default class CoordinateSequenceFactory {
  create () {
    // if (arguments.length === 1) {
    //   if (arguments[0] instanceof Array) {
    //     let coordinates = arguments[0]
    //   } else if (hasInterface(arguments[0], CoordinateSequence)) {
    //     let coordSeq = arguments[0]
    //   }
    // } else if (arguments.length === 2) {
    //   let size = arguments[0]
    //   let dimension = arguments[1]
    // }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return CoordinateSequenceFactory
  }
}
