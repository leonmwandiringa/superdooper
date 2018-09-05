/*!
 * betlogger
 * Copyright(c) 2018 Leon Tinashe Mwandiringa.
 * MIT Licensed
 */

'use strict'

/**
 * Module exports.
 * @public
 */

module.exports = betlogger
module.exports.compile = compile
module.exports.format = format
module.exports.token = token

/**
 * Module dependencies.
 * @private
 */


var debug = require('debug')('betlogger')
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

function betlogger (fileLink) {

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
    req._remoteAddress = getip(req)

    // response data
    res._startAt = undefined
    res._startTime = undefined

    // record request start
    recordStartTime.call(req);

    
    function logRequest () {

      var line = formatLine(betlogger, req, res)

      if (line == null) {
        debug('skip line')
        return
      }

      debug('log request')
      stream.write(line + '\n')
    };


      // record response start
      onHeaders(res, recordStartTime)

      // log when response finished
      onFinished(res, logRequest)

    next()
  }

}

/**
 * @uses init logger function
 */

betlogger.format('default', ':remote-addr - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :cpu s :memory mb')

/**
 * request url
 */

betlogger.token('url', function getUrlToken (req) {
  return req.originalUrl || req.url
})

/**
 * cpu time used
 */

betlogger.token('cpu', function getMemoryUsed(req){
  return (Number(process.cpuUsage().system/1e6)+Number(process.cpuUsage().user/1e6)).toFixed(2);
})

/**
 * memory used
 */

 betlogger.token('memory', function getMemoryUsed(req){
    return Number((process.memoryUsage().heapUsed/2.048e6).toFixed(2))
 })

/**
 * request method
 */

betlogger.token('method', function getMethodToken (req) {
  return req.method
})

/**
 * response time in milliseconds
 */

betlogger.token('response-time', function getResponseTimeToken (req, res, digits) {
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

betlogger.token('date', function getDateToken (req, res, format) {
    return new Date().toUTCString()
})

/**
 * response status code
 */

betlogger.token('status', function getStatusToken (req, res) {
  return headersSent(res)
    ? String(res.statusCode)
    : undefined
})

/**
 * normalized referrer
 */

betlogger.token('referrer', function getReferrerToken (req) {
  return req.headers['referer'] || req.headers['referrer']
})

/**
 * remote address
 */

betlogger.token('remote-addr', getip)

/**
 * HTTP version
 */

betlogger.token('http-version', function getHttpVersionToken (req) {
  return req.httpVersionMajor + '.' + req.httpVersionMinor
})

/**
 * User agent string
 */

betlogger.token('user-agent', function getUserAgentToken (req) {
  return req.headers['user-agent']
})


/**
 * response header
 */

betlogger.token('res', function getResponseHeader (req, res, field) {
  if (!headersSent(res)) {
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
  betlogger[name] = fn
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
    betlogger[name] = fmt
    return this
  }

    /**
   * Lookup and compile a named format function.
   *
   * @return {function}
   * @public
   */
  
  function getFormatFunction () {
    return compile(betlogger.default);
  }

  /*!
 * betlogger
 * Copyright(c) 2018 Leon Tinashe Mwandiringa.
 * MIT Licensed
 * reusable functions store
 */

/**
 * Create a basic buffering stream.
 *
 * @param {object} stream
 * @param {number} interval
 * @public
 */

function createBufferStream (stream, interval) {
  var buf = []
  var timer = null

  // flush function
  function flush () {
    timer = null
    stream.write(buf.join(''))
    buf.length = 0
  }

  // write function
  function write (str) {
    if (timer === null) {
      timer = setTimeout(flush, interval)
    }

    buf.push(str)
  }

  // return a minimal "stream"
  return { write: write }
}


/**
 * Get request IP address.
 *
 * @private
 * @param {IncomingMessage} req
 * @return {string}
 */

function getip (req) {
  return req.ip ||
    req._remoteAddress ||
    (req.connection && req.connection.remoteAddress) ||
    undefined
}

/**
 * Determine if the response headers have been sent.
 *
 * @param {object} res
 * @returns {boolean}
 * @private
 */

function headersSent (res) {
  return typeof res.headersSent !== 'boolean'
    ? Boolean(res._header)
    : res.headersSent
}


/**
 * Record the start time.
 * @private
 */

function recordStartTime () {
  this._startAt = process.hrtime()
  this._startTime = new Date()
}
