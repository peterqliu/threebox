var acorn = require('acorn')
var xtend = require('xtend')

var CJSParser = acorn.Parser
  .extend(require('./lib/bigint'))
var ESModulesParser = CJSParser
  .extend(require('./lib/dynamic-import'))
  .extend(require('./lib/import-meta'))

function mapOptions (opts) {
  if (!opts) opts = {}
  return xtend({
    ecmaVersion: 2019,
    allowHashBang: true,
    allowReturnOutsideFunction: true
  }, opts)
}

function getParser (opts) {
  if (!opts) opts = {}
  return opts.sourceType === 'module' ? ESModulesParser : CJSParser
}

module.exports = exports = xtend(acorn, {
  parse: function parse (src, opts) {
    return getParser(opts).parse(src, mapOptions(opts))
  },
  parseExpressionAt: function parseExpressionAt (src, offset, opts) {
    return getParser(opts).parseExpressionAt(src, offset, mapOptions(opts))
  },
  tokenizer: function tokenizer (src, opts) {
    return getParser(opts).tokenizer(src, mapOptions(opts))
  }
})
