# JSTS used in TurfJS

[![Build Status](https://travis-ci.org/DenisCarriere/turf-jsts.svg?branch=master)](https://travis-ci.org/DenisCarriere/turf-jsts)

This version of JSTS is refactored to ES6 for the sole purpose of importing it to [TurfJS](https://github.com/Turfjs/turf).

More information about the original library: https://github.com/bjornharrtell/jsts

> This library is not intended to be used outside of TurfJS

## Current issue with `JSTS`

JSTS has big problems when making it ES Module & CJS compatible.

The other major issue I found was the [`extend()`](https://github.com/bjornharrtell/jsts/blob/master/src/org/locationtech/jts/operation/buffer/BufferOp.js#L6) method that JSTS uses copies the entire section of that source code. For example if we have 4 Turf modules that use JSTS, that means we will have 4x GeoJSONReader source code in the final Rollup bundle.

## Solution

Refactoring JSTS to proper ES6 Classes which will allow Rollup and other bundling libraries to properly conduct Tree Shaking.
