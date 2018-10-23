# skmeans

Super fast simple k-means and [k-means++](https://en.wikipedia.org/wiki/K-means%2B%2B) implementation for unidimiensional and multidimensional data. Works on nodejs and browser.

## Installation
```
npm install skmeans
```

## Usage
### NodeJS
```javascript
const skmeans = require("skmeans");

var data = [1,12,13,4,25,21,22,3,14,5,11,2,23,24,15];
var res = skmeans(data,3);
```

### Browser
```html
<!doctype html>
<html>
<head>
	<script src="skmeans.js"></script>
</head>
<body>
	<script>
		var data = [1,12,13,4,25,21,22,3,14,5,11,2,23,24,15];
		var res = skmeans(data,3);

		console.log(res);
	</script>
</body>
</html>
```

## Results
```javascript
{
	it: 2,
	k: 3,
	idxs: [ 2, 0, 0, 2, 1, 1, 1, 2, 0, 2, 0, 2, 1, 1, 0 ],
	centroids: [ 13, 23, 3 ]
}
```

## API
### skmeans(data,k,[centroids],[iterations])
Calculates unidimiensional and multidimensional k-means clustering on *data*. Parameters are:
* **data** Unidimiensional or multidimensional array of values to be clustered. for unidimiensional data, takes the form of a simple array *[1,2,3.....,n]*. For multidimensional data, takes a
NxM array *[[1,2],[2,3]....[n,m]]*
* **k** Number of clusters
* **centroids** Optional. Initial centroid values. If not provided, the algorith will try to choose an apropiate ones. Alternative values can be:
  * **"kmrand"** Cluster initialization will be random, but with extra checking, so there will no be two equal initial centroids.
  * **"kmpp"** The algorythm will use the [k-means++](https://en.wikipedia.org/wiki/K-means%2B%2B) cluster initialization method.
* **iterations** Optional. Maximum number of iterations. If not provided, it will be set to 10000.

The function will return an object with the following data:
* **it** The number of iterations performed until the algorithm has converged
* **k** The cluster size
* **centroids** The value for each centroid of the cluster
* **idxs** The index to the centroid corresponding to each value of the data array
