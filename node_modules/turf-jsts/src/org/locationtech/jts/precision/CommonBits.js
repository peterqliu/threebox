import Double from '../../../../java/lang/Double'

export default class CommonBits {
  constructor () {
    this._isFirst = true
    this._commonMantissaBitsCount = 53
    this._commonBits = 0
    this._commonSignExp = null
  }
  getCommon () {
    return Double.longBitsToDouble(this._commonBits)
  }
  add (num) {
    const numBits = Double.doubleToLongBits(num)
    if (this._isFirst) {
      this._commonBits = numBits
      this._commonSignExp = CommonBits.signExpBits(this._commonBits)
      this._isFirst = false
      return null
    }
    const numSignExp = CommonBits.signExpBits(numBits)
    if (numSignExp !== this._commonSignExp) {
      this._commonBits = 0
      return null
    }
    this._commonMantissaBitsCount = CommonBits.numCommonMostSigMantissaBits(this._commonBits, numBits)
    this._commonBits = CommonBits.zeroLowerBits(this._commonBits, 64 - (12 + this._commonMantissaBitsCount))
  }
  toString () {
    if (arguments.length === 1) {
      let bits = arguments[0]
      const x = Double.longBitsToDouble(bits)
      const numStr = Double.toBinaryString(bits)
      const padStr = '0000000000000000000000000000000000000000000000000000000000000000' + numStr
      const bitStr = padStr.substring(padStr.length - 64)
      const str = bitStr.substring(0, 1) + '  ' + bitStr.substring(1, 12) + '(exp) ' + bitStr.substring(12) + ' [ ' + x + ' ]'
      return str
    }
  }
  interfaces_ () {
    return []
  }
  getClass () {
    return CommonBits
  }
  static getBit (bits, i) {
    const mask = 1 << i
    return (bits & mask) !== 0 ? 1 : 0
  }
  static signExpBits (num) {
    return num >> 52
  }
  static zeroLowerBits (bits, nBits) {
    const invMask = (1 << nBits) - 1
    const mask = ~invMask
    const zeroed = bits & mask
    return zeroed
  }
  static numCommonMostSigMantissaBits (num1, num2) {
    let count = 0
    for (let i = 52; i >= 0; i--) {
      if (CommonBits.getBit(num1, i) !== CommonBits.getBit(num2, i)) return count
      count++
    }
    return 52
  }
}
