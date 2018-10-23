//index.js
var deepEqual = require('deep-equal');

var Equality = function(opt) {
  this.precision = opt && opt.precision ? opt.precision : 17;
  this.direction = opt && opt.direction ? opt.direction : false;
  this.pseudoNode = opt && opt.pseudoNode ? opt.pseudoNode : false;
  this.objectComparator = opt && opt.objectComparator ? opt.objectComparator : objectComparator;
};

Equality.prototype.compare = function(g1,g2) {
  if (g1.type !== g2.type || !sameLength(g1,g2)) return false;

  switch(g1.type) {
  case 'Point':
    return this.compareCoord(g1.coordinates, g2.coordinates);
    break;
  case 'LineString':
    return this.compareLine(g1.coordinates, g2.coordinates,0,false);
    break;
  case 'Polygon':
    return this.comparePolygon(g1,g2);
    break;
  case 'Feature':
    return this.compareFeature(g1, g2);
  default:
    if (g1.type.indexOf('Multi') === 0) {
      var context = this;
      var g1s = explode(g1);
      var g2s = explode(g2);
      return g1s.every(function(g1part) {
        return this.some(function(g2part) {
          return context.compare(g1part,g2part);
        });
      },g2s);
    }
  }
  return false;
};

function explode(g) {
  return g.coordinates.map(function(part) {
    return {
      type: g.type.replace('Multi', ''),
      coordinates: part}
  });
}
//compare length of coordinates/array
function sameLength(g1,g2) {
   return g1.hasOwnProperty('coordinates') ?
    g1.coordinates.length === g2.coordinates.length
    : g1.length === g2.length;
}

// compare the two coordinates [x,y]
Equality.prototype.compareCoord = function(c1,c2) {
  if (c1.length !== c2.length) {
    return false;
  }

  for (var i=0; i < c1.length; i++) {
    if (c1[i].toFixed(this.precision) !== c2[i].toFixed(this.precision)) {
      return false;
    }
  }
  return true;
};

Equality.prototype.compareLine = function(path1,path2,ind,isPoly) {
  if (!sameLength(path1,path2)) return false;
  var p1 = this.pseudoNode ? path1 : this.removePseudo(path1);
  var p2 = this.pseudoNode ? path2 : this.removePseudo(path2);
  if (isPoly && !this.compareCoord(p1[0],p2[0])) {
    // fix start index of both to same point
    p2 = this.fixStartIndex(p2,p1);
    if(!p2) return;
  }
  // for linestring ind =0 and for polygon ind =1
  var sameDirection = this.compareCoord(p1[ind],p2[ind]);
  if (this.direction || sameDirection
  ) {
    return this.comparePath(p1, p2);
  } else {
    if (this.compareCoord(p1[ind],p2[p2.length - (1+ind)])
    ) {
      return this.comparePath(p1.slice().reverse(), p2);
    }
    return false;
  }
};
Equality.prototype.fixStartIndex = function(sourcePath,targetPath) {
  //make sourcePath first point same as of targetPath
  var correctPath,ind = -1;
  for (var i=0; i< sourcePath.length; i++) {
    if(this.compareCoord(sourcePath[i],targetPath[0])) {
      ind = i;
      break;
    }
  }
  if (ind >= 0) {
    correctPath = [].concat(
      sourcePath.slice(ind,sourcePath.length),
      sourcePath.slice(1,ind+1));
  }
  return correctPath;
};
Equality.prototype.comparePath = function (p1,p2) {
  var cont = this;
  return p1.every(function(c,i) {
    return cont.compareCoord(c,this[i]);
  },p2);
};

Equality.prototype.comparePolygon = function(g1,g2) {
  if (this.compareLine(g1.coordinates[0],g2.coordinates[0],1,true)) {
    var holes1 = g1.coordinates.slice(1,g1.coordinates.length);
    var holes2 = g2.coordinates.slice(1,g2.coordinates.length);
    var cont = this;
    return holes1.every(function(h1) {
      return this.some(function(h2) {
        return cont.compareLine(h1,h2,1,true);
      });
    },holes2);
  } else {
    return false;
  }
};

Equality.prototype.compareFeature = function(g1,g2) {
  if (
    g1.id !== g2.id ||
    !this.objectComparator(g1.properties, g2.properties) ||
    !this.compareBBox(g1,g2)
  ) {
    return false;
  }
  return this.compare(g1.geometry, g2.geometry);
};

Equality.prototype.compareBBox = function(g1,g2) {
  if (
    (!g1.bbox && !g2.bbox) || 
    (
      g1.bbox && g2.bbox &&
      this.compareCoord(g1.bbox, g2.bbox)
    )
  )  {
    return true;
  }
  return false;
};
Equality.prototype.removePseudo = function(path) {
  //TODO to be implement
  return path;
};

function objectComparator(obj1, obj2) {
  return deepEqual(obj1, obj2, {strict: true});
}

module.exports = Equality;
