import Exception from '../../../../java/lang/Exception'

export default class NotRepresentableException extends Exception {
  constructor () {
    super('Projective point not representable on the Cartesian plane.')
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return NotRepresentableException
  }
}
