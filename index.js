/*!
 * betlogr
 * Copyright(c) 2018 Leon Tinashe Mwandiringa.
 * MIT Licensed
 */

'use strict'

/**
 * Module exports.
 * @public
 */

module.exports = betlogr
module.exports.compile = compile
module.exports.format = format
module.exports.token = token

/**
 * Module dependencies.
 * @private
 */

var HELPER = require('./helpers')
var debug = require('debug')('betlogr')
var onFinished = require('on-finished')
var onHeaders = require('on-headers')
var fs = require('fs')
var path = require('path')


/**
 * Default log buffer duration.
 * @private
 */

var DEFAULT_BUFFER_DURATION = 1000

/**
 * Create a logger middleware.
 *
 * @public
 * @return {Function} middleware
 */

function betlogr (fileLink) {

  var fileToWriteTo = fileLink && typeof fileLink == 'string' ? fileLink : null;

  var opts = {}
  var fmt = 'default'

  // format function
  var formatLine = typeof fmt !== 'function'
    ? getFormatFunction()
    : fmt

  // stream
  var buffer = opts.buffer
  var stream = fileToWriteTo ? fs.createWriteStream(path.join(__dirname, "../"+fileToWriteTo), {flags: 'a'}) : process.stdout

  // buffering support
  if (buffer) {

    // flush interval
    var interval = typeof buffer !== 'number'
      ? DEFAULT_BUFFER_DURATION
      : buffer

    // swap the stream
    stream = createBufferStream(stream, interval)
  }

  return function logger (req, res, next) {
    // request data
    req._startAt = undefined
    req._startTime = undefined
    req._remoteAddress = HELPER.getip(req)

    // response data
    res._startAt = undefined
    res._startTime = undefined

    // record request start
    HELPER.recordStartTime.call(req);

    
    function logRequest () {

      var line = formatLine(betlogr, req, res)

      if (line == null) {
        debug('skip line')
        return
      }

      debug('log request')
      stream.write(line + '\n')
    };


      // record response start
      onHeaders(res, HELPER.recordStartTime)

      // log when response finished
      onFinished(res, logRequest)

    next()
  }

}

/**
 * @uses init logger function
 */

betlogr.format('default', ':remote-addr - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :cpu s :memory mb')

/**
 * request url
 */

betlogr.token('url', function getUrlToken (req) {
  return req.originalUrl || req.url
})

/**
 * cpu time used
 */

betlogr.token('cpu', function getMemoryUsed(req){
  return (Number(process.cpuUsage().system/1e6)+Number(process.cpuUsage().user/1e6)).toFixed(2);
})

/**
 * memory used
 */

 betlogr.token('memory', function getMemoryUsed(req){
    return Number((process.memoryUsage().heapUsed/2.048e6).toFixed(2))
 })

/**
 * request method
 */

betlogr.token('method', function getMethodToken (req) {
  return req.method
})

/**
 * response time in milliseconds
 */

betlogr.token('response-time', function getResponseTimeToken (req, res, digits) {
  if (!req._startAt || !res._startAt) {
    // missing request and/or response start time
    return
  }

  // calculate diff
  var ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6

  // return truncated value
  return ms.toFixed(digits === undefined ? 3 : digits)
})

/**
 * current date
 */

betlogr.token('date', function getDateToken (req, res, format) {
    return new Date().toUTCString()
})

/**
 * response status code
 */

betlogr.token('status', function getStatusToken (req, res) {
  return HELPER.headersSent(res)
    ? String(res.statusCode)
    : undefined
})

/**
 * normalized referrer
 */

betlogr.token('referrer', function getReferrerToken (req) {
  return req.headers['referer'] || req.headers['referrer']
})

/**
 * remote address
 */

betlogr.token('remote-addr', HELPER.getip)

/**
 * HTTP version
 */

betlogr.token('http-version', function getHttpVersionToken (req) {
  return req.httpVersionMajor + '.' + req.httpVersionMinor
})

/**
 * User agent string
 */

betlogr.token('user-agent', function getUserAgentToken (req) {
  return req.headers['user-agent']
})


/**
 * response header
 */

betlogr.token('res', function getResponseHeader (req, res, field) {
  if (!HELPER.headersSent(res)) {
    return undefined
  }

  // get header
  var header = res.getHeader(field)

  return Array.isArray(header)
    ? header.join(', ')
    : header
})

/**
 * Compile a format string into a function.
 *
 * @param {string} format
 * @return {function}
 * @public
 */

function compile (format) {
  
  var fmt = format.replace(/"/g, '\\"');

  var js = '  "use strict"\n  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function (_, name, arg) {
    var tokenArguments = 'req, res'
    var tokenFunction = 'tokens[' + String(JSON.stringify(name)) + ']'

    if (arg !== undefined) {
      tokenArguments += ', ' + String(JSON.stringify(arg))
    }

    return '" +\n    (' + tokenFunction + '(' + tokenArguments + ') || "-") + "'
  }) + '"'

  return new Function('tokens, req, res', js)
}

/**
 * Define a token function with the given name,
 * and callback fn(req, res).
 *
 * @param {string} name
 * @param {function} fn
 * @public
 */

function token (name, fn) {
  betlogr[name] = fn
  return this
}

  /**
   * Define a format with the given name.
   *
   * @param {string} name
   * @param {string|function} fmt
   * @public
   */
  
  function format (name, fmt) {
    betlogr[name] = fmt
    return this
  }

    /**
   * Lookup and compile a named format function.
   *
   * @return {function}
   * @public
   */
  
  function getFormatFunction () {
    return compile(betlogr.default);
  }