# geojson-equality

Check two valid geojson geometries for equality.

## installation

```
npm install geojson-equality
```

## usage
```javascript
var GeojsonEquality = require('geojson-equality');
var eq = new GeojsonEquality();
 
var g1 = { "type": "Polygon", "coordinates": [
  [[30, 10], [40, 40], [20, 40], [10, 20], [30, 10]]
]};
var g2 = { "type": "Polygon", "coordinates": [
  [[30, 10], [40, 40], [20, 40], [10, 20], [30, 10]]
]};

eq.compare(g1,g2);    // returns true
var g3 = { "type": "Polygon", "coordinates": [
  [[30o, 100], [400, 400], [200, 400], [100, 200], [300, 100]]
]};

eq.compare(g1,g3);    // returns false
```
For including in browser, download file [geojson-equality.min.js](//raw.githubusercontent.com/geosquare/geojson-equality/master/dist/geojson-equality.min.js)
```html
<script type="text/javascipt" src="path/to/geojson-equality.min.js"></script>
```
This create a global variable 'GeojsonEquality'
GeojsonEquality class can be initiated with many options that are used to match the geojson.
* **precision** number as floating points precision required. Defualt is **17**
```javascript
var g1 = { "type": "Point", "coordinates": [30.2, 10] };
var g2 = { "type": "Point", "coordinates": [30.22233, 10] };
var eq = new GeojsonEqaulity({precision: 3});
eq.compare(g1,g2);  // returns false
var eq = new GeojsonEqaulity({precision: 1});
eq.compare(g1,g2);  // returns true
```
* **direction** true | false, direction of LineString or Polygon (orientation) is ignored if false. Default is **false**.
```javascript
  var g1 = { "type": "LineString", "coordinates": 
    [ [30, 10], [10, 30], [40, 40] ] };
  var g2 = { "type": "LineString", "coordinates": 
    [ [40, 40], [10, 30], [30, 10] ] };
  var eq = new GeojsonEqaulity({direction: false});
  eq.compare(g1,g2);  // returns true
  var eq = new GeojsonEqaulity({direction: true});
  eq.compare(g1,g2);  // returns false
```

* **objectComparator** function, custom function for use in comparing Feature properties. Default is a shallow comparison.
```javascript
  // using lodash isEqual to deep comparison
  var isEqual = require('lodash/lang/isEqual')
  var eq = new GeojsonEqaulity({objectComparator: isEqual});
```

## developing
Once you run

```npm install```

then for running test

```npm run test```

to create build

```npm run build```

## license
This project is licensed under the terms of the MIT license.
