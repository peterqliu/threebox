Get closest
=============

Compare your item to items in an array and get the closest one. It comes by default with number comparison tools but it can also be used with strings, or anything else that you want to compare.

Installation
============

```bash
npm install get-closest
```

How to use
==========

Require get-closest:

```bash
var getClosest = require("get-closest");
```

Let's say that you have an array of items such as:

```js
var items = [0, 10, 15, 20, 50];
```

And that you want to get the item that's the closest to the number 18, which would be 20 in our case:

```js
getClosest.number(18, items); // 3, as items[3] === 20;
```

If you want to find the closest to 17.5, as it's exactly between 15 and 20, `number` will return the last number in the array that matches, which is 20 in our case.

```js
getClosest.number(17.5, items); // 3, as items[3] === 20
getClosest.number(35, items); // 4, as items[4] === 50
```

If you're interested in getting the closest item that is greater, you can use `greaterNumber`:

```js
tools.greaterNumber(1, items); // 1, as items[1] === 10
```

If there's an exact match, it's returned. The last exact match will be returned too, to be consistent .number.

```js
getClosest.greaterNumber(0, items); // 0, as items[0] === 0 is an exact match.
```

Finally, you can get the closest item that is lower, using `lowerNumber`:

```js
getClosest.lowerNumber(9, items); // 0, as items[0] === 0;

getClosest.lowerNumber(10, items); // 1, as items[1] === 10;
```

But you can also compare custom types by giving a custom comparison function, like string comparison with the levensthein distance:

```js
/**
 * Returns the distance between the two strings using the Levenshtein method
 * @param {String} compareTo the string to test, it comes from the array
 * @param {String} baseItem the item that you want to test against the array
 * @returns {Number} it needs to return a distance as a number, whatever the type
 * of the current items is.
 */  
function compareLevenshteinDistance(compareTo, baseItem) {
  return new Levenshtein(compareTo, baseItem).distance;
}

var days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

getClosest.custom("mercure", days, compareLevenshteinDistance); // 2 (mercredi)
```

CHANGELOG
=====

0.0.4 - MARCH 12 2017
---

* Remove dependency on assert

LICENSE
=======

MIT
