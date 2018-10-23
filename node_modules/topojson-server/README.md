# TopoJSON Server

The **topojson-server** module provides tools for converting GeoJSON to [TopoJSON](https://github.com/topojson). See [How to Infer Topology](https://bost.ocks.org/mike/topology/) for details on how the topology is constructed.

See [shapefile](https://github.com/mbostock/shapefile) for converting ESRI shapefiles to GeoJSON, [ndjson-cli](https://github.com/mbostock/ndjson-cli) for manipulating newline-delimited JSON streams, [d3-geo-projection](https://github.com/d3/d3-geo-projection) for manipulating GeoJSON, and [topojson-client](https://github.com/topojson/topojson-client) for manipulating TopoJSON and converting it back to GeoJSON. See also [us-atlas](https://github.com/topojson/us-atlas) and [world-atlas](https://github.com/topojson/world-atlas) for pre-built TopoJSON.

## Installing

If you use NPM, `npm install topojson-server`. Otherwise, download the [latest release](https://github.com/topojson/topojson-server/releases/latest). You can also load directly from [unpkg](https://unpkg.com). AMD, CommonJS, and vanilla environments are supported. In vanilla, a `topojson` global is exported:

```html
<script src="https://unpkg.com/topojson-server@3"></script>
<script>

var topology = topojson.topology({foo: geojson});

</script>
```

[Try topojson-server in your browser.](https://tonicdev.com/npm/topojson-server)

## API Reference

<a name="topology" href="#topology">#</a> topojson.<b>topology</b>(<i>objects</i>[, <i>quantization</i>]) [<>](https://github.com/topojson/topojson-server/blob/master/src/topology.js "Source")

Returns a TopoJSON topology for the specified [GeoJSON *objects*](http://geojson.org/geojson-spec.html#geojson-objects). The returned topology makes a shallow copy of the input *objects*: the identifier, bounding box, properties and coordinates of input objects may be shared with the output topology.

If a *quantization* parameter is specified, the input geometry is quantized prior to computing the topology, the returned topology is quantized, and its arcs are [delta-encoded](https://github.com/topojson/topojson-specification/blob/master/README.md#213-arcs). Quantization is recommended to improve the quality of the topology if the input geometry is messy (*i.e.*, small floating point error means that adjacent boundaries do not have identical values); typical values are powers of ten, such as 1e4, 1e5 or 1e6. See also [topojson.quantize](https://github.com/topojson/topojson-client/blob/master/README.md#quantize) to quantize a topology after it has been constructed, without altering the topological relationships.

## Command-Line Reference

### geo2topo

<a name="geo2topo" href="#geo2topo">#</a> <b>geo2topo</b> [<i>options…</i>] [<i>name</i>=]<i>file</i>… [<>](https://github.com/topojson/topojson/blob/master/bin/geo2topo "Source")

Converts one or more GeoJSON objects to an output topology. For example, to convert the us-states.json GeoJSON FeatureCollection to a TopologyJSON topology with the “states” object in us.json:

```
geo2topo states=us-states.json > us.json
```

For convenience, you can omit the object name and specify only the output *file* name; the object name will be the basename of the file, with the directory and extension removed. For example, to convert the states.json GeoJSON FeatureCollection to a TopologyJSON topology with the “states” object in us.json:

```
geo2topo states.json > us.json
```

Any properties and identifiers of input [feature objects](https://tools.ietf.org/html/rfc7946#section-3.2) are propagated to the output. If you want to transform or filter properties, try [ndjson-cli](https://github.com/mbostock/ndjson-cli) as demonstrated in [Command-Line Cartography](https://medium.com/@mbostock/command-line-cartography-part-1-897aa8f8ca2c).

See also [topo2geo](https://github.com/topojson/topojson-client/blob/master/README.md#topo2geo).

<a name="geo2topo_help" href="#geo2topo_help">#</a> geo2topo <b>-h</b>
<br><a href="#geo2topo_help">#</a> geo2topo <b>--help</b>

Output usage information.

<a name="geo2topo_version" href="#geo2topo_version">#</a> geo2topo <b>-V</b>
<br><a href="#geo2topo_version">#</a> geo2topo <b>--version</b>

Output the version number.

<a name="geo2topo_newline_delimited" href="#geo2topo_newline_delimited">#</a> geo2topo <b>-n</b>
<br><a href="#geo2topo_newline_delimited">#</a> geo2topo <b>--newline-delimited</b>

Output [newline-delimited JSON](http://ndjson.org/), with one feature per line.

<a name="geo2topo_in" href="#geo2topo_in">#</a> geo2topo <b>-i</b> <i>file</i>
<br><a href="#geo2topo_in">#</a> geo2topo <b>--in</b> <i>file</i>

Specify the input TopoJSON file name. Defaults to “-” for stdin.

<a name="geo2topo_list" href="#geo2topo_list">#</a> geo2topo <b>-l</b>
<br><a href="#geo2topo_list">#</a> geo2topo <b>--list</b>

List the names of the objects in the input topology, and then exit. For example, this:

```
geo2topo -l < us.json
```

Will output this:

```
counties
states
nation
```
