/**
 * Polyfill for IE support
 */
import './Array'
import './Number'
import './Math'

/**
 * Turf JSTS dependant modules
 *
 * GeoJSONReader => all modules
 * GeoJSONWriter => all modules
 * OverlayOp => @turf/intersect & @turf/difference
 * UnionOp => @turf/union
 * BufferOp => @turf/buffer
 */
export { GeoJSONReader, GeoJSONWriter } from './org/locationtech/jts/io'
export { OverlayOp, UnionOp, BufferOp } from './org/locationtech/jts/operation'
