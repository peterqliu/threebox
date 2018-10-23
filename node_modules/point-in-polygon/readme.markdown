# point-in-polygon

Determine if a point is inside of a polygon.

This module casts a ray from the inquiry point and counts intersections,
based on
[this algorithm](http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html).

# example

``` js
var inside = require('point-in-polygon');
var polygon = [ [ 1, 1 ], [ 1, 2 ], [ 2, 2 ], [ 2, 1 ] ];

console.dir([
    inside([ 1.5, 1.5 ], polygon),
    inside([ 4.9, 1.2 ], polygon),
    inside([ 1.8, 1.1 ], polygon)
]);
```

output:

```
[ true, false, true ]
```

# methods

``` js
var inside = require('point-in-polygon')
```

## inside(point, polygon)

Return whether `point` is contained in `polygon`.

`point` should be a 2-item array of coordinates.

`polygon` should be an array of 2-item arrays of coordinates.

# install

```
npm install point-in-polygon
```

# license

MIT
