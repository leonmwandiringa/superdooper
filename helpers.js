/*!
 * betlog
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
  
  module.exports = {
    recordStartTime,
    headersSent,
    getip,
    createBufferStream
  }