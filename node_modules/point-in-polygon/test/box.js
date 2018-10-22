var test = require('tape');
var inside = require('../');

test('box', function (t) {
    var polygon = [ [ 1, 1 ], [ 1, 2 ], [ 2, 2 ], [ 2, 1 ] ];
    t.ok(inside([ 1.5, 1.5 ], polygon));
    t.ok(inside([ 1.2, 1.9 ], polygon));
    t.ok(!inside([ 0, 1.9 ], polygon));
    t.ok(!inside([ 1.5, 2 ], polygon));
    t.ok(!inside([ 1.5, 2.2 ], polygon));
    t.ok(!inside([ 3, 5 ], polygon));
    t.end();
});
