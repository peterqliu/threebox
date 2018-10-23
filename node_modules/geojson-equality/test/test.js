var expect = require('chai').expect,
  Equality = require('../');
describe('geojson-equality for Points', function() {
  var g1 = { "type": "Point", "coordinates": [30, 10] },
    g2 = { "type": "Point", "coordinates": [30, 10] },
    g3 = { "type": "Point", "coordinates": [30, 11] },
    g4 = { "type": "Point", "coordinates": [30, 10, 5]},
    g5 = { "type": "Point", "coordinates": [30, 10, 5]},
    eq = new Equality();
  it('are equal', function() {
    expect(eq.compare(g1,g2)).to.be.true;
  });
  it('are not equal', function() {
    expect(eq.compare(g1,g3)).to.be.false;
  });
  it('are not equal with different point dimensions', function() {
    expect(eq.compare(g1,g4)).to.be.false;
  });
  it('are equal with 3d points', function() {
    expect(eq.compare(g4,g5)).to.be.true;
  });
});
describe('geojson-equality for LineStrings', function() {
  var g1 = { "type": "LineString", "coordinates":
    [ [30, 10], [10, 30], [40, 40] ] },
    g2 = { "type": "LineString", "coordinates":
      [ [30, 10], [10, 30], [40, 40] ] };
  it('are equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g2)).to.be.true;
  });
  var g3 = { "type": "LineString", "coordinates":
    [ [31, 10], [10, 30], [40, 40] ] };
  it('are not equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g3)).to.be.false;
  });
  var g4 = { "type": "LineString", "coordinates":
    [ [40, 40], [10, 30], [30, 10]] };
  it('reverse direction, direction is not matched, so both are equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g4)).to.be.true;
  });
  it('reverse direction, direction is matched, so both are not equal', function() {
    var eq = new Equality({direction: true});
    expect(eq.compare(g1,g4)).to.be.false;
  });
});
describe('geojson-equality for Polygons', function() {
  var g1 = { "type": "Polygon", "coordinates": [
    [[30, 10], [40, 40], [20, 40], [10, 20], [30, 10]]
  ]};
  var g2 = { "type": "Polygon", "coordinates": [
    [[30, 10], [40, 40], [20, 40], [10, 20], [30, 10]]
  ]};
  it('are equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g2)).to.be.true;
  });
  var g3 = { "type": "Polygon", "coordinates": [
    [[30, 10], [41, 40], [20, 40], [10, 20], [30, 10]]
  ]};
  it('are not equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g3)).to.be.false;
  });
  var g4 = { "type": "Polygon", "coordinates": [
    [[30,10], [10,20], [20,40], [40,40], [30,10]]
  ]};
  it('reverse direction, direction is not matched, so both are equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g4)).to.be.true;
  });
  it('reverse direction, direction is matched, so both are not equal', function() {
    var eq = new Equality({direction: true});
    expect(eq.compare(g1,g4)).to.be.false;
  });
  var g5 = { "type": "Polygon", "coordinates": [
    [[10,20], [20,40], [40,40], [30,10], [10,20]]
  ]};
  it('reverse direction, diff start index, direction is not matched, so both are equal',
  function() {
    var eq = new Equality();
    expect(eq.compare(g1,g5)).to.be.true;
  });
  it('reverse direction, diff start index, direction is matched, so both are not equal',
  function() {
    var eq = new Equality({direction: true});
    expect(eq.compare(g1,g5)).to.be.false;
  });
  var gh1 = { "type": "Polygon", "coordinates": [
    [[45, 45], [15, 40], [10, 20], [35, 10],[45, 45]],
    [[20, 30], [35, 35], [30, 20], [20, 30]]
  ]};
  var gh2 = { "type": "Polygon", "coordinates": [
    [[35, 10], [45, 45], [15, 40], [10, 20], [35, 10]],
    [[20, 30], [35, 35], [30, 20], [20, 30]]
  ]};
  it('have holes too and diff start ind, direction is not matched, both are equal',
  function() {
    var eq = new Equality({direction: false});
    expect(eq.compare(gh1,gh2)).to.be.true;
  });
  it('have holes too and diff start ind, direction is matched, so both are not equal',
  function() {
    var eq = new Equality({direction: true});
    expect(eq.compare(gh1,gh2)).to.be.true;
  });
  var gprecision1 = { "type": "Polygon", "coordinates": [
    [[30, 10], [40.12345, 40.12345], [20, 40], [10, 20], [30, 10]]
  ]};
  var gprecision2 = { "type": "Polygon", "coordinates": [
    [[30, 10], [40.123389, 40.123378], [20, 40], [10, 20], [30, 10]]
  ]};
  it('after limiting precision, are equal', function() {
    var eq = new Equality({precision: 3});
    expect(eq.compare(gprecision1,gprecision2)).to.be.true;
  });
  it('with high precision, are not equal', function() {
    var eq = new Equality({precision: 10});
    expect(eq.compare(gprecision1,gprecision2)).to.be.false;
  });

});

