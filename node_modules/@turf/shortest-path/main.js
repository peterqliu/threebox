'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var bbox = _interopDefault(require('@turf/bbox'));
var booleanPointInPolygon = _interopDefault(require('@turf/boolean-point-in-polygon'));
var distance = _interopDefault(require('@turf/distance'));
var scale = _interopDefault(require('@turf/transform-scale'));
var cleanCoords = _interopDefault(require('@turf/clean-coords'));
var bboxPolygon = _interopDefault(require('@turf/bbox-polygon'));
var invariant = require('@turf/invariant');
var helpers = require('@turf/helpers');

// javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html

function pathTo(node) {
    var curr = node,
        path = [];
    while (curr.parent) {
        path.unshift(curr);
        curr = curr.parent;
    }
    return path;
}

function getHeap() {
    return new BinaryHeap(function (node) {
        return node.f;
    });
}

/**
 * Astar
 * @private
 */
var astar = {
    /**
     * Perform an A* Search on a graph given a start and end node.
     *
     * @private
     * @memberof astar
     * @param {Graph} graph Graph
     * @param {GridNode} start Start
     * @param {GridNode} end End
     * @param {Object} [options] Options
     * @param {bool} [options.closest] Specifies whether to return the path to the closest node if the target is unreachable.
     * @param {Function} [options.heuristic] Heuristic function (see astar.heuristics).
     * @returns {Object} Search
     */
    search: function (graph, start, end, options) {
        graph.cleanDirty();
        options = options || {};
        var heuristic = options.heuristic || astar.heuristics.manhattan,
            closest = options.closest || false;

        var openHeap = getHeap(),
            closestNode = start; // set the start node to be the closest if required

        start.h = heuristic(start, end);

        openHeap.push(start);

        while (openHeap.size() > 0) {

            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();

            // End case -- result has been found, return the traced path.
            if (currentNode === end) {
                return pathTo(currentNode);
            }

            // Normal case -- move currentNode from open to closed, process each of its neighbors.
            currentNode.closed = true;

            // Find all neighbors for the current node.
            var neighbors = graph.neighbors(currentNode);

            for (var i = 0, il = neighbors.length; i < il; ++i) {
                var neighbor = neighbors[i];

                if (neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                var gScore = currentNode.g + neighbor.getCost(currentNode),
                    beenVisited = neighbor.visited;

                if (!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristic(neighbor, end);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;
                    graph.markDirty(neighbor);
                    if (closest) {
                        // If the neighbour is closer than the current closestNode or if it's equally close but has
                        // a cheaper path than the current closest node then it becomes the closest node
                        if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                            closestNode = neighbor;
                        }
                    }

                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    } else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }

        if (closest) {
            return pathTo(closestNode);
        }

        // No result was found - empty array signifies failure to find path.
        return [];
    },
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
        manhattan: function (pos0, pos1) {
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return d1 + d2;
        },
        diagonal: function (pos0, pos1) {
            var D = 1;
            var D2 = Math.sqrt(2);
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
        }
    },
    cleanNode: function (node) {
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.visited = false;
        node.closed = false;
        node.parent = null;
    }
};

/**
 * A graph memory structure
 *
 * @private
 * @param {Array} gridIn 2D array of input weights
 * @param {Object} [options] Options
 * @param {boolean} [options.diagonal] Specifies whether diagonal moves are allowed
 * @returns {void} Graph
 */
function Graph(gridIn, options) {
    options = options || {};
    this.nodes = [];
    this.diagonal = !!options.diagonal;
    this.grid = [];
    for (var x = 0; x < gridIn.length; x++) {
        this.grid[x] = [];

        for (var y = 0, row = gridIn[x]; y < row.length; y++) {
            var node = new GridNode(x, y, row[y]);
            this.grid[x][y] = node;
            this.nodes.push(node);
        }
    }
    this.init();
}

Graph.prototype.init = function () {
    this.dirtyNodes = [];
    for (var i = 0; i < this.nodes.length; i++) {
        astar.cleanNode(this.nodes[i]);
    }
};

Graph.prototype.cleanDirty = function () {
    for (var i = 0; i < this.dirtyNodes.length; i++) {
        astar.cleanNode(this.dirtyNodes[i]);
    }
    this.dirtyNodes = [];
};

Graph.prototype.markDirty = function (node) {
    this.dirtyNodes.push(node);
};

Graph.prototype.neighbors = function (node) {
    var ret = [],
        x = node.x,
        y = node.y,
        grid = this.grid;

    // West
    if (grid[x - 1] && grid[x - 1][y]) {
        ret.push(grid[x - 1][y]);
    }

    // East
    if (grid[x + 1] && grid[x + 1][y]) {
        ret.push(grid[x + 1][y]);
    }

    // South
    if (grid[x] && grid[x][y - 1]) {
        ret.push(grid[x][y - 1]);
    }

    // North
    if (grid[x] && grid[x][y + 1]) {
        ret.push(grid[x][y + 1]);
    }

    if (this.diagonal) {
        // Southwest
        if (grid[x - 1] && grid[x - 1][y - 1]) {
            ret.push(grid[x - 1][y - 1]);
        }

        // Southeast
        if (grid[x + 1] && grid[x + 1][y - 1]) {
            ret.push(grid[x + 1][y - 1]);
        }

        // Northwest
        if (grid[x - 1] && grid[x - 1][y + 1]) {
            ret.push(grid[x - 1][y + 1]);
        }

        // Northeast
        if (grid[x + 1] && grid[x + 1][y + 1]) {
            ret.push(grid[x + 1][y + 1]);
        }
    }

    return ret;
};

