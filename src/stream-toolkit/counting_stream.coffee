stream = require "stream"

class CountingStream extends stream.Transform
  constructor: (options) ->
    super(options)
    @bytes = 0
    @lastUpdate = 0

  _transform: (buffer, encoding, callback) ->
    if buffer? and (buffer instanceof Buffer)
      @bytes += buffer.length
    @push buffer
    @emit "count", @bytes
    callback()

  _flush: (callback) ->
    @lastUpdate = 0
    @emit "count", @bytes
    callback()


exports.CountingStream = CountingStream
