export default class BoundaryNodeRule {
  isInBoundary (boundaryCount) {}
  interfaces_ () {
    return []
  }
  getClass () {
    return BoundaryNodeRule
  }
  static get Mod2BoundaryNodeRule () { return Mod2BoundaryNodeRule }
  static get EndPointBoundaryNodeRule () { return EndPointBoundaryNodeRule }
  static get MultiValentEndPointBoundaryNodeRule () { return MultiValentEndPointBoundaryNodeRule }
  static get MonoValentEndPointBoundaryNodeRule () { return MonoValentEndPointBoundaryNodeRule }
  static get MOD2_BOUNDARY_RULE () { return new Mod2BoundaryNodeRule() }
  static get ENDPOINT_BOUNDARY_RULE () { return new EndPointBoundaryNodeRule() }
  static get MULTIVALENT_ENDPOINT_BOUNDARY_RULE () { return new MultiValentEndPointBoundaryNodeRule() }
  static get MONOVALENT_ENDPOINT_BOUNDARY_RULE () { return new MonoValentEndPointBoundaryNodeRule() }
  static get OGC_SFS_BOUNDARY_RULE () { return BoundaryNodeRule.MOD2_BOUNDARY_RULE }
}

class Mod2BoundaryNodeRule {
  isInBoundary (boundaryCount) {
    return boundaryCount % 2 === 1
  }
  interfaces_ () {
    return [BoundaryNodeRule]
  }
  getClass () {
    return Mod2BoundaryNodeRule
  }
}

class EndPointBoundaryNodeRule {
  isInBoundary (boundaryCount) {
    return boundaryCount > 0
  }
  interfaces_ () {
    return [BoundaryNodeRule]
  }
  getClass () {
    return EndPointBoundaryNodeRule
  }
}

class MultiValentEndPointBoundaryNodeRule {
  isInBoundary (boundaryCount) {
    return boundaryCount > 1
  }
  interfaces_ () {
    return [BoundaryNodeRule]
  }
  getClass () {
    return MultiValentEndPointBoundaryNodeRule
  }
}

class MonoValentEndPointBoundaryNodeRule {
  isInBoundary (boundaryCount) {
    return boundaryCount === 1
  }
  interfaces_ () {
    return [BoundaryNodeRule]
  }
  getClass () {
    return MonoValentEndPointBoundaryNodeRule
  }
}