Graph.prototype.toString = function () {
    var graphString = [],
        nodes = this.grid, // when using grid
        rowDebug, row, y, l;
    for (var x = 0, len = nodes.length; x < len; x++) {
        rowDebug = [];
        row = nodes[x];
        for (y = 0, l = row.length; y < l; y++) {
            rowDebug.push(row[y].weight);
        }
        graphString.push(rowDebug.join(' '));
    }
    return graphString.join('\n');
};

function GridNode(x, y, weight) {
    this.x = x;
    this.y = y;
    this.weight = weight;
}

GridNode.prototype.toString = function () {
    return '[' + this.x + ' ' + this.y + ']';
};

GridNode.prototype.getCost = function (fromNeighbor) {
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x !== this.x && fromNeighbor.y !== this.y) {
        return this.weight * 1.41421;
    }
    return this.weight;
};

GridNode.prototype.isWall = function () {
    return this.weight === 0;
};

function BinaryHeap(scoreFunction) {
    this.content = [];
    this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
    push: function (element) {
        // Add the new element to the end of the array.
        this.content.push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    },
    pop: function () {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it bubble up.
        if (this.content.length > 0) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    },
    remove: function (node) {
        var i = this.content.indexOf(node);

        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();

        if (i !== this.content.length - 1) {
            this.content[i] = end;

            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            } else {
                this.bubbleUp(i);
            }
        }
    },
    size: function () {
        return this.content.length;
    },
    rescoreElement: function (node) {
        this.sinkDown(this.content.indexOf(node));
    },
    sinkDown: function (n) {
        // Fetch the element that has to be sunk.
        var element = this.content[n];

        // When at 0, an element can not sink any further.
        while (n > 0) {

            // Compute the parent element's index, and fetch it.
            var parentN = ((n + 1) >> 1) - 1,
                parent = this.content[parentN];
            // Swap the elements if the parent is greater.
            if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                this.content[parentN] = element;
                this.content[n] = parent;
                // Update 'n' to continue at the new position.
                n = parentN;
            // Found a parent that is less, no need to sink any further.
            } else {
                break;
            }
        }
    },
    bubbleUp: function (n) {
        // Look up the target element and its score.
        var length = this.content.length,
            element = this.content[n],
            elemScore = this.scoreFunction(element);

        while (true) {
            // Compute the indices of the child elements.
            var child2N = (n + 1) << 1,
                child1N = child2N - 1;
            // This is used to store the new position of the element, if any.
            var swap = null,
                child1Score;
            // If the first child exists (is inside the array)...
            if (child1N < length) {
                // Look it up and compute its score.
                var child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);

                // If the score is less than our element's, we need to swap.
                if (child1Score < elemScore) {
                    swap = child1N;
                }
            }

            // Do the same checks for the other child.
            if (child2N < length) {
                var child2 = this.content[child2N],
                    child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) {
                    swap = child2N;
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            // Otherwise, we are done.
            } else {
                break;
            }
        }
    }
};

/**
 * Returns the shortest {@link LineString|path} from {@link Point|start} to {@link Point|end} without colliding with
 * any {@link Feature} in {@link FeatureCollection<Polygon>| obstacles}
 *
 * @name shortestPath
 * @param {Coord} start point
 * @param {Coord} end point
 * @param {Object} [options={}] optional parameters
 * @param {Geometry|Feature|FeatureCollection<Polygon>} [options.obstacles] areas which path cannot travel
 * @param {number} [options.minDistance] minimum distance between shortest path and obstacles
 * @param {string} [options.units='kilometers'] unit in which resolution & minimum distance will be expressed in; it can be degrees, radians, miles, kilometers, ...
 * @param {number} [options.resolution=100] distance between matrix points on which the path will be calculated
 * @returns {Feature<LineString>} shortest path between start and end
 * @example
 * var start = [-5, -6];
 * var end = [9, -6];
 * var options = {
 *   obstacles: turf.polygon([[[0, -7], [5, -7], [5, -3], [0, -3], [0, -7]]])
 * };
 *
 * var path = turf.shortestPath(start, end, options);
 *
 * //addToMap
 * var addToMap = [start, end, options.obstacles, path];
 */
