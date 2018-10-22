export default class Memory {
  interfaces_ () {
    return []
  }
  getClass () {
    return Memory
  }
  static used () {
    // var runtime = Runtime.getRuntime()
    // return runtime.totalMemory() - runtime.freeMemory()
  }
  static format (mem) {
    if (mem < 2 * Memory.KB) return mem + ' bytes'
    if (mem < 2 * Memory.MB) return Memory.round(mem / Memory.KB) + ' KB'
    if (mem < 2 * Memory.GB) return Memory.round(mem / Memory.MB) + ' MB'
    return Memory.round(mem / Memory.GB) + ' GB'
  }
  static freeString () {
    return Memory.format(Memory.free())
  }
  static total () {
    // var runtime = Runtime.getRuntime()
    // return runtime.totalMemory()
  }
  static usedTotalString () {
    return 'Used: ' + Memory.usedString() + '   Total: ' + Memory.totalString()
  }
  static usedString () {
    return Memory.format(Memory.used())
  }
  static allString () {
    return 'Used: ' + Memory.usedString() + '   Free: ' + Memory.freeString() + '   Total: ' + Memory.totalString()
  }
  static round (d) {
    return Math.ceil(d * 100) / 100
  }
  static totalString () {
    return Memory.format(Memory.total())
  }
  static free () {
    // var runtime = Runtime.getRuntime()
    // return runtime.freeMemory()
  }
  static get KB () { return 1024 }
  static get MB () { return 1048576 }
  static get GB () { return 1073741824 }
}
