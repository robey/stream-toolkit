stream = require "stream"

# simple writable stream that collects all incoming data and provides it in a single (combined) buffer.
class SinkStream extends stream.Writable
  constructor: ->
    super()
    @buffers = []

  _write: (chunk, encoding, callback) ->
    @buffers.push chunk
    callback()

  # combine all received data into a buffer and return it. may be called multiple times.
  getBuffer: ->
    Buffer.concat(@buffers)

  # clear all received data so far.
  reset: ->
    @buffers = []


# feed a readable stream from a single buffer.
class SourceStream extends stream.Readable
  constructor: (@buffer) ->
    super()

  _read: (size) ->
    @push @buffer
    @push null


exports.SinkStream = SinkStream
exports.SourceStream = SourceStream