function shortestPath(start, end, options) {
    // Optional parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');
    var resolution = options.resolution;
    var minDistance = options.minDistance;
    var obstacles = options.obstacles || helpers.featureCollection([]);

    // validation
    if (!start) throw new Error('start is required');
    if (!end) throw new Error('end is required');
    if (resolution && !helpers.isNumber(resolution) || resolution <= 0) throw new Error('options.resolution must be a number, greater than 0');
    if (minDistance) throw new Error('options.minDistance is not yet implemented');

    // Normalize Inputs
    var startCoord = invariant.getCoord(start);
    var endCoord = invariant.getCoord(end);
    start = helpers.point(startCoord);
    end = helpers.point(endCoord);

    // Handle obstacles
    switch (invariant.getType(obstacles)) {
    case 'FeatureCollection':
        if (obstacles.features.length === 0) return helpers.lineString([startCoord, endCoord]);
        break;
    case 'Polygon':
        obstacles = helpers.featureCollection([helpers.feature(invariant.getGeom(obstacles))]);
        break;
    default:
        throw new Error('invalid obstacles');
    }

    // define path grid area
    var collection = obstacles;
    collection.features.push(start);
    collection.features.push(end);
    var box = bbox(scale(bboxPolygon(bbox(collection)), 1.15)); // extend 15%
    if (!resolution) {
        var width = distance([box[0], box[1]], [box[2], box[1]], options);
        resolution = width / 100;
    }
    collection.features.pop();
    collection.features.pop();

    var west = box[0];
    var south = box[1];
    var east = box[2];
    var north = box[3];

    var xFraction = resolution / (distance([west, south], [east, south], options));
    var cellWidth = xFraction * (east - west);
    var yFraction = resolution / (distance([west, south], [west, north], options));
    var cellHeight = yFraction * (north - south);

    var bboxHorizontalSide = (east - west);
    var bboxVerticalSide = (north - south);
    var columns = Math.floor(bboxHorizontalSide / cellWidth);
    var rows = Math.floor(bboxVerticalSide / cellHeight);
    // adjust origin of the grid
    var deltaX = (bboxHorizontalSide - columns * cellWidth) / 2;
    var deltaY = (bboxVerticalSide - rows * cellHeight) / 2;

    // loop through points only once to speed up process
    // define matrix grid for A-star algorithm
    var pointMatrix = [];
    var matrix = [];

    var closestToStart = [];
    var closestToEnd = [];
    var minDistStart = Infinity;
    var minDistEnd = Infinity;
    var currentY = north - deltaY;
    var r = 0;
    while (currentY >= south) {
        // var currentY = south + deltaY;
        var matrixRow = [];
        var pointMatrixRow = [];
        var currentX = west + deltaX;
        var c = 0;
        while (currentX <= east) {
            var pt = helpers.point([currentX, currentY]);
            var isInsideObstacle = isInside(pt, obstacles);
            // feed obstacles matrix
            matrixRow.push(isInsideObstacle ? 0 : 1); // with javascript-astar
            // matrixRow.push(isInsideObstacle ? 1 : 0); // with astar-andrea
            // map point's coords
            pointMatrixRow.push(currentX + '|' + currentY);
            // set closest points
            var distStart = distance(pt, start);
            // if (distStart < minDistStart) {
            if (!isInsideObstacle && distStart < minDistStart) {
                minDistStart = distStart;
                closestToStart = {x: c, y: r};
            }
            var distEnd = distance(pt, end);
            // if (distEnd < minDistEnd) {
            if (!isInsideObstacle && distEnd < minDistEnd) {
                minDistEnd = distEnd;
                closestToEnd = {x: c, y: r};
            }
            currentX += cellWidth;
            c++;
        }
        matrix.push(matrixRow);
        pointMatrix.push(pointMatrixRow);
        currentY -= cellHeight;
        r++;
    }

    // find path on matrix grid

    // javascript-astar ----------------------
    var graph = new Graph(matrix, {diagonal: true});
    var startOnMatrix = graph.grid[closestToStart.y][closestToStart.x];
    var endOnMatrix = graph.grid[closestToEnd.y][closestToEnd.x];
    var result = astar.search(graph, startOnMatrix, endOnMatrix);

    var path = [startCoord];
    result.forEach(function (coord) {
        var coords = pointMatrix[coord.x][coord.y].split('|');
        path.push([+coords[0], +coords[1]]); // make sure coords are numbers
    });
    path.push(endCoord);
    // ---------------------------------------


    // astar-andrea ------------------------
    // var result = aStar(matrix, [closestToStart.x, closestToStart.y], [closestToEnd.x, closestToEnd.y], 'DiagonalFree');
    // var path = [start.geometry.coordinates];
    // result.forEach(function (coord) {
    //     var coords = pointMatrix[coord[1]][coord[0]].split('|');
    //     path.push([+coords[0], +coords[1]]); // make sure coords are numbers
    // });
    // path.push(end.geometry.coordinates);
    // ---------------------------------------


    return cleanCoords(helpers.lineString(path));
}

/**
 * Checks if Point is inside any of the Polygons
 *
 * @private
 * @param {Feature<Point>} pt to check
 * @param {FeatureCollection<Polygon>} polygons features
 * @returns {boolean} if inside or not
 */
function isInside(pt, polygons) {
    for (var i = 0; i < polygons.features.length; i++) {
        if (booleanPointInPolygon(pt, polygons.features[i])) {
            return true;
        }
    }
    return false;
}

module.exports = shortestPath;
module.exports.default = shortestPath;
