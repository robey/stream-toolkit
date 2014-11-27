stream = require "stream"
util = require "util"

promise_wrappers = require "./promise_wrappers"

# transform for buffer streams that counts how many bytes came through.
class CountingStream extends stream.Transform
  constructor: (options) ->
    super(options)
    @bytes = 0
    @lastUpdate = 0

  _transform: (buffer, encoding, callback) ->
    if buffer? and (buffer instanceof Buffer)
      @bytes += buffer.length
    @emit "count", @bytes
    @push buffer
    callback()

  _flush: (callback) ->
    callback()

  close: ->
    @push null


countingStream = (options) ->
  promise_wrappers.promisify(new CountingStream(options))


exports.countingStream = countingStream
