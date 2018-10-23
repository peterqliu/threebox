import Comparable from '../../../../../java/lang/Comparable'

export default class SweepLineEvent {
  constructor () {
    this._xValue = null
    this._eventType = null
    this._insertEvent = null
    this._deleteEventIndex = null
    this.sweepInt = null
    const x = arguments[0]
    const insertEvent = arguments[1]
    const sweepInt = arguments[2]
    this._xValue = x
    this._insertEvent = insertEvent
    this._eventType = SweepLineEvent.INSERT
    if (insertEvent !== null) this._eventType = SweepLineEvent.DELETE
    this.sweepInt = sweepInt
  }
  getInterval () {
    return this.sweepInt
  }
  isDelete () {
    return this._insertEvent !== null
  }
  setDeleteEventIndex (deleteEventIndex) {
    this._deleteEventIndex = deleteEventIndex
  }
  compareTo (o) {
    var pe = o
    if (this._xValue < pe._xValue) return -1
    if (this._xValue > pe._xValue) return 1
    if (this._eventType < pe._eventType) return -1
    if (this._eventType > pe._eventType) return 1
    return 0
  }
  getInsertEvent () {
    return this._insertEvent
  }
  isInsert () {
    return this._insertEvent === null
  }
  getDeleteEventIndex () {
    return this._deleteEventIndex
  }
  interfaces_ () {
    return [Comparable]
  }
  getClass () {
    return SweepLineEvent
  }
  static get INSERT () { return 1 }
  static get DELETE () { return 2 }
}
