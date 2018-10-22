/**
 * Polyfill for IE support
 */
Math.trunc = Math.trunc || function (x) {
  return x < 0 ? Math.ceil(x) : Math.floor(x)
}