describe ('geojson-equality for Feature', function() {
  it ('will not be equal with changed id', function() {
    var f1 = {"type": "Feature", "id": "id1"};
    var f2 = {"type": "Feature", "id": "id2"};
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
  it ('will not be equal with different count of properties', function() {
    var f1 = {"type": "Feature", "id": "id1", "properties": {"foo": "bar"}};
    var f2 = {"type": "Feature", "id": "id1", "properties": {"foo1": "bar", "foo2": "bar"}};
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
  it ('will not be equal with different keys in properties', function() {
    var f1 = {"type": "Feature", "id": "id1", "properties": {"foo1": "bar"}};
    var f2 = {"type": "Feature", "id": "id1", "properties": {"foo2": "bar"}};
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
  it ('will not be equal with different properties', function() {
    var f1 = {"type": "Feature", "id": "id1", "properties": {"foo": "bar1"}};
    var f2 = {"type": "Feature", "id": "id1", "properties": {"foo": "bar2"}};
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
  it ('will not be equal with different geometry', function() {
    var f1 = {
      "type": "Feature",
      "id": "id1",
      "properties": {"foo": "bar1"},
      "geometry": { "type": "Polygon", "coordinates": [
        [[30, 10], [41, 40], [20, 40], [10, 20], [30, 10]]
      ]}
    };
    var f2 = {
      "type": "Feature",
      "id": "id1",
      "properties": {"foo": "bar1"},
      "geometry": { "type": "Polygon", "coordinates": [
        [[40, 20], [31, 10], [30, 20], [30, 10], [10, 40]]
      ]}
    };
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
  it ('will be equal with nested properties', function() {
    var f1 = {"type": "Feature", "id": "id1", "properties": {"foo": {"bar": "baz"}},
      "geometry": {"type": "Point", "coordinates": [0, 1]}
    };
    var f2 = {"type": "Feature", "id": "id1", "properties": {"foo": {"bar": "baz"}},
      "geometry": {"type": "Point", "coordinates": [0, 1]}
    };
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.true;
  });
  it ('will not be equal with different nested properties', function() {
    var f1 = {"type": "Feature", "id": "id1", "properties": {"foo": {"bar": "baz"}},
      "geometry": {"type": "Point", "coordinates": [0, 1]}
    };
    var f2 = {"type": "Feature", "id": "id1", "properties": {"foo": {"bar": "baz2"}},
      "geometry": {"type": "Point", "coordinates": [0, 1]}
    };
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
  it ('will use a custom comparator if provided', function() {
    var f1 = {
      "type": "Feature",
      "id": "id1",
      "properties": {"foo_123": "bar"},
      "geometry": { "type": "Polygon", "coordinates": [
        [[40, 20], [31, 10], [30, 20], [30, 10], [10, 40]]
      ]}
    };
    var f2 = {
      "type": "Feature",
      "id": "id1",
      "properties": {"foo_456": "bar"},
      "geometry": { "type": "Polygon", "coordinates": [
        [[40, 20], [31, 10], [30, 20], [30, 10], [10, 40]]
      ]}
    };
    var eq = new Equality({objectComparator: function(obj1, obj2) {
      return ('foo_123' in obj1 && 'foo_456' in obj2);
    }});
    expect(eq.compare(f1, f2)).to.be.true;
  });
  it ('will not be equal if one has bbox and other not', function() {
    var f1 = {"type": "Feature", "id": "id1", "bbox": [1, 2, 3, 4]},
      f2 = {"type": "Feature", "id": "id1"},
      eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
  it ('will not be equal if bboxes are not equal', function() {
    var f1 = {"type": "Feature", "id": "id1", "bbox": [1, 2, 3, 4]},
      f2 = {"type": "Feature", "id": "id1", "bbox": [1, 2, 3, 5]},
      eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
  it ('equal features with bboxes', function() {
    var f1 = {
      "type": "Feature",
      "id": "id1",
      "properties": {"foo": "bar1"},
      "geometry": { "type": "Polygon", "coordinates": [
        [[30, 10], [41, 40], [20, 40], [10, 20], [30, 10]]
      ]},
      "bbox": [10, 10, 41, 40]
    };
    var f2 = {
      "type": "Feature",
      "id": "id1",
      "properties": {"foo": "bar1"},
      "geometry": { "type": "Polygon", "coordinates": [
        [[30, 10], [41, 40], [20, 40], [10, 20], [30, 10]]
      ]},
      "bbox": [10, 10, 41, 40]
    };
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.true;
  });
  it ('not equal features with equal bboxes', function() {
    var f1 = {
      "type": "Feature",
      "id": "id1",
      "properties": {"foo": "bar1"},
      "geometry": { "type": "Polygon", "coordinates": [
        [[30, 10], [41, 40], [20, 40], [10, 20], [30, 10]]
      ]},
      "bbox": [10, 10, 41, 40]
    };
    var f2 = {
      "type": "Feature",
      "id": "id1",
      "properties": {"foo": "bar1"},
      "geometry": { "type": "Polygon", "coordinates": [
        [[30, 10], [41, 40], [20, 40], [10, 20], [30, 1]]
      ]},
      "bbox": [10, 10, 41, 40]
    };
    var eq = new Equality();
    expect(eq.compare(f1, f2)).to.be.false;
  });
});

describe('geojson-equality for MultiPoints', function() {
  var g1 = { "type": "MultiPoint", "coordinates": [
    [0, 40], [40, 30], [20, 20], [30, 10]
  ]};
  var g2 = { "type": "MultiPoint", "coordinates": [
    [0, 40], [20, 20], [40, 30], [30, 10]
  ]};
  it('are equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g2)).to.be.true;
  });
  var g3 = { "type": "MultiPoint", "coordinates": [
    [10, 40], [20, 20], [40, 30], [30, 10]
  ]};
  it('are not equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g3)).to.be.false;
  });
});

describe('geojson-equality for MultiLineString', function() {
  var g1 = { "type": "MultiLineString", "coordinates": [
    [[30, 10], [10, 30], [40, 40]],
    [[0, 10], [10, 0], [40, 40]]
  ]};
  var g2 = { "type": "MultiLineString", "coordinates": [
    [[40, 40],[10, 30], [30, 10]],
    [[0, 10], [10, 0], [40, 40]]
  ]};
  it('reverse direction, direction is not matched, so both are equal',
    function() {
      var eq = new Equality();
      expect(eq.compare(g1,g2)).to.be.true;
    }
  );
  it('reverse direction, direction is matched, so both are not equal',
    function() {
      var eq = new Equality({direction: true});
      expect(eq.compare(g1,g2)).to.be.false;
    }
  );
  var g3 = { "type": "MultiLineString", "coordinates": [
    [[10, 10], [20, 20], [10, 40]],
    [[40, 40], [30, 30], [40, 20], [30, 10]] ] };
  it('both are not equal',
    function() {
      var eq = new Equality();
      expect(eq.compare(g1,g3)).to.be.false;
    }
  );
});
describe('geojson-equality for MultiPolygon', function() {
  var g1 = { "type": "MultiPolygon", "coordinates": [
    [[[30, 20], [45, 40], [10, 40], [30, 20]]],
    [[[15, 5], [40, 10], [10, 20], [5, 10], [15, 5]]]
  ]};
  var g2 = { "type": "MultiPolygon", "coordinates": [
    [[[30, 20], [45, 40], [10, 40], [30, 20]]],
    [[[15, 5], [40, 10], [10, 20], [5, 10], [15, 5]]]
  ]};
  it('both are equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g2)).to.be.true;
  });
  var g3 = { "type": "MultiPolygon", "coordinates": [
    [[[30, 20], [45, 40], [10, 40], [30, 20]]],
    [[[15, 5], [400, 10], [10, 20], [5, 10], [15, 5]]]
  ]};
  it('both are not equal', function() {
    var eq = new Equality();
    expect(eq.compare(g1,g3)).to.be.false;
  });
  var gh1 = { "type": "MultiPolygon", "coordinates": [
    [[[40, 40], [20, 45], [45, 30], [40, 40]]],
    [
      [[20, 35], [10, 30], [10, 10], [30, 5], [45, 20], [20, 35]],
      [[30, 20], [20, 15], [20, 25], [30, 20]],
      [[20, 10], [30, 10], [30, 15], [20, 10]]
    ]
  ]};
  var gh2 = { "type": "MultiPolygon", "coordinates": [
    [
      [[20, 35], [10, 30], [10, 10], [30, 5], [45, 20], [20, 35]],
      [[20, 10], [30, 10], [30, 15], [20, 10]],
      [[30, 20], [20, 15], [20, 25], [30, 20]]
    ],
    [[[40, 40], [20, 45], [45, 30], [40, 40]]]
  ]};
  it('having holes, both are equal', function() {
    var eq = new Equality();
    expect(eq.compare(gh1,gh2)).to.be.true;
  });
});

